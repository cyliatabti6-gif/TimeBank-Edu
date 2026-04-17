import re
from decimal import Decimal

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import (
    EvaluationSeance,
    FormatSeance,
    ModulePropose,
    Niveau,
    Reservation,
    Role,
    SignalementSeance,
    StatutModule,
    StatutReservation,
    User,
    recalc_tutor_review_stats,
)


class InscriptionSerializer(serializers.Serializer):
    """
    Données envoyées par la page React « Inscription ».
    nom + prénom → un seul champ name en base.
    Rôle : toujours « both » (étudiant + tuteur) ; le client ne choisit plus.
    Listes séparées : GET /api/etudiants/ vs GET /api/tuteurs/ (filtre sur role).
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
        domains = getattr(settings, "UNIVERSITY_EMAIL_DOMAINS", [])
        if domains:
            domain = value.split("@")[-1].lower() if "@" in value else ""
            if domain not in domains:
                raise serializers.ValidationError(
                    f"E-mail non autorisé. Domaines acceptés : {', '.join(domains)}"
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
            role=Role.BOTH,
        )
        user.set_password(password)
        user.save()
        return user


class UserLectureSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "name",
            "filiere",
            "niveau",
            "description",
            "balance_hours",
            "score",
            "tutor_review_count",
            "role",
            "modules_maitrises",
            "is_staff",
            "date_joined",
        )
        read_only_fields = fields


class ProfilMiseAJourSerializer(serializers.ModelSerializer):
    """Champs modifiables (CDCF : l’e-mail universitaire ne change pas). Rôle : student / tutor / both (pas admin)."""

    modules_maitrises = serializers.ListField(
        child=serializers.CharField(max_length=120),
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = User
        fields = ("name", "filiere", "niveau", "description", "role", "modules_maitrises")

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

    def validate_role(self, value):
        allowed = {Role.STUDENT.value, Role.TUTOR.value, Role.BOTH.value}
        if value not in allowed:
            raise serializers.ValidationError(
                "Rôle non autorisé. Valeurs possibles : étudiant, tuteur, ou les deux."
            )
        return value

    def validate_modules_maitrises(self, value):
        if value is None:
            return None
        cleaned = []
        seen = set()
        for raw in value:
            t = (raw or "").strip()
            if not t:
                continue
            key = t.lower()
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(t)
        if len(cleaned) > 30:
            raise serializers.ValidationError("Vous pouvez enregistrer au plus 30 modules maîtrisés.")
        return cleaned

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if attrs.get("modules_maitrises") is not None and self.instance.role not in (
            Role.TUTOR,
            Role.BOTH,
        ):
            attrs.pop("modules_maitrises", None)
        return attrs

    def update(self, instance, validated_data):
        if instance.is_superuser and "role" in validated_data:
            validated_data.pop("role", None)
        return super().update(instance, validated_data)


def module_propose_to_frontend(instance: ModulePropose) -> dict:
    """Structure attendue par FindModule.jsx et TutorDetail.jsx."""
    t = instance.tuteur
    tags = instance.tags if isinstance(instance.tags, list) else []
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
        "tutorReviewCount": int(getattr(t, "tutor_review_count", 0) or 0),
        "tutorProfile": {
            "id": t.id,
            "name": t.name,
            "filiere": t.filiere,
            "score": float(t.score),
            "description": (t.description or "").strip(),
            "reviewCount": int(getattr(t, "tutor_review_count", 0) or 0),
        },
    }


class CreneauItemSerializer(serializers.Serializer):
    id = serializers.CharField(required=False, allow_blank=True, max_length=80)
    libelle = serializers.CharField(max_length=160)
    date = serializers.CharField(required=False, allow_blank=True, max_length=32)
    disponible = serializers.BooleanField(required=False, default=True)


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

    def validate_creneaux(self, value):
        if not value:
            raise serializers.ValidationError("Ajoutez au moins un créneau (jour et horaire).")
        for c in value:
            if not (c.get("libelle") or "").strip():
                raise serializers.ValidationError("Chaque créneau doit avoir un libellé (ex. Mercredi 14h–16h).")
        return value


class ReservationDemandeCreateSerializer(serializers.Serializer):
    """POST demande de tutorat (étudiant) → réservation « pending » côté Django."""

    tutor = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role__in=[Role.TUTOR, Role.BOTH]))
    module_propose = serializers.PrimaryKeyRelatedField(
        queryset=ModulePropose.objects.filter(actif=True, statut=StatutModule.PUBLISHED),
        required=False,
        allow_null=True,
    )
    module_titre = serializers.CharField(max_length=220)
    date_label = serializers.CharField(max_length=64, allow_blank=True, default="")
    creneau_label = serializers.CharField(max_length=160, allow_blank=True, default="")
    duree_heures = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("2"),
        min_value=Decimal("0.25"),
        max_value=Decimal("24"),
    )
    format_seance = serializers.ChoiceField(choices=FormatSeance.choices)
    message = serializers.CharField(max_length=2000, allow_blank=True, default="")

    def validate(self, attrs):
        user = self.context["request"].user
        tutor = attrs["tutor"]
        if tutor.id == user.id:
            raise serializers.ValidationError("Vous ne pouvez pas réserver une séance avec vous-même.")
        mp = attrs.get("module_propose")
        if mp is not None and mp.tuteur_id != tutor.id:
            raise serializers.ValidationError(
                {"module_propose": "Ce module n’est pas proposé par le tuteur sélectionné."}
            )
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        tutor = validated_data.pop("tutor")
        mp = validated_data.pop("module_propose", None)
        return Reservation.objects.create(
            etudiant=request.user,
            tuteur=tutor,
            module_propose=mp,
            module_titre=validated_data["module_titre"].strip(),
            date_label=(validated_data.get("date_label") or "").strip(),
            creneau_label=(validated_data.get("creneau_label") or "").strip(),
            duree_heures=validated_data.get("duree_heures") or 2,
            format_seance=validated_data["format_seance"],
            message=(validated_data.get("message") or "").strip(),
            statut=StatutReservation.PENDING,
        )


class SeanceEtudiantSerializer(serializers.ModelSerializer):
    """Format attendu par la page React « Mes Tutorats »."""

    tutor = serializers.CharField(source="tuteur.name", read_only=True)
    tutorId = serializers.IntegerField(source="tuteur_id", read_only=True)
    module = serializers.CharField(source="module_titre")
    date = serializers.CharField(source="date_label")
    time = serializers.CharField(source="creneau_label")
    duration = serializers.SerializerMethodField()
    status = serializers.CharField(source="statut")

    class Meta:
        model = Reservation
        fields = ("id", "tutor", "tutorId", "module", "date", "time", "duration", "status")

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
        if user.role not in (Role.STUDENT, Role.BOTH):
            raise serializers.ValidationError("Seuls les étudiants peuvent évaluer une séance.")
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
            "module",
            "date",
            "time",
            "duration",
            "status",
            "format",
            "student_session_confirm",
            "tutor_session_confirm",
            "evaluated",
        )

    def get_duration(self, obj):
        return float(obj.duree_heures)

    def get_evaluated(self, obj):
        return EvaluationSeance.objects.filter(reservation_id=obj.pk).exists()


class SignalementCreateSerializer(serializers.Serializer):
    issue_type = serializers.CharField(max_length=64)
    description = serializers.CharField(max_length=500, allow_blank=True, default="")


class SignalementRecuSerializer(serializers.ModelSerializer):
    reservation_id = serializers.IntegerField(source="reservation.id", read_only=True)
    reservation_status = serializers.CharField(source="reservation.statut", read_only=True)
    module = serializers.CharField(source="reservation.module_titre", read_only=True)
    student_name = serializers.CharField(source="reservation.etudiant.name", read_only=True)
    student_id = serializers.IntegerField(source="reservation.etudiant_id", read_only=True)
    reporter_name = serializers.CharField(source="auteur.name", read_only=True)
    reporter_role = serializers.CharField(source="role_auteur", read_only=True)
    issue_type = serializers.CharField(source="code_motif", read_only=True)

    class Meta:
        model = SignalementSeance
        fields = (
            "id",
            "reservation_id",
            "reservation_status",
            "module",
            "student_name",
            "student_id",
            "reporter_name",
            "reporter_role",
            "issue_type",
            "description",
            "created_at",
        )


class SignalementPourEtudiantSerializer(serializers.ModelSerializer):
    """Signalements laissés par le tuteur — visibles par l’étudiant (excuses, etc.)."""

    reservation_id = serializers.IntegerField(source="reservation.id", read_only=True)
    reservation_status = serializers.CharField(source="reservation.statut", read_only=True)
    module = serializers.CharField(source="reservation.module_titre", read_only=True)
    tutor_name = serializers.CharField(source="reservation.tuteur.name", read_only=True)
    tutor_id = serializers.IntegerField(source="reservation.tuteur_id", read_only=True)
    date_label = serializers.CharField(source="reservation.date_label", read_only=True)
    creneau_label = serializers.CharField(source="reservation.creneau_label", read_only=True)
    reporter_name = serializers.CharField(source="auteur.name", read_only=True)
    issue_type = serializers.CharField(source="code_motif", read_only=True)

    class Meta:
        model = SignalementSeance
        fields = (
            "id",
            "reservation_id",
            "reservation_status",
            "module",
            "tutor_name",
            "tutor_id",
            "date_label",
            "creneau_label",
            "reporter_name",
            "issue_type",
            "description",
            "created_at",
        )
