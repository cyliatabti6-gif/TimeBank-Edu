import uuid

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Exists, OuterRef, Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    Dispute,
    DisputeStatus,
    EvaluationSeance,
    FormatSeance,
    ModulePropose,
    Niveau,
    Notification,
    Reservation,
    StatutModule,
    StatutReservation,
    User,
)
from . import reservation_fsm
from .utils import platform_admin_on_tuteur_fk_q, platform_admin_q
from .serializers import (
    EvaluationSeanceCreateSerializer,
    EvaluationSeancePublicSerializer,
    EvaluationSeanceRecueSerializer,
    InscriptionSerializer,
    ModuleProposeCreateSerializer,
    ModuleProposeUpdateSerializer,
    ProfilMiseAJourSerializer,
    ReservationDemandeCreateSerializer,
    SeanceDetailSerializer,
    SeanceEtudiantSerializer,
    SeanceMeetUrlPatchSerializer,
    NotificationSerializer,
    UserLectureSerializer,
    module_propose_to_frontend,
)


class InscriptionView(APIView):
    """
    POST /api/inscription/ — crée un compte (2 h, score 5), role=user, is_student et is_tutor à True par défaut.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = InscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "message": "Compte créé avec succès.",
                "user": UserLectureSerializer(user, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ListeEtudiantsView(APIView):
    """GET /api/etudiants/ — comptes avec permission étudiant (hors admins plateforme)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = User.objects.exclude(platform_admin_q()).order_by("-date_joined")
        return Response(UserLectureSerializer(qs, many=True, context={"request": request}).data)


class ListeTuteursView(APIView):
    """GET /api/tuteurs/ — comptes avec permission tuteur (hors admins plateforme)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = User.objects.exclude(platform_admin_q()).order_by("-date_joined")
        return Response(UserLectureSerializer(qs, many=True, context={"request": request}).data)


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
        response.data["user"] = UserLectureSerializer(user, context={"request": request}).data
        return response


class MoiView(APIView):
    """GET /api/auth/me/ — profil. PATCH — nom, filière, niveau, description, avatar (pas role / is_student / is_tutor)."""

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        return Response(UserLectureSerializer(request.user, context={"request": request}).data)

    def patch(self, request):
        ser = ProfilMiseAJourSerializer(request.user, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(UserLectureSerializer(request.user, context={"request": request}).data)


class ListeModulesView(APIView):
    """
    GET /api/modules/ — modules proposés (catalogue étudiant).
    Query : ?niveau=L2  (optionnel, parmi L1, L2, L3, M1, M2, Doctorat)
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = (
            ModulePropose.objects.filter(actif=True, statut=StatutModule.PUBLISHED)
            .exclude(platform_admin_on_tuteur_fk_q())
            .select_related("tuteur")
            .order_by("niveau", "titre")
        )
        niveau = (request.query_params.get("niveau") or "").strip()
        if niveau:
            allowed = {c.value for c in Niveau}
            if niveau in allowed:
                qs = qs.filter(niveau=niveau)
        data = [module_propose_to_frontend(m, request) for m in qs]
        return Response(data)


class DetailModuleView(APIView):
    """GET /api/modules/<id>/ — détail d’une offre (créneaux, profil tuteur)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        mod = get_object_or_404(
            ModulePropose.objects.filter(actif=True, statut=StatutModule.PUBLISHED)
            .exclude(platform_admin_on_tuteur_fk_q())
            .select_related("tuteur"),
            pk=pk,
        )
        return Response(module_propose_to_frontend(mod, request))


class ModulesPubliesTuteurView(APIView):
    """
    GET /api/tuteurs/<pk>/modules/ — modules publiés et actifs d’un tuteur (sans JWT).
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        tutor = get_object_or_404(User.objects.exclude(platform_admin_q()), pk=pk)
        qs = (
            ModulePropose.objects.filter(
                tuteur=tutor,
                actif=True,
                statut=StatutModule.PUBLISHED,
            )
            .select_related("tuteur")
            .order_by("niveau", "titre")
        )
        return Response([module_propose_to_frontend(m, request) for m in qs])


