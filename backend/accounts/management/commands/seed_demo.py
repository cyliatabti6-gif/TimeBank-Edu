"""
Jeu de données de démonstration (utilisateurs, modules, réservations, évaluations, messagerie).

Usage (depuis le dossier backend) :
  python manage.py seed_demo
  python manage.py seed_demo --flush   # supprime d’abord tout compte *@seed-demo.local et données liées
  SEED_DEMO_PASSWORD=MonMot python manage.py seed_demo

Sans --flush, la commande est idempotente : comptes et objets marqués (emails @seed-demo.local,
creneau_ref préfixé seed-demo:) sont créés ou mis à jour sans doublon utile.

Mot de passe par défaut des comptes démo : valeur de l’env SEED_DEMO_PASSWORD ou « DemoSeed2026! »
(uniquement pour le développement local).
"""

from __future__ import annotations

import os
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from accounts.models import (
    EvaluationSeance,
    FormatSeance,
    ModulePropose,
    Niveau,
    PlatformRole,
    Reservation,
    StatutModule,
    StatutReservation,
    recalc_tutor_review_stats,
)
from messenger.models import Conversation, Message

User = get_user_model()

SEED_EMAIL_SUFFIX = "@seed-demo.local"
SEED_RES_PREFIX = "seed-demo:res"
DEFAULT_DEMO_PASSWORD = "DemoSeed2026!"

# (index 1-based, nom, filière, niveau, is_student, is_tutor, role)
USER_ROWS: list[tuple[int, str, str, str, bool, bool, str]] = [
    (1, "Yasmine Benali", "Informatique", Niveau.L2, True, True, PlatformRole.USER),
    (2, "Omar Khelifi", "Informatique", Niveau.L3, True, True, PlatformRole.USER),
    (3, "Sarah El Idrissi", "Mathématiques", Niveau.L1, True, False, PlatformRole.USER),
    (4, "Karim Fassi", "Informatique", Niveau.M1, True, True, PlatformRole.USER),
    (5, "Nadia Tazi", "Génie civil", Niveau.L3, True, True, PlatformRole.USER),
    (6, "Mehdi Cherkaoui", "Informatique", Niveau.L2, False, True, PlatformRole.USER),
    (7, "Houda Bennis", "Physique", Niveau.M2, False, True, PlatformRole.USER),
    (8, "Amine Radi", "Informatique", Niveau.L1, True, False, PlatformRole.USER),
    (9, "Leila Amrani", "Informatique", Niveau.L3, True, True, PlatformRole.USER),
    (10, "Hicham Zerouali", "Électronique", Niveau.M1, True, True, PlatformRole.USER),
    (11, "Imane Sabri", "Informatique", Niveau.L2, True, True, PlatformRole.USER),
    (12, "Anas Berrada", "Mathématiques", Niveau.DOCTORAT, True, True, PlatformRole.USER),
    (13, "Fatima Zahra Alaoui", "Informatique", Niveau.L3, True, False, PlatformRole.USER),
    (14, "Redouane Majid", "Réseaux", Niveau.M2, True, True, PlatformRole.USER),
    (15, "Salma Idrissi", "Informatique", Niveau.L2, True, True, PlatformRole.USER),
    (16, "Driss Ouazzani", "Informatique", Niveau.L1, True, False, PlatformRole.USER),
    (17, "Meryem Akhdar", "Data science", Niveau.M1, True, True, PlatformRole.USER),
    (18, "Bilal Saïd", "Informatique", Niveau.L3, True, True, PlatformRole.USER),
    (19, "Kenza Mourad", "Linguistique", Niveau.L2, True, False, PlatformRole.USER),
    (20, "Admin Démo", "Informatique", Niveau.M1, True, True, PlatformRole.ADMIN),
    (21, "Rachid Fettah", "Cybersécurité", Niveau.M2, True, True, PlatformRole.USER),
    (22, "Siham Jaafari", "Informatique", Niveau.L3, True, True, PlatformRole.USER),
]

