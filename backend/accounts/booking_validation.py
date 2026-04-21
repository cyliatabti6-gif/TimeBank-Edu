"""Détection de chevauchement de créneaux pour un même tuteur (réservations actives)."""

from __future__ import annotations

from .models import Reservation, StatutReservation

ACTIVE_STATUSES = (StatutReservation.PENDING, StatutReservation.CONFIRMED)


def tutor_has_slot_conflict(
    tutor_id: int,
    slot_start,
    slot_end,
    *,
    exclude_reservation_id: int | None = None,
) -> bool:
    """
    True si une autre réservation active du même tuteur chevauche le créneau (même règle que
    ``intervals_overlap``). Ignore les réservations sans bornes (données legacy).
    """
    if slot_start is None or slot_end is None:
        return False
    qs = Reservation.objects.filter(
        tuteur_id=tutor_id,
        statut__in=ACTIVE_STATUSES,
        slot_start__isnull=False,
        slot_end__isnull=False,
        slot_start__lt=slot_end,
        slot_end__gt=slot_start,
    )
    if exclude_reservation_id is not None:
        qs = qs.exclude(pk=exclude_reservation_id)
    return qs.exists()
