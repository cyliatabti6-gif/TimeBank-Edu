"""
Jeu de données pour exactement 2 utilisateurs existants (tuteur + étudiant).
Ne crée jamais de User.

Usage (depuis backend/) :
  python manage.py seed_two_users
  python manage.py seed_two_users --replace
  python manage.py seed_two_users --tutor-id 3 --student-id 7
  python manage.py seed_two_users --skip-messenger

Par défaut : les 2 premiers utilisateurs par id (le plus petit id = tuteur, l’autre = étudiant).
"""

from __future__ import annotations

import random
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import (
    EvaluationSeance,
    FormatSeance,
    ModulePropose,
    Niveau,
    Reservation,
    StatutModule,
    StatutReservation,
    recalc_tutor_review_stats,
)
from messenger.models import Conversation, Message

User = get_user_model()

SEED_MARKER = "[seed:two-users]"
REF_PREFIX = "two-user-seed:"

# 8 modules (entre 5 et 10)
MODULE_SPECS: list[dict] = [
    {
        "titre": "Algorithmique et structures de données",
        "niveau": Niveau.L2,
        "format_seance": FormatSeance.ONLINE,
        "planning": "Lun, Mer 18h–20h",
        "duree_label": "2 h",
        "tags": ["algo", "structures"],
    },
    {
        "titre": "Analyse et probabilités",
        "niveau": Niveau.L1,
        "format_seance": FormatSeance.PRESENTIEL,
        "planning": "Mar, Jeu 10h–12h",
        "duree_label": "1 h 30",
        "tags": ["math", "L1"],
    },
    {
        "titre": "Bases de données relationnelles",
        "niveau": Niveau.L3,
        "format_seance": FormatSeance.PRESENTIEL,
        "planning": "Mer, Ven 14h–17h",
        "duree_label": "2 h",
        "tags": ["SQL", "BD"],
    },
    {
        "titre": "Python pour la science des données",
        "niveau": Niveau.L3,
        "format_seance": FormatSeance.ONLINE,
        "planning": "Ven 16h–19h",
        "duree_label": "3 h",
        "tags": ["Python", "pandas"],
    },
    {
        "titre": "Programmation web (Django / API REST)",
        "niveau": Niveau.M1,
        "format_seance": FormatSeance.ONLINE,
        "planning": "Lun, Jeu 14h–18h",
        "duree_label": "2 h",
        "tags": ["web", "REST"],
    },
    {
        "titre": "Réseaux et sécurité",
        "niveau": Niveau.M2,
        "format_seance": FormatSeance.PRESENTIEL,
        "planning": "Sam 9h–12h",
        "duree_label": "3 h",
        "tags": ["réseaux", "sécurité"],
    },
    {
        "titre": "Théorie des langages",
        "niveau": Niveau.L3,
        "format_seance": FormatSeance.ONLINE,
        "planning": "Mar 20h–22h",
        "duree_label": "2 h",
        "tags": ["TLA", "automates"],
    },
    {
        "titre": "Introduction à la recherche opérationnelle",
        "niveau": Niveau.M1,
        "format_seance": FormatSeance.PRESENTIEL,
        "planning": "Mer 10h–12h",
        "duree_label": "2 h",
        "tags": ["RO", "optimisation"],
    },
]

MEET_URL_OK = "https://meet.google.com/abc-defg-hij"

# 40 réservations : ~40 % completed, ~30 % pending, ~30 % cancelled
RESERVATION_TOTAL = 40
STATUS_MIX = (
    [StatutReservation.COMPLETED] * 16
    + [StatutReservation.PENDING] * 12
    + [StatutReservation.CANCELLED] * 12
)

CRENEAU_LABELS = [
    "Lundi 18h – 20h",
    "Mardi 10h – 12h",
    "Mercredi 14h – 16h",
    "Jeudi 9h – 11h",
    "Vendredi 16h – 18h",
    "Samedi 9h – 12h",
]

DUREES = [
    Decimal("1"),
    Decimal("1.5"),
    Decimal("2"),
    Decimal("2.5"),
]

EVAL_COMMENTS: list[tuple[int, str]] = [
    (5, "Très clair, exemples concrets et rythme adapté."),
    (4, "Bon cours ; j’aurais aimé plus d’exercices sur les jointures."),
    (5, "Excellente pédagogie, je recommande."),
    (3, "Correct mais un peu rapide sur la fin."),
    (4, "Contenu dense, bien structuré."),
    (5, "Patience et très bonne explication des notions difficiles."),
    (4, "Séance utile, petit souci de son en visio au début."),
    (3, "Intéressant mais il manquait une fiche récap."),
    (5, "Au-delà de mes attentes, merci beaucoup."),
    (4, "Très pro, rendez-vous à l’heure."),
    (5, "J’ai progressé rapidement sur ce chapitre."),
    (4, "Bon équilibre théorie / pratique."),
    (3, "Un peu difficile à suivre sur les notations."),
    (5, "Super ambiance, j’ai repris confiance."),
    (4, "Cours solide, je referai appel."),
    (5, "Explications limpides, je valide."),
]