MODULE_SEEDS: list[dict] = [
    {
        "key": "algo-l2",
        "titre": "Algorithmique et complexité",
        "niveau": Niveau.L2,
        "tuteur_idx": 6,
        "format_seance": FormatSeance.ONLINE,
        "filiere_cible": "Informatique",
        "planning": "Lun, Mer 18h–20h",
        "description": "Notions de complexité, tris, structures de base.",
        "tags": ["algo", "complexité"],
        "creneaux": [
            {"id": "sd-a1", "libelle": "Lundi 18h – 20h", "date": "21/04/2026", "disponible": True},
            {"id": "sd-a2", "libelle": "Mercredi 18h – 20h", "date": "23/04/2026", "disponible": True},
        ],
    },
    {
        "key": "ana-l1",
        "titre": "Analyse pour informaticiens",
        "niveau": Niveau.L1,
        "tuteur_idx": 7,
        "format_seance": FormatSeance.PRESENTIEL,
        "filiere_cible": "Informatique",
        "planning": "Mar, Jeu 10h–12h",
        "description": "Suites, limites, fonctions usuelles.",
        "tags": ["math", "L1"],
        "creneaux": [
            {"id": "sd-an1", "libelle": "Mardi 10h – 12h", "date": "22/04/2026", "disponible": True},
            {"id": "sd-an2", "libelle": "Jeudi 10h – 12h", "date": "24/04/2026", "disponible": False},
        ],
    },
    {
        "key": "bdd-l3",
        "titre": "Bases de données relationnelles",
        "niveau": Niveau.L3,
        "tuteur_idx": 6,
        "format_seance": FormatSeance.PRESENTIEL,
        "filiere_cible": "Informatique",
        "planning": "Mer 14h–17h",
        "description": "SQL, normalisation, transactions.",
        "tags": ["SQL", "BD"],
        "creneaux": [
            {"id": "sd-b1", "libelle": "Mercredi 14h – 17h", "date": "23/04/2026", "disponible": True},
        ],
    },
    {
        "key": "py-l2",
        "titre": "Python avancé",
        "niveau": Niveau.L2,
        "tuteur_idx": 7,
        "format_seance": FormatSeance.ONLINE,
        "filiere_cible": "Informatique",
        "planning": "Ven 16h–19h",
        "description": "Générateurs, décorateurs, tests.",
        "tags": ["Python"],
        "creneaux": [
            {"id": "sd-p1", "libelle": "Vendredi 16h – 19h", "date": "25/04/2026", "disponible": True},
        ],
    },
    {
        "key": "web-m1",
        "titre": "Programmation web (Django / REST)",
        "niveau": Niveau.M1,
        "tuteur_idx": 4,
        "format_seance": FormatSeance.ONLINE,
        "filiere_cible": "Informatique",
        "planning": "Lun, Jeu 14h–18h",
        "description": "APIs REST, auth JWT, bonnes pratiques.",
        "tags": ["web", "Django"],
        "creneaux": [
            {"id": "sd-w1", "libelle": "Lundi 14h – 18h", "date": "21/04/2026", "disponible": True},
            {"id": "sd-w2", "libelle": "Jeudi 14h – 18h", "date": "24/04/2026", "disponible": True},
        ],
    },
    {
        "key": "reseaux-m2",
        "titre": "Réseaux et sécurité",
        "niveau": Niveau.M2,
        "tuteur_idx": 21,
        "format_seance": FormatSeance.PRESENTIEL,
        "filiere_cible": "Réseaux",
        "planning": "Sam 9h–12h",
        "description": "TCP/IP, pare-feu, introduction VPN.",
        "tags": ["réseaux"],
        "creneaux": [
            {"id": "sd-r1", "libelle": "Samedi 9h – 12h", "date": "26/04/2026", "disponible": True},
        ],
    },
]

