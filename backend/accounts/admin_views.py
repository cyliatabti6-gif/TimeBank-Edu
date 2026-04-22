from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Dispute,
    DisputeStatus,
    EvaluationSeance,
    ModulePropose,
    PlatformSettings,
    Reservation,
    StatutReservation,
    User,
)
from .utils import is_platform_admin


class IsPlatformAdminPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and is_platform_admin(request.user))


def _initials(name: str) -> str:
    parts = [p for p in (name or "").split() if p]
    if not parts:
        return "U"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return f"{parts[0][0]}{parts[-1][0]}".upper()


def _rel_time(dt):
    if not dt:
        return "—"
    delta = timezone.now() - dt
    mins = int(delta.total_seconds() // 60)
    if mins < 1:
        return "À l'instant"
    if mins < 60:
        return f"Il y a {mins} min"
    hours = mins // 60
    if hours < 24:
        return f"Il y a {hours}h"
    days = hours // 24
    return f"Il y a {days} jour{'s' if days > 1 else ''}"


class AdminUsersView(APIView):
    permission_classes = [IsPlatformAdminPermission]

    def get(self, request):
        qs = User.objects.order_by("-date_joined")
        data = []
        for u in qs:
            if is_platform_admin(u):
                role_label = "Admin"
            elif u.is_tutor and not u.is_student:
                role_label = "Tuteur"
            elif u.is_student and not u.is_tutor:
                role_label = "Étudiant"
            else:
                role_label = "Étudiant"
            data.append(
                {
                    "id": u.id,
                    "name": u.name,
                    "email": u.email,
                    "role": role_label,
                    "status": "Actif" if u.is_active else "Suspendu",
                    "date": timezone.localtime(u.date_joined).strftime("%d/%m/%Y"),
                    "avatar": _initials(u.name),
                    "is_active": u.is_active,
                }
            )
        return Response(data)

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        name = (request.data.get("name") or "").strip()
        if not email or not name:
            return Response({"detail": "name et email sont requis."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "Cet e-mail existe déjà."}, status=status.HTTP_400_BAD_REQUEST)
        u = User(
            email=email,
            name=name,
            filiere=(request.data.get("filiere") or "Informatique"),
            niveau=(request.data.get("niveau") or "L1"),
            is_student=bool(request.data.get("is_student", True)),
            is_tutor=bool(request.data.get("is_tutor", True)),
        )
        u.set_password(str(request.data.get("password") or "ChangeMe123!"))
        u.save()
        return Response({"id": u.id}, status=status.HTTP_201_CREATED)


class AdminUserDetailView(APIView):
    permission_classes = [IsPlatformAdminPermission]

    def patch(self, request, pk):
        u = get_object_or_404(User, pk=pk)
        for field in ("name", "is_active", "is_student", "is_tutor"):
            if field in request.data:
                setattr(u, field, request.data[field])
        u.save()
        return Response({"detail": "ok"})

    def delete(self, request, pk):
        u = get_object_or_404(User, pk=pk)
        u.is_active = False
        u.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminModulesView(APIView):
    permission_classes = [IsPlatformAdminPermission]

    def get(self, request):
        qs = ModulePropose.objects.select_related("tuteur").order_by("-created_at")
        data = [
            {
                "id": m.id,
                "title": m.titre,
                "tutor": m.tuteur.name,
                "category": m.filiere_cible,
                "level": m.niveau,
                "status": m.statut,
                "actif": m.actif,
            }
            for m in qs
        ]
        return Response(data)

    def post(self, request):
        tutor_id = request.data.get("tutor_id")
        tutor = get_object_or_404(User, pk=tutor_id) if tutor_id else request.user
        m = ModulePropose.objects.create(
            titre=(request.data.get("title") or "Nouveau module").strip(),
            niveau=(request.data.get("level") or "L1"),
            tuteur=tutor,
            filiere_cible=(request.data.get("category") or tutor.filiere or "Informatique"),
            statut=request.data.get("status") or "pending",
            planning="",
            description="",
            duree_label="",
            tags=[],
            creneaux=[],
            actif=True,
        )
        return Response({"id": m.id}, status=status.HTTP_201_CREATED)


class AdminModuleDetailView(APIView):
    permission_classes = [IsPlatformAdminPermission]

    def patch(self, request, pk):
        m = get_object_or_404(ModulePropose, pk=pk)
        if "status" in request.data:
            m.statut = request.data["status"]
        if "actif" in request.data:
            m.actif = bool(request.data["actif"])
        m.save()
        return Response({"detail": "ok"})

    def delete(self, request, pk):
        m = get_object_or_404(ModulePropose, pk=pk)
        m.actif = False
        m.save(update_fields=["actif"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminTransactionsView(APIView):
    permission_classes = [IsPlatformAdminPermission]

    def get(self, request):
        qs = Reservation.objects.select_related("etudiant", "tuteur").filter(statut=StatutReservation.COMPLETED).order_by("-updated_at")[:500]
        rows = []
        total = Decimal("0")
        for r in qs:
            d = Decimal(r.duree_heures or 0)
            total += d
            date_label = timezone.localtime(r.updated_at).strftime("%d/%m/%Y") if r.updated_at else "—"
            rows.append(
                {
                    "id": f"{r.id}-out",
                    "date": date_label,
                    "from": r.tuteur.name,
                    "fromAvatar": _initials(r.tuteur.name),
                    "to": r.etudiant.name,
                    "toAvatar": _initials(r.etudiant.name),
                    "hours": float(d),
                    "session": f"#{r.id}",
                    "type": "Donnée",
                }
            )
            rows.append(
                {
                    "id": f"{r.id}-in",
                    "date": date_label,
                    "from": r.etudiant.name,
                    "fromAvatar": _initials(r.etudiant.name),
                    "to": r.tuteur.name,
                    "toAvatar": _initials(r.tuteur.name),
                    "hours": float(d),
                    "session": f"#{r.id}",
                    "type": "Reçue",
                }
            )
        return Response(
            {
                "items": rows,
                "summary": {
                    "total_hours": float(total),
                    "given_hours": float(total),
                    "received_hours": float(total),
                    "open_disputes": Dispute.objects.exclude(status=DisputeStatus.RESOLVED).count(),
                },
            }
        )


def _dispute_to_ui(d: Dispute):
    status_label = {
        DisputeStatus.PENDING: "En attente",
        DisputeStatus.IN_PROGRESS: "En cours",
        DisputeStatus.RESOLVED: "Résolu",
    }.get(d.status, "En attente")
    return {
        "id": d.id,
        "title": d.title,
        "desc": (d.description or "").strip() or "—",
        "sub": (
            f"Séance #{d.reservation_id}" if d.reservation_id else "Sans séance associée"
        ),
        "time": _rel_time(d.created_at),
        "status": status_label,
        "status_key": d.status,
        "statusCls": "badge-orange" if d.status == DisputeStatus.PENDING else "badge-blue" if d.status == DisputeStatus.IN_PROGRESS else "badge-green",
    }


class AdminDisputesView(APIView):
    permission_classes = [IsPlatformAdminPermission]

    def get(self, request):
        qs = Dispute.objects.select_related("reporter", "target", "reservation").order_by("-created_at")
        return Response([_dispute_to_ui(d) for d in qs])

    def post(self, request):
        title = (request.data.get("title") or "").strip()
        if not title:
            return Response({"detail": "title requis."}, status=status.HTTP_400_BAD_REQUEST)
        d = Dispute.objects.create(
            title=title,
            description=(request.data.get("description") or "").strip(),
            reporter_id=request.data.get("reporter_id"),
            target_id=request.data.get("target_id"),
            reservation_id=request.data.get("reservation_id"),
            status=request.data.get("status") or DisputeStatus.PENDING,
        )
        return Response(_dispute_to_ui(d), status=status.HTTP_201_CREATED)


class AdminDisputeDetailView(APIView):
    permission_classes = [IsPlatformAdminPermission]

    def patch(self, request, pk):
        d = get_object_or_404(Dispute, pk=pk)
        for field in ("title", "description", "status", "resolution_note"):
            if field in request.data:
                setattr(d, field, request.data[field])
        d.save()
        return Response(_dispute_to_ui(d))

    def delete(self, request, pk):
        d = get_object_or_404(Dispute, pk=pk)
        d.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminPlatformSettingsView(APIView):
    permission_classes = [IsPlatformAdminPermission]

    def _get_singleton(self):
        obj = PlatformSettings.objects.first()
        if obj:
            return obj
        return PlatformSettings.objects.create()

    def get(self, request):
        s = self._get_singleton()
        return Response(
            {
                "platformName": s.platform_name,
                "email": s.contact_email,
                "timezone": s.timezone_label,
                "hoursGiven": s.hours_given_label,
                "hoursReceived": s.hours_received_label,
                "initialStudentBalance": str(s.initial_student_balance),
                "initialTutorScore": str(s.initial_tutor_score),
                "minSessionDuration": s.min_session_duration_label,
            }
        )

    def patch(self, request):
        s = self._get_singleton()
        mapping = {
            "platformName": "platform_name",
            "email": "contact_email",
            "timezone": "timezone_label",
            "hoursGiven": "hours_given_label",
            "hoursReceived": "hours_received_label",
            "initialStudentBalance": "initial_student_balance",
            "initialTutorScore": "initial_tutor_score",
            "minSessionDuration": "min_session_duration_label",
        }
        for k, attr in mapping.items():
            if k in request.data:
                setattr(s, attr, request.data[k])
        s.save()
        return self.get(request)


class AdminStatsView(APIView):
    permission_classes = [IsPlatformAdminPermission]

    def get(self, request):
        now = timezone.now()
        six_months_ago = now - timedelta(days=180)

        total_users = User.objects.count()
        total_modules = ModulePropose.objects.filter(actif=True).count()
        total_hours = Reservation.objects.filter(statut=StatutReservation.COMPLETED).aggregate(v=Sum("duree_heures"))["v"] or Decimal("0")
        open_disputes = Dispute.objects.exclude(status=DisputeStatus.RESOLVED).count()
        avg_score = User.objects.filter(is_tutor=True).aggregate(v=Sum("score"), c=Count("id"))
        satisfaction = 0
        if avg_score["c"]:
            satisfaction = int(round((float(avg_score["v"]) / float(avg_score["c"])) / 5 * 100))

        users_by_month = (
            User.objects.filter(date_joined__gte=six_months_ago)
            .annotate(month=TruncMonth("date_joined"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )
        completed_by_month = (
            Reservation.objects.filter(updated_at__gte=six_months_ago, statut=StatutReservation.COMPLETED)
            .annotate(month=TruncMonth("updated_at"))
            .values("month")
            .annotate(
                tutorats=Count("id"),
                heures=Sum("duree_heures"),
            )
            .order_by("month")
        )
        u_map = {x["month"]: x["count"] for x in users_by_month}
        c_map = {x["month"]: x for x in completed_by_month}
        months = sorted(set(list(u_map.keys()) + list(c_map.keys())))
        monthly = []
        for m in months:
            row = c_map.get(m, {})
            monthly.append(
                {
                    "month": m.strftime("%b"),
                    "utilisateurs": int(u_map.get(m, 0)),
                    "tutorats": int(row.get("tutorats", 0) or 0),
                    "heures": float(row.get("heures", 0) or 0),
                }
            )

        role_data = [
            {"name": "Étudiants", "value": User.objects.filter(is_student=True, is_staff=False, role="user").count()},
            {"name": "Tuteurs", "value": User.objects.filter(is_tutor=True, is_staff=False, role="user").count()},
            {"name": "Admins", "value": User.objects.filter(Q(is_staff=True) | Q(role="admin")).count()},
        ]

        top_modules = (
            Reservation.objects.filter(statut=StatutReservation.COMPLETED)
            .values("module_titre")
            .annotate(sessions=Count("id"))
            .order_by("-sessions")[:6]
        )
        top_modules_data = [{"name": x["module_titre"], "sessions": x["sessions"]} for x in top_modules]

        recent_activity = []
        for u in User.objects.order_by("-date_joined")[:4]:
            recent_activity.append(
                {
                    "icon": "👤",
                    "color": "bg-green-100",
                    "text": "Nouvel utilisateur",
                    "sub": f"{u.name} a rejoint la plateforme",
                    "time": _rel_time(u.date_joined),
                }
            )
        for m in ModulePropose.objects.select_related("tuteur").order_by("-created_at")[:4]:
            recent_activity.append(
                {
                    "icon": "📚",
                    "color": "bg-blue-100",
                    "text": "Nouveau module",
                    "sub": f"{m.titre} - {m.niveau} par {m.tuteur.name}",
                    "time": _rel_time(m.created_at),
                }
            )
        recent_activity = recent_activity[:8]

        recent_disputes = [
            {
                "user": d.reporter.name if d.reporter else "Utilisateur",
                "issue": d.title,
                "status": "En attente" if d.status == DisputeStatus.PENDING else "En cours" if d.status == DisputeStatus.IN_PROGRESS else "Résolu",
                "time": _rel_time(d.created_at),
            }
            for d in Dispute.objects.select_related("reporter").order_by("-created_at")[:5]
        ]

        return Response(
            {
                "kpis": {
                    "users": total_users,
                    "modules": total_modules,
                    "hours": float(total_hours),
                    "open_disputes": open_disputes,
                    "satisfaction": satisfaction,
                },
                "monthly": monthly,
                "roleData": role_data,
                "topModules": top_modules_data,
                "recentActivity": recent_activity,
                "recentDisputes": recent_disputes,
            }
        )
