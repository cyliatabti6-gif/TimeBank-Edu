import uuid

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    EvaluationSeance,
    ModulePropose,
    Niveau,
    Reservation,
    Role,
    SignalementSeance,
    StatutModule,
    StatutReservation,
    User,
)
from .serializers import (
    EvaluationSeanceCreateSerializer,
    EvaluationSeancePublicSerializer,
    EvaluationSeanceRecueSerializer,
    InscriptionSerializer,
    ModuleProposeCreateSerializer,
    ProfilMiseAJourSerializer,
    ReservationDemandeCreateSerializer,
    SeanceDetailSerializer,
    SeanceEtudiantSerializer,
    SignalementCreateSerializer,
    SignalementPourEtudiantSerializer,
    SignalementRecuSerializer,
    UserLectureSerializer,
    module_propose_to_frontend,
)


class InscriptionView(APIView):
    """
    POST /api/inscription/ — crée un compte (2 h, score 5), rôle « both » (étudiant + tuteur).
    Listes séparées : GET /api/etudiants/ (student|both) et GET /api/tuteurs/ (tutor|both).
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = InscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "message": "Compte créé avec succès.",
                "user": UserLectureSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ListeEtudiantsView(APIView):
    """GET /api/etudiants/ — uniquement les comptes inscrits comme étudiant (role=student)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = User.objects.filter(role__in=[Role.STUDENT, Role.BOTH]).order_by("-date_joined")
        return Response(UserLectureSerializer(qs, many=True).data)


class ListeTuteursView(APIView):
    """GET /api/tuteurs/ — uniquement les comptes inscrits comme tuteur (role=tutor)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = User.objects.filter(role__in=[Role.TUTOR, Role.BOTH]).order_by("-date_joined")
        return Response(UserLectureSerializer(qs, many=True).data)


class ConnexionView(TokenObtainPairView):
    """
    POST /api/connexion/
    Corps JSON : { "email", "password" }
    Réponse : access, refresh, user
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code != 200:
            return response
        email = request.data.get("email", "").strip().lower()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return response
        response.data["user"] = UserLectureSerializer(user).data
        return response


class MoiView(APIView):
    """GET /api/auth/me/ — profil. PATCH — mise à jour (nom, filière, niveau, description)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserLectureSerializer(request.user).data)

    def patch(self, request):
        ser = ProfilMiseAJourSerializer(request.user, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(UserLectureSerializer(request.user).data)


class ListeModulesView(APIView):
    """
    GET /api/modules/ — modules proposés (catalogue étudiant).
    Query : ?niveau=L2  (optionnel, parmi L1, L2, L3, M1, M2, Doctorat)
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = (
            ModulePropose.objects.filter(actif=True, statut=StatutModule.PUBLISHED)
            .select_related("tuteur")
            .order_by("niveau", "titre")
        )
        niveau = (request.query_params.get("niveau") or "").strip()
        if niveau:
            allowed = {c.value for c in Niveau}
            if niveau in allowed:
                qs = qs.filter(niveau=niveau)
        data = [module_propose_to_frontend(m) for m in qs]
        return Response(data)


class DetailModuleView(APIView):
    """GET /api/modules/<id>/ — détail d’une offre (créneaux, profil tuteur)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        mod = get_object_or_404(
            ModulePropose.objects.select_related("tuteur"),
            pk=pk,
            actif=True,
            statut=StatutModule.PUBLISHED,
        )
        return Response(module_propose_to_frontend(mod))


class ModulesPubliesTuteurView(APIView):
    """
    GET /api/tuteurs/<pk>/modules/ — modules publiés et actifs d’un tuteur (sans JWT).
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        tutor = get_object_or_404(
            User.objects.filter(role__in=[Role.TUTOR, Role.BOTH]),
            pk=pk,
        )
        qs = (
            ModulePropose.objects.filter(
                tuteur=tutor,
                actif=True,
                statut=StatutModule.PUBLISHED,
            )
            .select_related("tuteur")
            .order_by("niveau", "titre")
        )
        return Response([module_propose_to_frontend(m) for m in qs])