# (ref_suffix, etudiant_idx, tuteur_idx, module_key|None, statut, format_seance, duree, online_meet or "")
RESERVATION_SEEDS: list[tuple[str, int, int, str | None, str, str, Decimal, str]] = [
    ("01", 1, 6, "algo-l2", StatutReservation.PENDING, FormatSeance.ONLINE, Decimal("2"), "meet"),
    ("02", 3, 7, "ana-l1", StatutReservation.CONFIRMED, FormatSeance.PRESENTIEL, Decimal("1.5"), ""),
    ("03", 8, 6, "algo-l2", StatutReservation.CONFIRMED, FormatSeance.ONLINE, Decimal("1"), "meet"),
    ("04", 15, 4, "web-m1", StatutReservation.COMPLETED, FormatSeance.ONLINE, Decimal("2"), "meet"),
    ("05", 11, 6, "bdd-l3", StatutReservation.COMPLETED, FormatSeance.PRESENTIEL, Decimal("2"), ""),
    ("06", 9, 7, "py-l2", StatutReservation.COMPLETED, FormatSeance.ONLINE, Decimal("1.5"), "meet"),
    ("07", 17, 21, "reseaux-m2", StatutReservation.COMPLETED, FormatSeance.PRESENTIEL, Decimal("3"), ""),
    ("08", 2, 6, "bdd-l3", StatutReservation.CANCELLED, FormatSeance.PRESENTIEL, Decimal("2"), ""),
    ("09", 18, 7, "py-l2", StatutReservation.PENDING, FormatSeance.ONLINE, Decimal("2"), "meet"),
    ("10", 5, 4, "web-m1", StatutReservation.PENDING, FormatSeance.ONLINE, Decimal("2"), "meet"),
]

# réservation ref -> (note, commentaire) pour les COMPLETED uniquement
EVAL_SEEDS: dict[str, tuple[int, str]] = {
    "04": (5, "Très clair, exemples utiles."),
    "05": (4, "Bon cours, un peu rapide sur les jointures."),
    "06": (5, "Excellente pédagogie."),
    "07": (4, "Contenu dense, bien organisé."),
}


def _email(idx: int) -> str:
    return f"demo{idx:02d}{SEED_EMAIL_SUFFIX}"


def _flush_seed_data() -> None:
    """Supprime les comptes *@seed-demo.local (CASCADE : modules, réservations, messages, etc.)."""
    User.objects.filter(email__endswith=SEED_EMAIL_SUFFIX).delete()
    Conversation.objects.annotate(pc=Count("participants"), mc=Count("messages")).filter(
        pc=0, mc=0
    ).delete()


def _get_or_create_dm(u1: User, u2: User) -> Conversation:
    for c in Conversation.objects.filter(participants=u1).filter(participants=u2):
        if c.participants.count() == 2:
            return c
    conv = Conversation.objects.create()
    conv.participants.add(u1, u2)
    return conv


def _meet_url(kind: str) -> str | None:
    if kind == "meet":
        return "https://meet.google.com/abc-defg-hij"
    return None