def _creneaux_for_index(i: int) -> list[dict]:
    base_day = 14 + (i % 12)
    return [
        {
            "id": f"tu-{i}-c1",
            "libelle": CRENEAU_LABELS[i % len(CRENEAU_LABELS)],
            "date": f"{base_day:02d}/04/2026",
            "disponible": True,
        },
        {
            "id": f"tu-{i}-c2",
            "libelle": CRENEAU_LABELS[(i + 2) % len(CRENEAU_LABELS)],
            "date": f"{(base_day + 2) % 28 + 1:02d}/05/2026",
            "disponible": i % 3 != 0,
        },
    ]


def _delete_seed_rows(tutor: User) -> tuple[int, int]:
    """Supprime réservations + évaluations marquées ; modules marqués."""
    res_qs = Reservation.objects.filter(creneau_ref__startswith=REF_PREFIX)
    n_res = res_qs.count()
    res_qs.delete()
    mod_qs = ModulePropose.objects.filter(tuteur=tutor, description__contains=SEED_MARKER)
    n_mod = mod_qs.count()
    mod_qs.delete()
    return n_res, n_mod


def _get_or_create_dm(u1: User, u2: User) -> Conversation:
    for c in Conversation.objects.filter(participants=u1).filter(participants=u2):
        if c.participants.count() == 2:
            return c
    conv = Conversation.objects.create()
    conv.participants.add(u1, u2)
    return conv