class TuteurModulesView(APIView):
    """
    GET /api/tuteur/modules/ — modules publiés par le tuteur connecté.
    POST /api/tuteur/modules/ — publier une offre.
    Alias : /api/tuteurs/modules/ (même vue, évite les 404 si « tuteurs » au pluriel).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role not in (Role.TUTOR, Role.BOTH):
            return Response(
                {"detail": "Seuls les tuteurs peuvent consulter cette liste."},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = (
            ModulePropose.objects.filter(tuteur=user, actif=True)
            .select_related("tuteur")
            .order_by("-created_at")
        )
        return Response([module_propose_to_frontend(m) for m in qs])

    def post(self, request):
        user = request.user
        if user.role not in (Role.TUTOR, Role.BOTH):
            return Response(
                {"detail": "Seuls les tuteurs peuvent publier un module."},
                status=status.HTTP_403_FORBIDDEN,
            )
        ser = ModuleProposeCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        creneaux_norm = []
        for c in data["creneaux"]:
            cid = (c.get("id") or "").strip() or f"c-{uuid.uuid4().hex[:12]}"
            creneaux_norm.append(
                {
                    "id": cid,
                    "libelle": c["libelle"].strip(),
                    "date": (c.get("date") or "").strip(),
                    "disponible": bool(c.get("disponible", True)),
                }
            )
        tags = [str(x).strip() for x in (data.get("tags") or []) if str(x).strip()]
        mod = ModulePropose.objects.create(
            titre=data["titre"].strip(),
            niveau=data["niveau"],
            tuteur=user,
            filiere_cible=(user.filiere or "").strip() or "Informatique",
            format_seance=data["format_seance"],
            planning=(data.get("planning") or "").strip(),
            description=(data.get("description") or "").strip(),
            duree_label=(data.get("duree_label") or "").strip(),
            tags=tags,
            creneaux=creneaux_norm,
            nombre_avis=0,
            statut=StatutModule.PUBLISHED,
            actif=True,
        )
        return Response(module_propose_to_frontend(mod), status=status.HTTP_201_CREATED)


class TuteurModuleDetailView(APIView):
    """
    GET /api/tuteur/modules/<id>/ — détail d'un module du tuteur connecté.
    PUT /api/tuteur/modules/<id>/ — mise à jour complète d'un module du tuteur connecté.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        user = request.user
        if user.role not in (Role.TUTOR, Role.BOTH):
            return Response(
                {"detail": "Seuls les tuteurs peuvent consulter ce module."},
                status=status.HTTP_403_FORBIDDEN,
            )
        mod = get_object_or_404(ModulePropose.objects.select_related("tuteur"), pk=pk, tuteur=user, actif=True)
        return Response(module_propose_to_frontend(mod))

    def put(self, request, pk):
        user = request.user
        if user.role not in (Role.TUTOR, Role.BOTH):
            return Response(
                {"detail": "Seuls les tuteurs peuvent modifier ce module."},
                status=status.HTTP_403_FORBIDDEN,
            )
        mod = get_object_or_404(ModulePropose.objects.select_related("tuteur"), pk=pk, tuteur=user, actif=True)
        ser = ModuleProposeCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        creneaux_norm = []
        for c in data["creneaux"]:
            cid = (c.get("id") or "").strip() or f"c-{uuid.uuid4().hex[:12]}"
            creneaux_norm.append(
                {
                    "id": cid,
                    "libelle": c["libelle"].strip(),
                    "date": (c.get("date") or "").strip(),
                    "disponible": bool(c.get("disponible", True)),
                }
            )
        tags = [str(x).strip() for x in (data.get("tags") or []) if str(x).strip()]

        mod.titre = data["titre"].strip()
        mod.niveau = data["niveau"]
        mod.format_seance = data["format_seance"]
        mod.planning = (data.get("planning") or "").strip()
        mod.description = (data.get("description") or "").strip()
        mod.duree_label = (data.get("duree_label") or "").strip()
        mod.tags = tags
        mod.creneaux = creneaux_norm
        mod.statut = StatutModule.PUBLISHED
        mod.actif = True
        mod.save(
            update_fields=[
                "titre",
                "niveau",
                "format_seance",
                "planning",
                "description",
                "duree_label",
                "tags",
                "creneaux",
                "statut",
                "actif",
            ]
        )
        mod.refresh_from_db()
        return Response(module_propose_to_frontend(mod))