class Command(BaseCommand):
    help = "Crée un jeu de données démo (TimeBank) : utilisateurs @seed-demo.local, modules, réservations, messagerie."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Supprime d’abord tous les comptes *@seed-demo.local et les objets associés, puis recrée le jeu.",
        )

    def handle(self, *args, **options):
        password = os.environ.get("SEED_DEMO_PASSWORD", DEFAULT_DEMO_PASSWORD)
        if password == DEFAULT_DEMO_PASSWORD:
            self.stdout.write(
                self.style.WARNING(
                    f"Mot de passe démo : défaut « {DEFAULT_DEMO_PASSWORD} » "
                    f"(définir SEED_DEMO_PASSWORD pour personnaliser)."
                )
            )

        do_flush = options["flush"]

        if do_flush:
            with transaction.atomic():
                _flush_seed_data()
            self.stdout.write(self.style.WARNING("Données seed précédentes supprimées."))

        with transaction.atomic():
            users: dict[int, User] = {}
            for idx, name, fil, niv, is_st, is_tu, role in USER_ROWS:
                u, created = User.objects.update_or_create(
                    email=_email(idx),
                    defaults={
                        "name": name,
                        "filiere": fil,
                        "niveau": niv,
                        "is_student": is_st,
                        "is_tutor": is_tu,
                        "role": role,
                        "description": "Compte de démonstration seed_demo.",
                        "is_staff": role == PlatformRole.ADMIN,
                        "is_superuser": False,
                    },
                )
                if created or do_flush:
                    u.set_password(password)
                    u.save(update_fields=["password"])
                users[idx] = u

            modules_by_key: dict[str, ModulePropose] = {}
            for m in MODULE_SEEDS:
                tutor = users[m["tuteur_idx"]]
                obj, _ = ModulePropose.objects.update_or_create(
                    titre=m["titre"],
                    niveau=m["niveau"],
                    tuteur=tutor,
                    defaults={
                        "filiere_cible": m["filiere_cible"],
                        "format_seance": m["format_seance"],
                        "planning": m["planning"],
                        "description": m["description"],
                        "duree_label": "2 h",
                        "tags": m["tags"],
                        "nombre_avis": 0,
                        "statut": StatutModule.PUBLISHED,
                        "creneaux": m["creneaux"],
                        "actif": True,
                    },
                )
                modules_by_key[m["key"]] = obj

            now = timezone.now()
            for (
                suf,
                ei,
                ti,
                mkey,
                statut,
                fmt,
                duree,
                meet_kind,
            ) in RESERVATION_SEEDS:
                etu, tut = users[ei], users[ti]
                if etu.id == tut.id:
                    raise CommandError(f"Seed incohérent : même utilisateur pour la réservation {suf}")
                mod = modules_by_key[mkey] if mkey else None
                ref = f"{SEED_RES_PREFIX}:{suf}"
                meet = _meet_url(meet_kind)
                if fmt == FormatSeance.PRESENTIEL:
                    meet = None
                slot_start = now + timedelta(days=int(suf))
                slot_end = slot_start + timedelta(hours=float(duree))

                res, _ = Reservation.objects.update_or_create(
                    creneau_ref=ref,
                    defaults={
                        "etudiant": etu,
                        "tuteur": tut,
                        "module_propose": mod,
                        "module_titre": mod.titre if mod else "Séance personnalisée",
                        "date_label": slot_start.strftime("%d/%m/%Y"),
                        "creneau_label": "Créneau démo",
                        "duree_heures": duree,
                        "format_seance": fmt,
                        "statut": statut,
                        "message": "Demande générée par seed_demo.",
                        "student_session_confirm": statut == StatutReservation.COMPLETED,
                        "tutor_session_confirm": statut
                        in (StatutReservation.CONFIRMED, StatutReservation.COMPLETED),
                        "meet_url": meet,
                        "slot_start": slot_start,
                        "slot_end": slot_end,
                    },
                )
                res.full_clean()
                res.save()

                if statut == StatutReservation.COMPLETED and suf in EVAL_SEEDS:
                    note, comm = EVAL_SEEDS[suf]
                    EvaluationSeance.objects.update_or_create(
                        reservation=res,
                        defaults={
                            "etudiant": etu,
                            "tuteur": tut,
                            "note": note,
                            "commentaire": comm,
                        },
                    )

            for t_idx in {6, 7, 4, 21}:
                recalc_tutor_review_stats(users[t_idx])

            # Messagerie : 3 conversations si pas encore de messages
            conv_specs = [
                (1, 2, [
                    (users[1], "Salut Omar, tu as un créneau cette semaine ?"),
                    (users[2], "Oui, mercredi soir ça peut le faire."),
                    (users[1], "Parfait, je te confirme sur la plateforme."),
                ]),
                (3, 8, [
                    (users[3], "Tu as réussi le partiel d’analyse ?"),
                    (users[8], "Oui, avec un peu de révision supplémentaire."),
                ]),
                (15, 22, [
                    (users[15], "Merci pour les fiches Python !"),
                    (users[22], "Avec plaisir, n’hésite pas si tu bloques sur les décorateurs."),
                    (users[15], "Je regarde ça et je te redis."),
                ]),
            ]
            for a, b, msgs in conv_specs:
                conv = _get_or_create_dm(users[a], users[b])
                if Message.objects.filter(conversation=conv).exists():
                    continue
                for sender, text in msgs:
                    Message.objects.create(conversation=conv, sender=sender, text=text)

        n_users = len(USER_ROWS)
        self.stdout.write(
            self.style.SUCCESS(
                f"seed_demo terminé : {n_users} comptes ({SEED_EMAIL_SUFFIX}), "
                f"{len(MODULE_SEEDS)} modules, {len(RESERVATION_SEEDS)} réservations, messagerie. "
                f"Connexion exemple : {_email(1)} / (mot de passe ci-dessus)."
            )
        )