class Command(BaseCommand):
    help = (
        "Remplit la base avec modules, réservations et évaluations en n’utilisant "
        "que deux utilisateurs existants (aucune création de compte)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--replace",
            action="store_true",
            help="Supprime d’abord les données créées par cette commande (même préfixe / marqueur).",
        )
        parser.add_argument(
            "--tutor-id",
            type=int,
            default=None,
            help="ID du compte tuteur (sinon : utilisateur avec le plus petit id).",
        )
        parser.add_argument(
            "--student-id",
            type=int,
            default=None,
            help="ID du compte étudiant (sinon : l’autre des deux utilisateurs).",
        )
        parser.add_argument(
            "--skip-messenger",
            action="store_true",
            help="Ne pas créer de conversation ni de messages.",
        )

    def handle(self, *args, **options):
        all_users = list(User.objects.order_by("id"))
        if len(all_users) < 2:
            raise CommandError(
                "Il faut exactement au moins 2 utilisateurs en base. "
                f"Actuellement : {len(all_users)}."
            )

        tid = options["tutor_id"]
        sid = options["student_id"]
        if tid is not None and sid is not None:
            try:
                tutor = User.objects.get(pk=tid)
                student = User.objects.get(pk=sid)
            except User.DoesNotExist as e:
                raise CommandError(f"Utilisateur introuvable : {e}") from e
        elif tid is not None or sid is not None:
            raise CommandError("Fournir les deux --tutor-id et --student-id, ou aucun des deux.")
        else:
            tutor, student = all_users[0], all_users[1]

        if tutor.pk == student.pk:
            raise CommandError("Le tuteur et l’étudiant doivent être deux comptes distincts.")

        if not options["replace"]:
            if Reservation.objects.filter(creneau_ref__startswith=REF_PREFIX).exists():
                raise CommandError(
                    "Des données seed_two_users existent déjà (préfixe de réservation "
                    f"« {REF_PREFIX} »). Relancez avec --replace pour les supprimer et régénérer."
                )
            if ModulePropose.objects.filter(tuteur=tutor, description__contains=SEED_MARKER).exists():
                raise CommandError(
                    "Des modules seed_two_users existent déjà. Relancez avec --replace pour tout réinitialiser."
                )

        if options["replace"]:
            with transaction.atomic():
                n_res, n_mod = _delete_seed_rows(tutor)
            self.stdout.write(
                self.style.WARNING(f"Données seed supprimées : {n_mod} module(s), {n_res} réservation(s).")
            )

        rng = random.Random(42)
        now = timezone.localtime()

        with transaction.atomic():
            modules: list[ModulePropose] = []
            for i, spec in enumerate(MODULE_SPECS):
                desc = (
                    f"{spec['titre']} — module de démonstration pour tests (catalogue, filtres).\n\n"
                    f"{SEED_MARKER}"
                )
                modules.append(
                    ModulePropose(
                        titre=spec["titre"],
                        niveau=spec["niveau"],
                        tuteur=tutor,
                        filiere_cible=(student.filiere or tutor.filiere or "Informatique")[:120],
                        format_seance=spec["format_seance"],
                        planning=spec["planning"],
                        description=desc,
                        duree_label=spec["duree_label"],
                        tags=spec["tags"],
                        nombre_avis=rng.randint(0, 28),
                        statut=StatutModule.PUBLISHED,
                        creneaux=_creneaux_for_index(i),
                        actif=True,
                    )
                )
            ModulePropose.objects.bulk_create(modules)

        statuses = list(STATUS_MIX)
        rng.shuffle(statuses)

        reservations: list[Reservation] = []
        for n in range(RESERVATION_TOTAL):
            mod = modules[n % len(modules)]
            statut = statuses[n]
            fmt = FormatSeance.ONLINE if rng.random() > 0.35 else FormatSeance.PRESENTIEL
            duree = rng.choice(DUREES)
            ref = f"{REF_PREFIX}{n:04d}"

            if statut == StatutReservation.COMPLETED:
                slot_start = now - timedelta(days=5 + n * 3 + rng.randint(0, 2))
            elif statut == StatutReservation.PENDING:
                slot_start = now + timedelta(days=3 + n * 2 + rng.randint(0, 4))
            else:
                slot_start = (
                    now - timedelta(days=20 + n)
                    if rng.random() > 0.4
                    else now + timedelta(days=1 + n)
                )

            slot_end = slot_start + timedelta(hours=float(duree))
            meet = None
            if fmt == FormatSeance.ONLINE:
                meet = MEET_URL_OK

            student_confirm = statut == StatutReservation.COMPLETED
            tutor_confirm = statut in (
                StatutReservation.COMPLETED,
                StatutReservation.CONFIRMED,
            )
            if statut == StatutReservation.PENDING:
                tutor_confirm = rng.random() > 0.5

            reservations.append(
                Reservation(
                    etudiant=student,
                    tuteur=tutor,
                    module_propose=mod,
                    module_titre=mod.titre,
                    date_label=slot_start.strftime("%d/%m/%Y"),
                    creneau_label=CRENEAU_LABELS[n % len(CRENEAU_LABELS)],
                    duree_heures=duree,
                    format_seance=fmt,
                    statut=statut,
                    message=f"Demande de séance #{n + 1} (jeu de données {SEED_MARKER}).",
                    student_session_confirm=student_confirm,
                    tutor_session_confirm=tutor_confirm,
                    meet_url=meet,
                    creneau_ref=ref,
                    slot_start=slot_start,
                    slot_end=slot_end,
                )
            )

        with transaction.atomic():
            for res in reservations:
                res.save()

        completed_refs = [r for r in reservations if r.statut == StatutReservation.COMPLETED]
        eval_objs: list[EvaluationSeance] = []
        for i, res in enumerate(completed_refs):
            note, commentaire = EVAL_COMMENTS[i % len(EVAL_COMMENTS)]
            if rng.random() > 0.7:
                note = rng.choice([3, 4, 5])
            eval_objs.append(
                EvaluationSeance(
                    reservation=res,
                    etudiant=student,
                    tuteur=tutor,
                    note=note,
                    commentaire=commentaire,
                )
            )
        with transaction.atomic():
            EvaluationSeance.objects.bulk_create(eval_objs)

        recalc_tutor_review_stats(tutor)

        if not options["skip_messenger"]:
            with transaction.atomic():
                conv = _get_or_create_dm(tutor, student)
                if not Message.objects.filter(conversation=conv).exists():
                    msgs = [
                        (student, "Bonjour, je souhaiterais un créneau pour réviser avant le partiel."),
                        (tutor, "Bonjour, je peux te proposer mercredi soir ou samedi matin."),
                        (student, "Mercredi 20h me convient parfaitement."),
                        (tutor, "C’est noté, j’envoie le lien Meet sur la plateforme."),
                        (student, "Super, à mercredi !"),
                        (tutor, "À mercredi. N’hésite pas si tu as des questions avant."),
                    ]
                    for sender, text in msgs:
                        Message.objects.create(conversation=conv, sender=sender, text=text)

        self.stdout.write(
            self.style.SUCCESS(
                f"Terminé : tuteur={tutor.email} (id={tutor.pk}), étudiant={student.email} (id={student.pk}). "
                f"{len(modules)} modules, {len(reservations)} réservations "
                f"({statuses.count(StatutReservation.COMPLETED)} completed, "
                f"{statuses.count(StatutReservation.PENDING)} pending, "
                f"{statuses.count(StatutReservation.CANCELLED)} cancelled), "
                f"{len(eval_objs)} évaluation(s)."
            )
        )