class EtudiantReservationsView(APIView):
    """
    GET /api/etudiant/reservations/ — toutes mes réservations côté serveur (pour synchroniser l’UI).
    POST /api/etudiant/reservations/ — crée une demande (pending) côté serveur.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role not in (Role.STUDENT, Role.BOTH):
            return Response([])
        qs = (
            Reservation.objects.filter(etudiant=user)
            .select_related("etudiant", "tuteur")
            .order_by("-created_at")
        )
        return Response(SeanceDetailSerializer(qs, many=True).data)

    def post(self, request):
        user = request.user
        if user.role not in (Role.STUDENT, Role.BOTH):
            return Response(
                {"detail": "Seuls les étudiants (ou comptes étudiant+tuteur) peuvent envoyer une demande."},
                status=status.HTTP_403_FORBIDDEN,
            )
        ser = ReservationDemandeCreateSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        r = ser.save()
        r.refresh_from_db()
        return Response(SeanceDetailSerializer(r).data, status=status.HTTP_201_CREATED)


class TuteurReservationsRecuesView(APIView):
    """GET /api/tuteur/reservations-recues/ — réservations où l’utilisateur connecté est le tuteur."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role not in (Role.TUTOR, Role.BOTH):
            return Response([])
        qs = (
            Reservation.objects.filter(tuteur=user)
            .select_related("etudiant", "tuteur")
            .order_by("-created_at")
        )
        return Response(SeanceDetailSerializer(qs, many=True).data)


class SeanceAccepterTuteurView(APIView):
    """POST /api/seances/<id>/accepter-tuteur/ — le tuteur accepte une demande (pending → confirmed)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        r = get_object_or_404(Reservation.objects.select_related("etudiant", "tuteur"), pk=pk)
        if request.user.id != r.tuteur_id:
            return Response({"detail": "Seul le tuteur concerné peut accepter cette demande."}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role not in (Role.TUTOR, Role.BOTH):
            return Response(
                {"detail": "Seuls les tuteurs peuvent accepter une demande."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if r.statut != StatutReservation.PENDING:
            return Response(
                {"detail": "Seules les demandes en attente peuvent être acceptées."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        r.statut = StatutReservation.CONFIRMED
        r.save(update_fields=["statut", "updated_at"])
        r.refresh_from_db()
        return Response(SeanceDetailSerializer(r).data)


class MesSeancesEtudiantView(APIView):
    """
    GET /api/seances/ — séances où l’utilisateur connecté est l’étudiant (JWT).
    Rôle : student ou both. Tri : plus récentes d’abord.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role not in (Role.STUDENT, Role.BOTH):
            return Response([])
        qs = (
            Reservation.objects.filter(etudiant=user)
            .select_related("tuteur")
            .order_by("-created_at")
        )
        return Response(SeanceEtudiantSerializer(qs, many=True).data)


