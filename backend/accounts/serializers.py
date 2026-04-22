import datetime as dt
import re
from decimal import Decimal

from django.db import transaction

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers

from .booking_validation import tutor_has_slot_conflict
from .meet_url_validation import normalize_and_validate_meet_url
from .creneaux_validation import creneau_to_interval, validate_creneaux_payload
from .models import (
    EvaluationSeance,
    FormatSeance,
    ModulePropose,
    Niveau,
    Notification,
    PlatformRole,
    Reservation,
    StatutModule,
    StatutReservation,
    User,
    recalc_tutor_review_stats,
)
from .utils import platform_admin_q


class InscriptionSerializer(serializers.Serializer):
    """
    Données envoyées par la page React « Inscription ».
    nom + prénom → un seul champ name en base.
    Compte : role plateforme « user », permissions is_student et is_tutor à True par défaut.
    """

    nom = serializers.CharField(max_length=120)
    prenom = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    filiere = serializers.CharField(max_length=120)
    niveau = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm = serializers.CharField(write_only=True, min_length=8)
    bio = serializers.CharField(allow_blank=True, required=False, max_length=200)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cet e-mail.")
        domain = value.rsplit("@", 1)[-1] if "@" in value else ""
        domain = domain.lower()
        domains = getattr(settings, "UNIVERSITY_EMAIL_DOMAINS", [])
        if domains:
            if domain not in domains:
                raise serializers.ValidationError(
                    f"E-mail non autorisé. Domaines acceptés : {', '.join(domains)}"
                )
        else:
            # Par défaut : e-mail universitaire algérien (.dz), ex. @univ.dz, @usthb.dz, @univ-blida.dz
            if not domain.endswith(".dz"):
                raise serializers.ValidationError(
                    "Utilisez une adresse e-mail universitaire se terminant par .dz "
                    "(ex. prenom.nom@univ.dz ou prenom.nom@univ-ville.dz)."
                )
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value):
            raise serializers.ValidationError("Format d'e-mail invalide.")
        return value

    def validate_filiere(self, value):
        v = (value or "").strip()
        if v != "Informatique":
            raise serializers.ValidationError("L'inscription n'est ouverte que pour la filière Informatique.")
        return v

    def validate_niveau(self, value):
        allowed = {c.value for c in Niveau}
        if value not in allowed:
            raise serializers.ValidationError(f"Niveau invalide. Valeurs : {', '.join(sorted(allowed))}")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm"]:
            raise serializers.ValidationError({"confirm": "Les mots de passe ne correspondent pas."})
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm", None)
        nom = validated_data.pop("nom").strip()
        prenom = validated_data.pop("prenom").strip()
        password = validated_data.pop("password")
        bio = validated_data.pop("bio", "") or ""
        name = f"{prenom} {nom}".strip()
        user = User(
            name=name,
            email=validated_data["email"],
            filiere=validated_data["filiere"],
            niveau=validated_data["niveau"],
            description=bio,
            role=PlatformRole.USER,
            is_student=True,
            is_tutor=True,
        )
        user.set_password(password)
        user.save()
        return user


class UserLectureSerializer(serializers.ModelSerializer):
    """Lecture profil : avatar = URL absolue si fichier présent ; evaluations_recues = nombre d’avis séances (relation)."""

    avatar = serializers.SerializerMethodField()
    evaluations_recues = serializers.SerializerMethodField()
    evaluations_donnees = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "name",
            "avatar",
            "filiere",
            "niveau",
            "description",
            "balance_hours",
            "score",
            "tutor_review_count",
            "evaluations_recues",
            "evaluations_donnees",
            "role",
            "is_student",
            "is_tutor",
            "is_staff",
            "date_joined",
        )
        read_only_fields = fields

    def get_avatar(self, obj):
        f = getattr(obj, "avatar", None)
        if not f or not getattr(f, "name", None):
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(f.url)
        return f.url

    def get_evaluations_recues(self, obj):
        return obj.evaluations_recues.count()

    def get_evaluations_donnees(self, obj):
        return obj.evaluations_donnees.count()


