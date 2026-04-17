from decimal import Decimal

from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Niveau(models.TextChoices):
    L1 = "L1", "L1"
    L2 = "L2", "L2"
    L3 = "L3", "L3"
    M1 = "M1", "M1"
    M2 = "M2", "M2"
    DOCTORAT = "Doctorat", "Doctorat"


class Role(models.TextChoices):
    STUDENT = "student", "Étudiant"
    TUTOR = "tutor", "Tuteur"
    BOTH = "both", "Étudiant et tuteur"
    ADMIN = "admin", "Administrateur"


class User(AbstractUser):
    """Compte utilisateur (inscription = balance 2h, score 5 selon CDCF)."""

    username = None
    email = models.EmailField("adresse e-mail", unique=True)
    name = models.CharField("nom complet", max_length=255)
    filiere = models.CharField(max_length=120)
    niveau = models.CharField(max_length=20, choices=Niveau.choices)
    description = models.TextField(blank=True)
    balance_hours = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=2,
        validators=[MinValueValidator(-5)],
    )
    score = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    tutor_review_count = models.PositiveIntegerField(
        "nombre d’avis tuteur (séances évaluées)",
        default=0,
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT,
    )
    modules_maitrises = models.JSONField(
        "modules maîtrisés (libellés libres, hors catalogue)",
        default=list,
        blank=True,
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name", "filiere", "niveau"]

    class Meta:
        verbose_name = "utilisateur"
        verbose_name_plural = "utilisateurs"

    def __str__(self):
        return f"{self.name} <{self.email}>"


class FormatSeance(models.TextChoices):
    ONLINE = "Online", "En ligne"
    PRESENTIEL = "Présentiel", "Présentiel"


class StatutModule(models.TextChoices):
    PUBLISHED = "published", "Publié"
    PENDING = "pending", "En attente"


class ModulePropose(models.Model):
    """
    Offre de cours : un tuteur propose un module pour un niveau donné.
    Les créneaux sont stockés en JSON (id, libelle, date, disponible).
    """

    titre = models.CharField(max_length=200)
    niveau = models.CharField(max_length=20, choices=Niveau.choices)
    tuteur = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="modules_proposes",
    )
    filiere_cible = models.CharField("filière", max_length=120, default="Informatique")
    format_seance = models.CharField(
        max_length=20,
        choices=FormatSeance.choices,
        default=FormatSeance.ONLINE,
    )
    planning = models.CharField("planning (texte)", max_length=255, blank=True)
    description = models.TextField("description du cours", blank=True)
    duree_label = models.CharField("durée affichée", max_length=20, blank=True)
    tags = models.JSONField(default=list, blank=True)
    nombre_avis = models.PositiveIntegerField(default=0)
    statut = models.CharField(
        max_length=20,
        choices=StatutModule.choices,
        default=StatutModule.PUBLISHED,
    )
    creneaux = models.JSONField(default=list, blank=True)
    actif = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["niveau", "titre"]
        verbose_name = "module proposé"
        verbose_name_plural = "modules proposés"

    def __str__(self):
        return f"{self.titre} ({self.niveau}) — {self.tuteur.name}"

    def clean(self):
        super().clean()
        if self.tuteur_id and self.tuteur.role not in (Role.TUTOR, Role.BOTH):
            raise ValidationError(
                {"tuteur": "Seuls les comptes tuteur (ou étudiant+tuteur) peuvent proposer un module."}
            )


class StatutReservation(models.TextChoices):
    PENDING = "pending", "En attente"
    CONFIRMED = "confirmed", "Confirmée"
    IN_PROGRESS = "in_progress", "En cours"
    COMPLETED = "completed", "Complétée"
    CANCELLED = "cancelled", "Annulée"


class Reservation(models.Model):
    """Demande / séance de tutorat (étudiant ↔ tuteur)."""

    etudiant = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reservations_comme_etudiant",
    )
    tuteur = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reservations_comme_tuteur",
    )
    module_propose = models.ForeignKey(
        ModulePropose,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reservations",
    )
    module_titre = models.CharField("module (libellé)", max_length=220)
    date_label = models.CharField("date affichée", max_length=64, blank=True)
    creneau_label = models.CharField("créneau affiché", max_length=160, blank=True)
    duree_heures = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=2,
        validators=[MinValueValidator(0.25), MaxValueValidator(24)],
    )
    format_seance = models.CharField(
        max_length=20,
        choices=FormatSeance.choices,
        default=FormatSeance.ONLINE,
    )
    statut = models.CharField(
        max_length=20,
        choices=StatutReservation.choices,
        default=StatutReservation.PENDING,
    )
    message = models.TextField(blank=True)
    student_session_confirm = models.BooleanField(default=False)
    tutor_session_confirm = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "réservation"
        verbose_name_plural = "réservations"

    def __str__(self):
        return f"{self.module_titre} — {self.etudiant.name} / {self.tuteur.name} ({self.statut})"

    def clean(self):
        super().clean()
        if self.etudiant_id and self.tuteur_id and self.etudiant_id == self.tuteur_id:
            raise ValidationError("L’étudiant et le tuteur doivent être des personnes distinctes.")
        if self.tuteur_id and self.tuteur.role not in (Role.TUTOR, Role.BOTH):
            raise ValidationError({"tuteur": "Le tuteur doit avoir le rôle tuteur ou les deux."})
        if self.etudiant_id and self.etudiant.role not in (Role.STUDENT, Role.BOTH):
            raise ValidationError({"etudiant": "L’étudiant doit avoir le rôle étudiant ou les deux."})


class SignalementSeance(models.Model):
    """Problème signalé par l’étudiant ou le tuteur sur une réservation (no-show, retard, etc.)."""

    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.CASCADE,
        related_name="signalements",
    )
    auteur = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="signalements_emis",
    )
    role_auteur = models.CharField(
        max_length=20,
        help_text="student ou tutor",
    )
    code_motif = models.CharField(max_length=64)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "signalement de séance"
        verbose_name_plural = "signalements de séance"

    def __str__(self):
        return f"Signalement {self.code_motif} — réservation {self.reservation_id}"


class EvaluationSeance(models.Model):
    """Avis laissé par l’étudiant après une séance (réservation terminée)."""

    reservation = models.OneToOneField(
        Reservation,
        on_delete=models.CASCADE,
        related_name="evaluation",
    )
    etudiant = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="evaluations_donnees",
    )
    tuteur = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="evaluations_recues",
    )
    note = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    commentaire = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "évaluation de séance"
        verbose_name_plural = "évaluations de séance"

    def __str__(self):
        return f"{self.tuteur.name} — {self.note}/5 ({self.reservation_id})"


def recalc_tutor_review_stats(tutor: User) -> None:
    """Met à jour score (moyenne des notes) et tutor_review_count pour un tuteur."""
    from django.db.models import Avg, Count

    agg = EvaluationSeance.objects.filter(tuteur=tutor).aggregate(
        c=Count("id"),
        avg=Avg("note"),
    )
    c = int(agg["c"] or 0)
    tutor.tutor_review_count = c
    if c == 0:
        tutor.score = Decimal("5")
    else:
        avg = float(agg["avg"] or 5)
        tutor.score = Decimal(str(round(max(1, min(5, avg)), 2)))
    tutor.save(update_fields=["tutor_review_count", "score"])