class TuteurModulesView(APIView):
    """
    GET /api/tuteur/modules/ — modules publiés par le tuteur connecté.
    POST /api/tuteur/modules/ — publier une offre.
    Alias : /api/tuteurs/modules/ (même vue, évite les 404 si « tuteurs » au pluriel).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        qs = (
            ModulePropose.objects.filter(tuteur=user, actif=True)
            .select_related("tuteur")
            .order_by("-created_at")
        )
        return Response([module_propose_to_frontend(m, request) for m in qs])

    def post(self, request):
        user = request.user
        ser = ModuleProposeCreateSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        creneaux_norm = []
        for c in data["creneaux"]:
            cid = (c.get("id") or "").strip() or f"c-{uuid.uuid4().hex[:12]}"
            row = {
                "id": cid,
                "libelle": c["libelle"].strip(),
                "date": (c.get("date") or "").strip(),
                "disponible": bool(c.get("disponible", True)),
            }
            for k in ("date_iso", "heure_debut", "heure_fin"):
                if c.get(k):
                    row[k] = str(c[k]).strip()
            creneaux_norm.append(row)
        tags = [str(x).strip() for x in (data.get("tags") or []) if str(x).strip()]
        mod = ModulePropose(
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
        mod.full_clean()
        mod.save()
        return Response(module_propose_to_frontend(mod, request), status=status.HTTP_201_CREATED)


class TuteurModuleDetailView(APIView):
    """
    GET /api/tuteur/modules/<id>/ — détail d'un module (tuteur propriétaire uniquement, y compris inactif).
    PATCH /api/tuteur/modules/<id>/ — mise à jour partielle d'un module du tuteur connecté.
    DELETE /api/tuteur/modules/<id>/ — suppression logique (actif=False) d'un module du tuteur connecté.
    """

    permission_classes = [permissions.IsAuthenticated]

    def _get_owned_module(self, request, pk):
        mod = get_object_or_404(ModulePropose.objects.select_related("tuteur"), pk=pk)
        if mod.tuteur_id != request.user.id:
            return None
        return mod

    def get(self, request, pk):
        mod = self._get_owned_module(request, pk)
        if mod is None:
            return Response({"detail": "Vous ne pouvez consulter que vos propres modules."}, status=status.HTTP_403_FORBIDDEN)
        return Response(module_propose_to_frontend(mod, request))

    def patch(self, request, pk):
        mod = self._get_owned_module(request, pk)
        if mod is None:
            return Response({"detail": "Vous ne pouvez modifier que vos propres modules."}, status=status.HTTP_403_FORBIDDEN)
        ser = ModuleProposeUpdateSerializer(data=request.data, partial=True, context={"request": request})
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        if "titre" in data:
            mod.titre = data["titre"].strip()
        if "niveau" in data:
            mod.niveau = data["niveau"]
        if "format_seance" in data:
            mod.format_seance = data["format_seance"]
        if "planning" in data:
            mod.planning = (data.get("planning") or "").strip()
        if "description" in data:
            mod.description = (data.get("description") or "").strip()
        if "duree_label" in data:
            mod.duree_label = (data.get("duree_label") or "").strip()
        if "statut" in data:
            mod.statut = data["statut"]
        if "tags" in data:
            mod.tags = [str(x).strip() for x in (data.get("tags") or []) if str(x).strip()]
        if "creneaux" in data:
            creneaux_norm = []
            for c in data["creneaux"]:
                cid = (c.get("id") or "").strip() or f"c-{uuid.uuid4().hex[:12]}"
                row = {
                    "id": cid,
                    "libelle": (c.get("libelle") or "").strip(),
                    "date": (c.get("date") or "").strip(),
                    "disponible": bool(c.get("disponible", True)),
                }
                for k in ("date_iso", "heure_debut", "heure_fin"):
                    if c.get(k):
                        row[k] = str(c[k]).strip()
                creneaux_norm.append(row)
            mod.creneaux = creneaux_norm

        mod.full_clean()
        mod.save()
        return Response(module_propose_to_frontend(mod, request))

    def delete(self, request, pk):
        mod = self._get_owned_module(request, pk)
        if mod is None:
            return Response({"detail": "Vous ne pouvez supprimer que vos propres modules."}, status=status.HTTP_403_FORBIDDEN)
        if not mod.actif:
            return Response(status=status.HTTP_204_NO_CONTENT)
        mod.actif = False
        mod.save(update_fields=["actif"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class EtudiantReservationsView(APIView):
    """
    GET /api/etudiant/reservations/ — toutes mes réservations côté serveur (pour synchroniser l’UI).
    POST /api/etudiant/reservations/ — crée une demande (pending) côté serveur.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        eval_subq = Exists(EvaluationSeance.objects.filter(reservation_id=OuterRef("pk")))
        qs = (
            Reservation.objects.filter(etudiant=user)
            .annotate(_evaluated=eval_subq)
            .select_related("etudiant", "tuteur")
            .order_by("-created_at")
        )
        return Response(SeanceDetailSerializer(qs, many=True, context={"request": request}).data)

    def post(self, request):
        ser = ReservationDemandeCreateSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        r = ser.save()
        r.refresh_from_db()
        return Response(SeanceDetailSerializer(r, context={"request": request}).data, status=status.HTTP_201_CREATED)