class ProfilMiseAJourSerializer(serializers.ModelSerializer):
    """Champs modifiables (CDCF : l’e-mail universitaire ne change pas). Rôle plateforme et permissions métier : non modifiables via ce PATCH."""

    class Meta:
        model = User
        fields = ("name", "filiere", "niveau", "description", "avatar")

    def validate_name(self, value):
        if value is not None and not str(value).strip():
            raise serializers.ValidationError("Le nom ne peut pas être vide.")
        return str(value).strip() if value is not None else value

    def validate_niveau(self, value):
        allowed = {c.value for c in Niveau}
        if value not in allowed:
            raise serializers.ValidationError(f"Niveau invalide. Valeurs : {', '.join(sorted(allowed))}")
        return value

    def validate_description(self, value):
        if value and len(value) > 2000:
            raise serializers.ValidationError("La description est trop longue.")
        return value

    def validate_avatar(self, value):
        if value and getattr(value, "size", 0) > 2 * 1024 * 1024:
            raise serializers.ValidationError("Image trop volumineuse (maximum 2 Mo).")
        return value

    def update(self, instance, validated_data):
        validated_data.pop("role", None)  # jamais modifiable via PATCH public
        new_avatar = validated_data.get("avatar")
        if new_avatar and instance.avatar:
            try:
                instance.avatar.delete(save=False)
            except OSError:
                pass
        return super().update(instance, validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id", "type", "text", "is_read", "created_at")
        read_only_fields = fields


def module_propose_to_frontend(instance: ModulePropose, request=None) -> dict:
    """Structure attendue par FindModule.jsx et TutorDetail.jsx."""
    t = instance.tuteur
    tags = instance.tags if isinstance(instance.tags, list) else []
    recent_comments = list(
        EvaluationSeance.objects.filter(tuteur=t)
        .exclude(commentaire__isnull=True)
        .exclude(commentaire__exact="")
        .order_by("-created_at")
        .values("commentaire", "note", "created_at")[:2]
    )
    avatar_url = None
    if request and getattr(t, "avatar", None) and getattr(t.avatar, "name", None):
        try:
            avatar_url = request.build_absolute_uri(t.avatar.url)
        except ValueError:
            avatar_url = None
    return {
        "id": instance.id,
        "title": instance.titre,
        "level": instance.niveau,
        "tutor": t.name,
        "tutorId": t.id,
        "category": instance.filiere_cible,
        "score": float(t.score),
        "reviews": instance.nombre_avis,
        "format": instance.format_seance,
        "schedule": instance.planning,
        "status": instance.statut,
        "creneaux": instance.creneaux if isinstance(instance.creneaux, list) else [],
        "description": (instance.description or "").strip(),
        "dureeLabel": (instance.duree_label or "").strip(),
        "tags": tags,
        "recentComments": [
            {
                "comment": str(row.get("commentaire") or "").strip()[:240],
                "note": int(row.get("note") or 0),
                "created_at": row.get("created_at"),
            }
            for row in recent_comments
            if str(row.get("commentaire") or "").strip()
        ],
        "tutorReviewCount": int(getattr(t, "tutor_review_count", 0) or 0),
        "tutorProfile": {
            "id": t.id,
            "name": t.name,
            "filiere": t.filiere,
            "score": float(t.score),
            "description": (t.description or "").strip(),
            "reviewCount": int(getattr(t, "tutor_review_count", 0) or 0),
            "avatarUrl": avatar_url,
        },
    }


class CreneauItemSerializer(serializers.Serializer):
    """Créneau : libellé seul (legacy) ou champs structurés date_iso + heure_debut + heure_fin."""

    id = serializers.CharField(required=False, allow_blank=True, max_length=80)
    libelle = serializers.CharField(required=False, allow_blank=True, max_length=160)
    date = serializers.CharField(required=False, allow_blank=True, max_length=32)
    date_iso = serializers.CharField(required=False, allow_blank=True, max_length=10)
    heure_debut = serializers.CharField(required=False, allow_blank=True, max_length=5)
    heure_fin = serializers.CharField(required=False, allow_blank=True, max_length=5)
    disponible = serializers.BooleanField(required=False, default=True)


def _parse_creneau_date(value):
    s = (value or "").strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return dt.datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _validate_simple_creneaux(items):
    if not items:
        raise serializers.ValidationError({"creneaux": "Ajoutez au moins un créneau."})

    today = timezone.localdate()
    for item in items:
        if not isinstance(item, dict):
            raise serializers.ValidationError({"creneaux": "Ajoutez au moins un créneau."})

        has_content = any(str(item.get(k, "")).strip() for k in ("libelle", "date", "date_iso", "heure_debut", "heure_fin"))
        if not has_content:
            raise serializers.ValidationError({"creneaux": "Ajoutez au moins un créneau."})

        raw_date = item.get("date_iso") if str(item.get("date_iso", "")).strip() else item.get("date")
        if raw_date:
            parsed = _parse_creneau_date(raw_date)
            if parsed and parsed < today:
                raise serializers.ValidationError({"creneaux": "Les créneaux ne doivent pas être dans le passé"})


class ModuleProposeCreateSerializer(serializers.Serializer):
    """POST création par le tuteur connecté."""

    titre = serializers.CharField(max_length=200)
    niveau = serializers.CharField(max_length=20)
    format_seance = serializers.ChoiceField(choices=["Online", "Présentiel"])
    planning = serializers.CharField(max_length=255, required=False, allow_blank=True)
    description = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    duree_label = serializers.CharField(max_length=20, required=False, allow_blank=True)
    tags = serializers.ListField(child=serializers.CharField(max_length=80), required=False, default=list)
    creneaux = CreneauItemSerializer(many=True)

    def validate_niveau(self, value):
        allowed = {c.value for c in Niveau}
        if value not in allowed:
            raise serializers.ValidationError(f"Niveau invalide : {', '.join(sorted(allowed))}")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            raise serializers.ValidationError("Authentification requise.")
        raw = attrs.get("creneaux") or []
        items = [dict(x) for x in raw]
        _validate_simple_creneaux(items)
        stored, errs = validate_creneaux_payload(items, tutor_id=user.id)
        if errs:
            msg = errs[0] if len(errs) == 1 else errs
            raise serializers.ValidationError({"creneaux": msg})
        attrs["creneaux"] = stored
        return attrs


class ModuleProposeUpdateSerializer(serializers.Serializer):
    """PATCH mise à jour partielle d'un module du tuteur propriétaire."""

    titre = serializers.CharField(max_length=200, required=False)
    niveau = serializers.CharField(max_length=20, required=False)
    format_seance = serializers.ChoiceField(choices=["Online", "Présentiel"], required=False)
    planning = serializers.CharField(max_length=255, required=False, allow_blank=True)
    description = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    duree_label = serializers.CharField(max_length=20, required=False, allow_blank=True)
    tags = serializers.ListField(child=serializers.CharField(max_length=80), required=False)
    creneaux = CreneauItemSerializer(many=True, required=False)
    statut = serializers.ChoiceField(choices=StatutModule.choices, required=False)

    def validate_niveau(self, value):
        allowed = {c.value for c in Niveau}
        if value not in allowed:
            raise serializers.ValidationError(f"Niveau invalide : {', '.join(sorted(allowed))}")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            raise serializers.ValidationError("Authentification requise.")
        if "creneaux" in attrs:
            raw = attrs.get("creneaux") or []
            items = [dict(x) for x in raw]
            _validate_simple_creneaux(items)
            stored, errs = validate_creneaux_payload(items, tutor_id=user.id)
            if errs:
                msg = errs[0] if len(errs) == 1 else errs
                raise serializers.ValidationError({"creneaux": msg})
            attrs["creneaux"] = stored
        return attrs

class ReservationDemandeCreateSerializer(serializers.Serializer):
    """POST demande de tutorat (étudiant) → réservation « pending » côté Django."""

    tutor = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.exclude(platform_admin_q()),
    )
    module_propose = serializers.PrimaryKeyRelatedField(
        queryset=ModulePropose.objects.filter(actif=True, statut=StatutModule.PUBLISHED),
        required=True,
    )
    module_titre = serializers.CharField(max_length=220)
    date_label = serializers.CharField(max_length=64, allow_blank=True, default="")
    creneau_label = serializers.CharField(max_length=160, allow_blank=True, default="")
    """Référence du créneau dans module.creneaux (id) — requis pour la détection de conflits."""
    creneau_ref = serializers.CharField(max_length=120)
    duree_heures = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("2"),
        min_value=Decimal("0.25"),
        max_value=Decimal("24"),
    )
    message = serializers.CharField(max_length=2000, allow_blank=True, default="")
    """format_seance est imposé par le module (ModulePropose.format_seance), pas par le client."""

    def validate(self, attrs):
        user = self.context["request"].user
        tutor = attrs["tutor"]
        if tutor.id == user.id:
            raise serializers.ValidationError("Vous ne pouvez pas réserver une séance avec vous-même.")
        if not getattr(user, "is_student", False):
            raise serializers.ValidationError("Seuls les étudiants peuvent réserver.")
        mp = attrs["module_propose"]
        if mp.tuteur_id != tutor.id:
            raise serializers.ValidationError(
                {"module_propose": "Ce module n’est pas proposé par le tuteur sélectionné."}
            )

        cref = (attrs.get("creneau_ref") or "").strip()
        if not cref:
            raise serializers.ValidationError({"creneau_ref": "Identifiant de créneau requis."})

        creneaux = mp.creneaux if isinstance(mp.creneaux, list) else []
        creneau = next(
            (c for c in creneaux if isinstance(c, dict) and str(c.get("id") or "").strip() == cref),
            None,
        )
        if creneau is None:
            raise serializers.ValidationError({"creneau_ref": "Créneau introuvable pour ce module."})
        if creneau.get("disponible") is False:
            raise serializers.ValidationError({"creneau_ref": "Ce créneau n’est plus disponible."})

        inv = creneau_to_interval(creneau)
        if inv is None:
            raise serializers.ValidationError(
                {"creneau_ref": "Le créneau doit inclure une date et des heures de début et de fin."}
            )
        attrs["_slot_start"], attrs["_slot_end"] = inv

        duree = attrs.get("duree_heures") or Decimal("2")
        if user.balance_hours < duree:
            raise serializers.ValidationError("Solde d’heures insuffisant pour cette durée.")
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        slot_start = validated_data.pop("_slot_start")
        slot_end = validated_data.pop("_slot_end")
        tutor = validated_data.pop("tutor")
        mp = validated_data.pop("module_propose")
        creneau_ref = (validated_data.pop("creneau_ref") or "").strip()[:120]

        with transaction.atomic():
            u_low, u_high = sorted([request.user.pk, tutor.pk])
            User.objects.select_for_update().get(pk=u_low)
            User.objects.select_for_update().get(pk=u_high)

            if tutor_has_slot_conflict(tutor.id, slot_start, slot_end):
                raise serializers.ValidationError(
                    "Ce créneau chevauche une autre réservation confirmée ou en attente pour ce tuteur.",
                )

            et_locked = User.objects.select_for_update().get(pk=request.user.pk)
            duree = validated_data.get("duree_heures") or Decimal("2")
            if et_locked.balance_hours < duree:
                raise serializers.ValidationError("Solde d’heures insuffisant pour cette durée.")

            r = Reservation(
                etudiant=request.user,
                tuteur=tutor,
                module_propose=mp,
                module_titre=validated_data["module_titre"].strip(),
                date_label=(validated_data.get("date_label") or "").strip(),
                creneau_label=(validated_data.get("creneau_label") or "").strip(),
                duree_heures=validated_data.get("duree_heures") or 2,
                format_seance=mp.format_seance,
                message=(validated_data.get("message") or "").strip(),
                statut=StatutReservation.PENDING,
                creneau_ref=creneau_ref,
                slot_start=slot_start,
                slot_end=slot_end,
            )
            r.full_clean()
            r.save()
            Notification.objects.create(
                user=tutor,
                type="request",
                text=f"{request.user.name} a demandé une séance de {r.module_titre}.",
            )
        return r


