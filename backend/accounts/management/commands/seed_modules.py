"""
Remplit le catalogue de modules (par niveau + tuteur + créneaux).

Usage :
  cd backend
  python manage.py migrate
  python manage.py seed_modules --with-demo-tutors

Sans --with-demo-tutors : utilise uniquement les comptes avec is_tutor=True.
Mot de passe des tuteurs démo : DemoTutor123!
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import (
    FormatSeance,
    ModulePropose,
    Niveau,
    PlatformRole,
    StatutModule,
    User,
)

# Données type catalogue info (alignées sur l’ancien mock front)
SEED_ROWS = [
    {
        "titre": "Algorithme",
        "niveau": Niveau.L2,
        "format_seance": FormatSeance.ONLINE,
        "planning": "Lun, Mer, Ven 18h-20h",
        "nombre_avis": 23,
        "creneaux": [
            {"id": "m1-c1", "libelle": "Lundi 18h – 20h", "date": "13/04/2026", "disponible": True},
            {"id": "m1-c2", "libelle": "Mercredi 18h – 20h", "date": "15/04/2026", "disponible": True},
            {"id": "m1-c3", "libelle": "Vendredi 18h – 20h", "date": "17/04/2026", "disponible": False},
        ],
    },
    {
        "titre": "Analyse 1",
        "niveau": Niveau.L1,
        "format_seance": FormatSeance.PRESENTIEL,
        "planning": "Mar, Jeu 10h-12h",
        "nombre_avis": 15,
        "creneaux": [
            {"id": "m2-c1", "libelle": "Mardi 10h – 12h", "date": "14/04/2026", "disponible": True},
            {"id": "m2-c2", "libelle": "Jeudi 10h – 12h", "date": "16/04/2026", "disponible": True},
        ],
    },
    {
        "titre": "Base de Données",
        "niveau": Niveau.L3,
        "format_seance": FormatSeance.PRESENTIEL,
        "planning": "Mar, Jeu 14h-16h",
        "nombre_avis": 18,
        "creneaux": [
            {"id": "m3-c1", "libelle": "Mardi 14h – 16h", "date": "14/04/2026", "disponible": True},
            {"id": "m3-c2", "libelle": "Jeudi 14h – 16h", "date": "16/04/2026", "disponible": True},
        ],
    },
    {
        "titre": "Python",
        "niveau": Niveau.L2,
        "format_seance": FormatSeance.ONLINE,
        "planning": "Mar, Jeu 18h-20h",
        "nombre_avis": 20,
        "creneaux": [
            {"id": "m5-c1", "libelle": "Mardi 18h – 20h", "date": "14/04/2026", "disponible": True},
            {"id": "m5-c2", "libelle": "Jeudi 18h – 20h", "date": "16/04/2026", "disponible": True},
        ],
    },
    {
        "titre": "Structures de Données",
        "niveau": Niveau.L2,
        "format_seance": FormatSeance.PRESENTIEL,
        "planning": "Mer 14h-16h",
        "nombre_avis": 12,
        "creneaux": [
            {"id": "m6-c1", "libelle": "Mercredi 14h – 16h", "date": "15/04/2026", "disponible": True},
        ],
    },
    {
        "titre": "Programmation Web",
        "niveau": Niveau.M1,
        "format_seance": FormatSeance.ONLINE,
        "planning": "Lun, Mer 14h-18h",
        "nombre_avis": 8,
        "creneaux": [
            {"id": "pw-c1", "libelle": "Lundi 14h – 18h", "date": "14/04/2026", "disponible": True},
            {"id": "pw-c2", "libelle": "Mercredi 14h – 18h", "date": "16/04/2026", "disponible": True},
        ],
    },
]

DEMO_TUTORS = [
    ("tuteur.algo@demo.local", "Ahmed Moussa", Niveau.L3),
    ("tuteur.math@demo.local", "Lina Farah", Niveau.L1),
    ("tuteur.bdd@demo.local", "Fatima Zahra", Niveau.L3),
]


class Command(BaseCommand):
    help = "Crée des modules proposés (catalogue par niveau) liés à des tuteurs."

    def add_arguments(self, parser):
        parser.add_argument(
            "--with-demo-tutors",
            action="store_true",
            help="Crée 3 comptes tuteurs démo si besoin (email @demo.local, mdp DemoTutor123!).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["with_demo_tutors"]:
            for email, name, niv in DEMO_TUTORS:
                u, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        "name": name,
                        "filiere": "Informatique",
                        "niveau": niv,
                        "role": PlatformRole.USER,
                        "is_student": False,
                        "is_tutor": True,
                        "description": "Compte tuteur créé par seed_modules (démonstration).",
                    },
                )
                if created:
                    u.set_password("DemoTutor123!")
                    u.save()
                    self.stdout.write(self.style.SUCCESS(f"  Tuteur créé : {email} (mdp: DemoTutor123!)"))

        tutors = list(User.objects.filter(is_tutor=True).order_by("id"))
        if not tutors:
            self.stdout.write(
                self.style.ERROR(
                    "Aucun tuteur en base. Inscrivez des tuteurs ou relancez avec --with-demo-tutors."
                )
            )
            return

        n = 0
        for i, row in enumerate(SEED_ROWS):
            t = tutors[i % len(tutors)]
            obj, created = ModulePropose.objects.update_or_create(
                titre=row["titre"],
                niveau=row["niveau"],
                tuteur=t,
                defaults={
                    "filiere_cible": "Informatique",
                    "format_seance": row["format_seance"],
                    "planning": row["planning"],
                    "description": "",
                    "duree_label": "",
                    "tags": [],
                    "nombre_avis": row.get("nombre_avis", 0),
                    "creneaux": row["creneaux"],
                    "statut": StatutModule.PUBLISHED,
                    "actif": True,
                },
            )
            n += 1
            action = "créé" if created else "mis à jour"
            self.stdout.write(f"  [{action}] {obj.titre} ({obj.niveau}) — {obj.tuteur.name}")

        self.stdout.write(self.style.SUCCESS(f"Terminé : {n} module(s). GET /api/modules/ / ?niveau=L2"))