class EtudiantReservationAnnulerView(APIView):
    """
    POST /api/etudiant/reservations/<pk>/annuler/ — l’étudiant annule sa demande (uniquement pending → cancelled).
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        r = get_object_or_404(
            Reservation.objects.select_related("etudiant", "tuteur"),
            pk=pk,
        )
        if r.etudiant_id != user.id:
            return Response({"detail": "Vous ne pouvez annuler que vos propres réservations."}, status=status.HTTP_403_FORBIDDEN)
        if r.statut == StatutReservation.CONFIRMED:
            return Response(
                {"detail": "Reservation cannot be cancelled after tutor acceptance."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            reservation_fsm.assert_pending_to_cancelled(r.statut)
        except DjangoValidationError as e:
            return Response(
                {"detail": e.messages[0] if e.messages else str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        r.statut = StatutReservation.CANCELLED
        r.save(update_fields=["statut", "updated_at"])
        r.refresh_from_db()
        return Response(SeanceDetailSerializer(r, context={"request": request}).data)


class TuteurReservationsRecuesView(APIView):
    """GET /api/tuteur/reservations-recues/ — réservations où l’utilisateur connecté est le tuteur."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        eval_subq = Exists(EvaluationSeance.objects.filter(reservation_id=OuterRef("pk")))
        qs = (
            Reservation.objects.filter(tuteur=user)
            .annotate(_evaluated=eval_subq)
            .select_related("etudiant", "tuteur")
            .order_by("-created_at")
        )
        return Response(SeanceDetailSerializer(qs, many=True, context={"request": request}).data)


class SeanceAccepterTuteurView(APIView):
    """POST /api/seances/<id>/accepter-tuteur/ — le tuteur accepte une demande (pending → confirmed)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        r = get_object_or_404(Reservation.objects.select_related("etudiant", "tuteur"), pk=pk)
        if request.user.id != r.tuteur_id:
            return Response({"detail": "Seul le tuteur concerné peut accepter cette demande."}, status=status.HTTP_403_FORBIDDEN)
        try:
            reservation_fsm.assert_pending_to_confirmed(r.statut)
        except DjangoValidationError as e:
            return Response(
                {"detail": e.messages[0] if e.messages else str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        r.statut = StatutReservation.CONFIRMED
        r.save(update_fields=["statut", "updated_at"])
        Notification.objects.create(
            user=r.etudiant,
            type="confirmed",
            text=f"Votre séance avec {r.tuteur.name} a été confirmée.",
        )
        r.refresh_from_db()
        return Response(SeanceDetailSerializer(r, context={"request": request}).data)


class NotificationListView(APIView):
    """GET /api/notifications/ — notifications de l’utilisateur connecté."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(user=request.user).order_by("-created_at")
        return Response(NotificationSerializer(qs, many=True).data)