class SeanceEtudiantSerializer(serializers.ModelSerializer):
    """Format attendu par la page React « Mes Tutorats »."""

    tutor = serializers.CharField(source="tuteur.name", read_only=True)
    tutorId = serializers.IntegerField(source="tuteur_id", read_only=True)
    module = serializers.CharField(source="module_titre")
    date = serializers.CharField(source="date_label")
    time = serializers.CharField(source="creneau_label")
    duration = serializers.SerializerMethodField()
    status = serializers.CharField(source="statut")
    format = serializers.CharField(source="format_seance", read_only=True)

    class Meta:
        model = Reservation
        fields = ("id", "tutor", "tutorId", "module", "date", "time", "duration", "status", "format", "meet_url")

    def get_duration(self, obj):
        return float(obj.duree_heures)


def mask_etudiant_display(name: str) -> str:
    name = (name or "").strip()
    if not name:
        return "Étudiant"
    parts = name.split()
    if len(parts) >= 2:
        return f"{parts[0]} {parts[-1][0]}."
    return parts[0] if len(parts[0]) <= 1 else f"{parts[0][0]}."


class EvaluationSeanceCreateSerializer(serializers.ModelSerializer):
    """POST : une seule évaluation par réservation, séance complétée, étudiant propriétaire."""

    reservation = serializers.PrimaryKeyRelatedField(
        queryset=Reservation.objects.all(),
        error_messages={
            "does_not_exist": (
                "Cette réservation n’existe pas sur le serveur (identifiant « {pk_value} »). "
                "Les évaluations ne concernent que les séances enregistrées dans l’application "
                "(pas les réservations affichées uniquement hors ligne dans le navigateur)."
            ),
        },
    )

    class Meta:
        model = EvaluationSeance
        fields = ("reservation", "note", "commentaire")

    def validate_reservation(self, r: Reservation):
        user = self.context["request"].user
        if r.etudiant_id != user.id:
            raise serializers.ValidationError("Cette réservation ne vous appartient pas.")
        if r.statut != StatutReservation.COMPLETED:
            raise serializers.ValidationError("Seules les séances complétées peuvent être évaluées.")
        if EvaluationSeance.objects.filter(reservation=r).exists():
            raise serializers.ValidationError("Cette séance a déjà été évaluée.")
        return r

    def create(self, validated_data):
        r: Reservation = validated_data["reservation"]
        ev = EvaluationSeance.objects.create(
            reservation=r,
            etudiant=r.etudiant,
            tuteur=r.tuteur,
            note=validated_data["note"],
            commentaire=(validated_data.get("commentaire") or "").strip()[:500],
        )
        recalc_tutor_review_stats(r.tuteur)
        return ev