class SeanceDetailView(APIView):
    """GET /api/seances/<id>/ — détail si l’utilisateur est l’étudiant ou le tuteur."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        r = get_object_or_404(
            Reservation.objects.select_related("etudiant", "tuteur"),
            pk=pk,
        )
        if request.user.id not in (r.etudiant_id, r.tuteur_id):
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)
        return Response(SeanceDetailSerializer(r).data)


class SeanceConfirmerFinView(APIView):
    """
    POST /api/seances/<id>/confirmer-fin/ — confirmation de fin par l’étudiant ou le tuteur.
    Lorsque les deux ont confirmé : transfert d’heures (étudiant −d, tuteur +d), statut completed.
    """

    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        r = get_object_or_404(Reservation.objects.select_for_update().select_related("etudiant", "tuteur"), pk=pk)
        if request.user.id not in (r.etudiant_id, r.tuteur_id):
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        if r.statut == StatutReservation.COMPLETED:
            return Response(SeanceDetailSerializer(r).data)

        if r.statut != StatutReservation.CONFIRMED:
            return Response(
                {"detail": "Seules les séances au statut « confirmée » peuvent être clôturées ainsi."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user.id == r.etudiant_id:
            r.student_session_confirm = True
        if request.user.id == r.tuteur_id:
            r.tutor_session_confirm = True
        r.save(update_fields=["student_session_confirm", "tutor_session_confirm", "updated_at"])

        if r.student_session_confirm and r.tutor_session_confirm:
            d = r.duree_heures
            et = User.objects.select_for_update().get(pk=r.etudiant_id)
            tu = User.objects.select_for_update().get(pk=r.tuteur_id)
            et.balance_hours = et.balance_hours - d
            tu.balance_hours = tu.balance_hours + d
            et.save(update_fields=["balance_hours"])
            tu.save(update_fields=["balance_hours"])
            r.statut = StatutReservation.COMPLETED
            r.save(update_fields=["statut", "updated_at"])

        r.refresh_from_db()
        return Response(SeanceDetailSerializer(r).data)


def _reservation_brief_dict(r: Reservation, *, evaluated: bool = False) -> dict:
    return {
        "id": r.id,
        "module": r.module_titre,
        "date": r.date_label or "",
        "time": r.creneau_label or "",
        "duration": float(r.duree_heures),
        "status": r.statut,
        "evaluated": evaluated,
        "serverBacked": True,
    }


def build_mes_tuteurs_etudiant(user: User) -> list:
    """Agrège les réservations par tuteur (hors annulées) pour la page « Mes tutorats »."""
    if user.role not in (Role.STUDENT, Role.BOTH):
        return []
    qs = (
        Reservation.objects.filter(etudiant=user)
        .exclude(statut=StatutReservation.CANCELLED)
        .select_related("tuteur")
        .order_by("-created_at")
    )
    by_tutor = {}
    for r in qs:
        by_tutor.setdefault(r.tuteur_id, []).append(r)

    out = []
    for tid, rows in by_tutor.items():
        t = rows[0].tuteur
        completed_rows = [x for x in rows if x.statut == StatutReservation.COMPLETED]
        completed_ids = [x.id for x in completed_rows]
        evaluated_ids = set(
            EvaluationSeance.objects.filter(reservation_id__in=completed_ids).values_list(
                "reservation_id", flat=True
            )
        )
        past = [
            _reservation_brief_dict(x, evaluated=x.id in evaluated_ids) for x in completed_rows
        ]
        upcoming = [
            _reservation_brief_dict(x)
            for x in rows
            if x.statut
            in (StatutReservation.PENDING, StatutReservation.CONFIRMED, StatutReservation.IN_PROGRESS)
        ]
        past.sort(key=lambda x: -x["id"])
        upcoming.sort(key=lambda x: -x["id"])
        if not past:
            continue
        can_evaluate = any(not p["evaluated"] for p in past)
        out.append(
            {
                "tutorId": tid,
                "tutorName": t.name,
                "filiere": t.filiere or "",
                "score": float(t.score),
                "pastSessions": past,
                "upcomingSessions": upcoming,
                "canEvaluate": can_evaluate,
            }
        )

    out.sort(key=lambda x: (-len(x["upcomingSessions"]), (x["tutorName"] or "").lower()))
    return out


class MesTuteursEtudiantView(APIView):
    """
    GET /api/etudiant/mes-tuteurs/ — tuteurs avec au moins une séance complétée avec l’étudiant,
    plus leurs séances à venir (même tuteur). Sans séance complétée, le tuteur n’apparaît pas.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(build_mes_tuteurs_etudiant(request.user))