class NotificationMarkAllReadView(APIView):
    """PATCH /api/notifications/read-all/ — marquer tout comme lu."""

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"detail": "ok"}, status=status.HTTP_200_OK)


class NotificationMarkReadView(APIView):
    """PATCH /api/notifications/<id>/read/ — marquer une notification comme lue."""

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        n = get_object_or_404(Notification, pk=pk, user=request.user)
        if not n.is_read:
            n.is_read = True
            n.save(update_fields=["is_read"])
        return Response(NotificationSerializer(n).data, status=status.HTTP_200_OK)


class ReportDisputeView(APIView):
    """POST /api/disputes/report/ — signaler un problème sur une réservation."""

    permission_classes = [permissions.IsAuthenticated]

    ISSUE_LABELS = {
        "no_show": "Absence non justifiée (tuteur)",
        "late": "Retard important",
        "behavior": "Comportement inapproprié",
        "student_no_show": "Empêchement étudiant",
        "student_absence": "Absence signalée (étudiant)",
        "tutor_absence": "Absence signalée (tuteur)",
        "other": "Autre problème",
    }

    def post(self, request):
        reservation_id = request.data.get("reservation_id")
        issue_type = str(request.data.get("issue_type") or "other").strip().lower()
        cause_code = str(request.data.get("cause_code") or "").strip().lower()
        cause_label = str(request.data.get("cause_label") or "").strip()
        description = (request.data.get("description") or "").strip()
        if not reservation_id:
            return Response({"detail": "reservation_id requis."}, status=status.HTTP_400_BAD_REQUEST)
        r = get_object_or_404(Reservation.objects.select_related("etudiant", "tuteur"), pk=reservation_id)
        if request.user.id not in (r.etudiant_id, r.tuteur_id):
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        reporter_is_student = request.user.id == r.etudiant_id
        if issue_type == "other":
            issue_type = "student_absence" if reporter_is_student else "tutor_absence"
        issue_label = self.ISSUE_LABELS.get(issue_type, self.ISSUE_LABELS["other"])
        title = f"{issue_label} — {r.module_titre}"
        if cause_label:
            title = f"{issue_label} ({cause_label}) — {r.module_titre}"

        if reporter_is_student:
            target_id = r.tuteur_id
        else:
            target_id = r.etudiant_id

        combined_description = description
        if cause_label:
            combined_description = f"Cause déclarée: {cause_label}" + (f"\n{description}" if description else "")

        d = Dispute.objects.create(
            title=title[:160],
            description=combined_description[:2000],
            reporter_id=request.user.id,
            target_id=target_id,
            reservation_id=r.id,
            status=DisputeStatus.PENDING,
        )
        # Dès qu'un signalement est créé, la séance est annulée côté étudiant et tuteur.
        if r.statut in (StatutReservation.PENDING, StatutReservation.CONFIRMED):
            r.statut = StatutReservation.CANCELLED
            r.student_session_confirm = False
            r.tutor_session_confirm = False
            r.save(update_fields=["statut", "student_session_confirm", "tutor_session_confirm", "updated_at"])
        Notification.objects.create(
            user_id=target_id,
            type="reminder",
            text=f"Nouveau signalement d'absence sur « {r.module_titre} ».",
        )
        Notification.objects.create(
            user_id=request.user.id,
            type="reminder",
            text=f"La séance « {r.module_titre} » a été annulée suite à votre signalement.",
        )
        return Response(
            {
                "id": d.id,
                "status": d.status,
                "issue_type": issue_type,
                "cause_code": cause_code,
                "cause_label": cause_label,
            },
            status=status.HTTP_201_CREATED,
        )


