"""Transitions de statut réservation — seules commandes API autorisées."""

from django.core.exceptions import ValidationError

from .models import StatutReservation


def assert_pending_to_confirmed(current: str) -> None:
    if current != StatutReservation.PENDING:
        raise ValidationError("Seules les demandes en attente peuvent être acceptées.")


def assert_pending_to_cancelled(current: str) -> None:
    if current != StatutReservation.PENDING:
        raise ValidationError("Seules les demandes en attente peuvent être annulées.")


def assert_confirmed_to_completed(current: str) -> None:
    if current != StatutReservation.CONFIRMED:
        raise ValidationError('Seules les séances au statut « confirmée » peuvent être clôturées ainsi.')