class EvaluationSeanceCreateView(APIView):
    """
    POST /api/evaluations/ — corps : { "reservation", "note" (1–5), "commentaire" (optionnel) }.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in (Role.STUDENT, Role.BOTH):
            return Response(
                {"detail": "Seuls les étudiants peuvent soumettre une évaluation."},
                status=status.HTTP_403_FORBIDDEN,
            )
        ser = EvaluationSeanceCreateSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        ev = ser.save()
        tu = User.objects.get(pk=ev.tuteur_id)
        return Response(
            {
                "id": ev.id,
                "note": ev.note,
                "commentaire": ev.commentaire,
                "created_at": ev.created_at,
                "tutor": {
                    "id": tu.id,
                    "score": float(tu.score),
                    "tutor_review_count": tu.tutor_review_count,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class EvaluationsRecuesTuteurView(APIView):
    """GET /api/tuteur/evaluations-recues/ — avis laissés par les étudiants (JWT tuteur)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role not in (Role.TUTOR, Role.BOTH):
            return Response(
                {"detail": "Réservé aux comptes tuteur."},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = (
            EvaluationSeance.objects.filter(tuteur=user)
            .select_related("etudiant", "reservation")
            .order_by("-created_at")[:200]
        )
        return Response(EvaluationSeanceRecueSerializer(qs, many=True).data)


class AvisPublicTuteurView(APIView):
    """GET /api/tuteurs/<pk>/avis/ — avis publics (étudiants masqués), sans JWT."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        tutor = get_object_or_404(
            User.objects.filter(role__in=[Role.TUTOR, Role.BOTH]),
            pk=pk,
        )
        qs = (
            EvaluationSeance.objects.filter(tuteur=tutor)
            .select_related("reservation")
            .order_by("-created_at")[:100]
        )
        return Response(EvaluationSeancePublicSerializer(qs, many=True).data)


class SignalementSeanceCreateView(APIView):
    """
    POST /api/seances/<id>/signalement/ — corps : { "issue_type", "description" (optionnel) }.
    Réservé à l’étudiant ou au tuteur de la réservation (une fois par personne et par séance).
    Après enregistrement : la réservation passe en « annulée » (étudiant ou tuteur).
    """

    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        r = get_object_or_404(
            Reservation.objects.select_for_update()
            .select_related("etudiant", "tuteur"),
            pk=pk,
        )
        if request.user.id not in (r.etudiant_id, r.tuteur_id):
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)
        if r.statut not in (StatutReservation.CONFIRMED, StatutReservation.IN_PROGRESS):
            return Response(
                {"detail": "Le signalement n’est possible que pour une séance confirmée et non terminée."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if SignalementSeance.objects.filter(reservation=r, auteur=request.user).exists():
            return Response(
                {"detail": "Vous avez déjà signalé un problème pour cette séance."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = SignalementCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        role_auteur = "student" if request.user.id == r.etudiant_id else "tutor"
        sig = SignalementSeance.objects.create(
            reservation=r,
            auteur=request.user,
            role_auteur=role_auteur,
            code_motif=ser.validated_data["issue_type"],
            description=ser.validated_data.get("description") or "",
        )
        reservation_cancelled = False
        if role_auteur in ("student", "tutor"):
            r.statut = StatutReservation.CANCELLED
            r.save(update_fields=["statut", "updated_at"])
            reservation_cancelled = True
        sig = SignalementSeance.objects.select_related(
            "reservation",
            "reservation__etudiant",
            "auteur",
        ).get(pk=sig.pk)
        out = dict(SignalementRecuSerializer(sig).data)
        out["reservation_status"] = sig.reservation.statut
        out["reservation_cancelled"] = reservation_cancelled
        return Response(out, status=status.HTTP_201_CREATED)


class SignalementsRecusTuteurView(APIView):
    """GET /api/tuteur/signalements-recus/ — signalements sur les séances où l’utilisateur est le tuteur."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role not in (Role.TUTOR, Role.BOTH):
            return Response(
                {"detail": "Réservé aux comptes tuteur."},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = (
            SignalementSeance.objects.filter(reservation__tuteur=user)
            .select_related("reservation", "reservation__etudiant", "auteur")
            .order_by("-created_at")[:200]
        )
        return Response(SignalementRecuSerializer(qs, many=True).data)


class SignalementsRecusEtudiantView(APIView):
    """GET /api/etudiant/signalements-recus/ — signalements du tuteur concernant la séance (excuses, etc.)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role not in (Role.STUDENT, Role.BOTH):
            return Response(
                {"detail": "Réservé aux comptes étudiant."},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = (
            SignalementSeance.objects.filter(reservation__etudiant=user, role_auteur="tutor")
            .select_related("reservation", "reservation__tuteur", "auteur")
            .order_by("-created_at")[:200]
        )
        return Response(SignalementPourEtudiantSerializer(qs, many=True).data)