class TutorDisputesView(APIView):
    """GET /api/tuteur/disputes/ — signalements concernant le tuteur connecté."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not getattr(request.user, "is_tutor", False):
            return Response({"detail": "Réservé aux tuteurs."}, status=status.HTTP_403_FORBIDDEN)
        qs = (
            Dispute.objects.select_related("reporter", "reservation")
            .filter(
                Q(target=request.user) | Q(reservation__tuteur=request.user)
            )
            .order_by("-created_at")[:100]
        )
        data = []
        for d in qs:
            status_label = (
                "En attente"
                if d.status == DisputeStatus.PENDING
                else "En cours"
                if d.status == DisputeStatus.IN_PROGRESS
                else "Résolu"
            )
            cause = ""
            if d.description.startswith("Cause déclarée:"):
                cause = d.description.split("\n", 1)[0].replace("Cause déclarée:", "").strip()
            data.append(
                {
                    "id": d.id,
                    "title": d.title,
                    "description": d.description,
                    "status": status_label,
                    "status_key": d.status,
                    "created_at": d.created_at,
                    "reporterName": d.reporter.name if d.reporter else "Étudiant",
                    "reservationId": d.reservation_id,
                    "module": d.reservation.module_titre if d.reservation else "",
                    "date": d.reservation.date_label if d.reservation else "",
                    "time": d.reservation.creneau_label if d.reservation else "",
                    "cause": cause,
                }
            )
        return Response(data, status=status.HTTP_200_OK)


class StudentDisputesView(APIView):
    """GET /api/etudiant/disputes/ — signalements concernant l’étudiant connecté."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not getattr(request.user, "is_student", False):
            return Response({"detail": "Réservé aux étudiants."}, status=status.HTTP_403_FORBIDDEN)
        qs = (
            Dispute.objects.select_related("reporter", "reservation")
            .filter(
                Q(target=request.user) | Q(reservation__etudiant=request.user)
            )
            .order_by("-created_at")[:100]
        )
        data = []
        for d in qs:
            status_label = (
                "En attente"
                if d.status == DisputeStatus.PENDING
                else "En cours"
                if d.status == DisputeStatus.IN_PROGRESS
                else "Résolu"
            )
            cause = ""
            if d.description.startswith("Cause déclarée:"):
                cause = d.description.split("\n", 1)[0].replace("Cause déclarée:", "").strip()
            data.append(
                {
                    "id": d.id,
                    "title": d.title,
                    "description": d.description,
                    "status": status_label,
                    "status_key": d.status,
                    "created_at": d.created_at,
                    "reporterName": d.reporter.name if d.reporter else "Tuteur",
                    "reservationId": d.reservation_id,
                    "module": d.reservation.module_titre if d.reservation else "",
                    "date": d.reservation.date_label if d.reservation else "",
                    "time": d.reservation.creneau_label if d.reservation else "",
                    "cause": cause,
                }
            )
        return Response(data, status=status.HTTP_200_OK)