class EvaluationSeanceRecueSerializer(serializers.ModelSerializer):
    """Avis reçus par le tuteur (noms réels côté espace tuteur)."""

    student = serializers.CharField(source="etudiant.name", read_only=True)
    module = serializers.CharField(source="reservation.module_titre", read_only=True)
    date = serializers.CharField(source="reservation.date_label", read_only=True)
    time = serializers.CharField(source="reservation.creneau_label", read_only=True)

    class Meta:
        model = EvaluationSeance
        fields = ("id", "student", "module", "date", "time", "note", "commentaire", "created_at")


class EvaluationSeancePublicSerializer(serializers.ModelSerializer):
    """Avis publics (étudiant masqué)."""

    student = serializers.SerializerMethodField()
    module = serializers.CharField(source="reservation.module_titre", read_only=True)

    class Meta:
        model = EvaluationSeance
        fields = ("id", "student", "module", "note", "commentaire", "created_at")

    def get_student(self, obj):
        return mask_etudiant_display(obj.etudiant.name)


class SeanceDetailSerializer(serializers.ModelSerializer):
    """Détail d’une réservation (étudiant ou tuteur connecté)."""

    tutor = serializers.CharField(source="tuteur.name", read_only=True)
    tutorId = serializers.IntegerField(source="tuteur_id", read_only=True)
    student = serializers.CharField(source="etudiant.name", read_only=True)
    studentId = serializers.IntegerField(source="etudiant_id", read_only=True)
    student_avatar = serializers.SerializerMethodField()
    tutor_avatar = serializers.SerializerMethodField()
    module = serializers.CharField(source="module_titre")
    date = serializers.CharField(source="date_label")
    time = serializers.CharField(source="creneau_label")
    duration = serializers.SerializerMethodField()
    status = serializers.CharField(source="statut")
    format = serializers.CharField(source="format_seance")
    evaluated = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = (
            "id",
            "tutor",
            "tutorId",
            "student",
            "studentId",
            "student_avatar",
            "tutor_avatar",
            "module",
            "date",
            "time",
            "duration",
            "status",
            "format",
            "student_session_confirm",
            "tutor_session_confirm",
            "evaluated",
            "meet_url",
        )

    def _absolute_avatar_url(self, user):
        if not user:
            return None
        f = getattr(user, "avatar", None)
        if not f or not getattr(f, "name", None):
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(f.url)
        return f.url

    def get_student_avatar(self, obj):
        return self._absolute_avatar_url(obj.etudiant)

    def get_tutor_avatar(self, obj):
        return self._absolute_avatar_url(obj.tuteur)

    def get_duration(self, obj):
        return float(obj.duree_heures)

    def get_evaluated(self, obj):
        annotated = getattr(obj, "_evaluated", None)
        if annotated is not None:
            return bool(annotated)
        return EvaluationSeance.objects.filter(reservation_id=obj.pk).exists()


class SeanceMeetUrlPatchSerializer(serializers.Serializer):
    """PATCH du lien de visio par le tuteur uniquement (contrôle d’accès dans la vue)."""

    meet_url = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def validate_meet_url(self, value):
        if value is None or not str(value).strip():
            return None
        try:
            return normalize_and_validate_meet_url(str(value).strip())
        except DjangoValidationError as e:
            msg = e.messages[0] if e.messages else "URL invalide."
            raise serializers.ValidationError(msg) from e