class MesSeancesEtudiantView(APIView):
    """
    GET /api/seances/ — séances où l’utilisateur connecté est l’étudiant (JWT).
    Permission : is_student. Tri : plus récentes d’abord.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        qs = (
            Reservation.objects.filter(etudiant=user)
            .select_related("tuteur")
            .order_by("-created_at")
        )
        return Response(SeanceEtudiantSerializer(qs, many=True).data)


class SeanceMeetUrlView(APIView):
    """
    PATCH /api/seances/<id>/meet-url/ — définit ou efface le lien de visio (tuteur uniquement).
    Corps : { "meet_url": "https://meet.google.com/..." } ou { "meet_url": "" } pour effacer.
    """

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        r = get_object_or_404(
            Reservation.objects.select_related("etudiant", "tuteur"),
            pk=pk,
        )
        if request.user.id != r.tuteur_id:
            return Response(
                {"detail": "Seul le tuteur peut modifier le lien de visioconférence."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if r.statut != StatutReservation.CONFIRMED:
            return Response(
                {"detail": "Le lien n’est modifiable que pour une séance confirmée."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if r.format_seance != FormatSeance.ONLINE:
            return Response(
                {"detail": "Le lien de visio ne s’applique qu’aux séances en ligne."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if "meet_url" not in request.data:
            return Response(
                {"detail": "Le champ « meet_url » est requis (chaîne vide pour effacer le lien)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = SeanceMeetUrlPatchSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        url = ser.validated_data.get("meet_url")
        r.meet_url = url if url else None
        r.save(update_fields=["meet_url", "updated_at"])
        r.refresh_from_db()
        return Response(SeanceDetailSerializer(r, context={"request": request}).data)


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
        return Response(SeanceDetailSerializer(r, context={"request": request}).data)


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
            return Response(SeanceDetailSerializer(r, context={"request": request}).data)

        try:
            reservation_fsm.assert_confirmed_to_completed(r.statut)
        except DjangoValidationError as e:
            return Response(
                {"detail": e.messages[0] if e.messages else str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        would_have_both_after = (
            (r.student_session_confirm or request.user.id == r.etudiant_id)
            and (r.tutor_session_confirm or request.user.id == r.tuteur_id)
        )
        if would_have_both_after:
            if r.format_seance == FormatSeance.ONLINE and not (r.meet_url or "").strip():
                return Response(
                    {
                        "detail": "Impossible de clôturer une séance en ligne sans lien de visioconférence "
                        "enregistré par le tuteur.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            d = r.duree_heures
            et_pre = User.objects.select_for_update().get(pk=r.etudiant_id)
            if et_pre.balance_hours < d:
                return Response(
                    {"detail": "Solde étudiant insuffisant pour finaliser cette séance."},
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
        return Response(SeanceDetailSerializer(r, context={"request": request}).data)


def _tutor_avatar_absolute_url(tutor: User, request) -> str | None:
    """URL absolue de la photo de profil du tuteur, ou None."""
    if request is None:
        return None
    f = getattr(tutor, "avatar", None)
    if not f or not getattr(f, "name", None):
        return None
    try:
        return request.build_absolute_uri(f.url)
    except ValueError:
        return None


def _reservation_brief_dict(r: Reservation, *, evaluated: bool = False) -> dict:
    return {
        "id": r.id,
        "module": r.module_titre,
        "date": r.date_label or "",
        "time": r.creneau_label or "",
        "duration": float(r.duree_heures),
        "status": r.statut,
        "format": r.format_seance,
        "evaluated": evaluated,
        "serverBacked": True,
        "meet_url": r.meet_url or None,
    }


def build_mes_tuteurs_etudiant(user: User, request=None) -> list:
    """Agrège les réservations par tuteur (hors annulées) pour la page « Mes tutorats »."""
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
            if x.statut in (StatutReservation.PENDING, StatutReservation.CONFIRMED)
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
                "avatarUrl": _tutor_avatar_absolute_url(t, request),
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
        return Response(build_mes_tuteurs_etudiant(request.user, request))


class EvaluationSeanceCreateView(APIView):
    """
    POST /api/evaluations/ — corps : { "reservation", "note" (1–5), "commentaire" (optionnel) }.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
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
            User.objects.exclude(platform_admin_q()),
            pk=pk,
        )
        qs = (
            EvaluationSeance.objects.filter(tuteur=tutor)
            .select_related("reservation")
            .order_by("-created_at")[:100]
        )
        return Response(EvaluationSeancePublicSerializer(qs, many=True).data)
