"""
Validation structurée des créneaux (JSON) : horaires, chevauchements, doublons.
Utilisé par ModuleProposeCreateSerializer pour une publication cohérente côté tuteur.
"""

from __future__ import annotations

import datetime as dt
import re
from typing import Any

from django.utils import timezone

from .models import ModulePropose


_TIME_RE = re.compile(r"^\s*(\d{1,2}):(\d{2})\s*$")


def _parse_hhmm(s: str | None) -> tuple[int, int] | None:
    if not s or not isinstance(s, str):
        return None
    m = _TIME_RE.match(s.strip())
    if not m:
        return None
    h, mi = int(m.group(1)), int(m.group(2))
    if not (0 <= h <= 23 and 0 <= mi <= 59):
        return None
    return h, mi


def _parse_date(s: str | None) -> dt.date | None:
    if not s or not isinstance(s, str):
        return None
    s = s.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return dt.datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _aware_start_end(
    d: dt.date,
    h1: int,
    m1: int,
    h2: int,
    m2: int,
) -> tuple[dt.datetime, dt.datetime] | None:
    tz = timezone.get_current_timezone()
    start = dt.datetime.combine(d, dt.time(h1, m1))
    end = dt.datetime.combine(d, dt.time(h2, m2))
    start_a = timezone.make_aware(start, tz)
    end_a = timezone.make_aware(end, tz)
    if end_a <= start_a:
        return None
    return start_a, end_a


def intervals_overlap(a_start: dt.datetime, a_end: dt.datetime, b_start: dt.datetime, b_end: dt.datetime) -> bool:
    return a_start < b_end and b_start < a_end


def creneau_to_interval(item: dict[str, Any]) -> tuple[dt.datetime, dt.datetime] | None:
    date_s = (item.get("date_iso") or "").strip() or (item.get("date") or "").strip()
    d = _parse_date(date_s) if date_s else None
    if d is None:
        return None
    t1 = _parse_hhmm(item.get("heure_debut"))
    t2 = _parse_hhmm(item.get("heure_fin"))
    if not t1 or not t2:
        return None
    return _aware_start_end(d, t1[0], t1[1], t2[0], t2[1])


def human_libelle_fr(d: dt.date, h1: int, m1: int, h2: int, m2: int) -> str:
    j = d.strftime("%A")
    j = j[:1].upper() + j[1:]
    mois = d.strftime("%b")
    return f"{j} {d.day} {mois} {d.year} · {h1:02d}:{m1:02d} – {h2:02d}:{m2:02d}"


def normalize_creneau_for_storage(item: dict[str, Any], libelle: str) -> dict[str, Any]:
    out: dict[str, Any] = {
        "libelle": libelle.strip(),
        "disponible": bool(item.get("disponible", True)),
    }
    cid = (item.get("id") or "").strip()
    if cid:
        out["id"] = cid
    date_m = (item.get("date") or "").strip()
    if date_m:
        out["date"] = date_m
    for k in ("date_iso", "heure_debut", "heure_fin"):
        v = item.get(k)
        if v is not None and str(v).strip():
            out[k] = str(v).strip()
    return out


def validate_creneaux_payload(
    items: list[dict[str, Any]],
    *,
    tutor_id: int,
    exclude_module_id: int | None = None,
) -> tuple[list[dict[str, Any]], list[str]]:
    errors: list[str] = []
    if not items:
        errors.append("Ajoutez au moins un créneau.")
        return [], errors

    enriched: list[dict[str, Any]] = []
    intervals: list[tuple[dt.datetime, dt.datetime]] = []

    for idx, raw in enumerate(items):
        if not isinstance(raw, dict):
            errors.append(f"Créneau {idx + 1} : format invalide.")
            continue

        date_iso = (raw.get("date_iso") or "").strip()
        date_legacy = (raw.get("date") or "").strip()
        d = _parse_date(date_iso) if date_iso else _parse_date(date_legacy)
        hdeb = _parse_hhmm(raw.get("heure_debut"))
        hfin = _parse_hhmm(raw.get("heure_fin"))
        libelle_in = (raw.get("libelle") or "").strip()

        if d and hdeb and hfin:
            span = _aware_start_end(d, hdeb[0], hdeb[1], hfin[0], hfin[1])
            if span is None:
                errors.append(
                    f"Créneau {idx + 1} : l’heure de fin doit être après l’heure de début le même jour."
                )
                continue
            start_a, end_a = span
            libelle = libelle_in or human_libelle_fr(d, hdeb[0], hdeb[1], hfin[0], hfin[1])
            row = {
                **raw,
                "libelle": libelle,
                "date_iso": d.isoformat(),
                "heure_debut": f"{hdeb[0]:02d}:{hdeb[1]:02d}",
                "heure_fin": f"{hfin[0]:02d}:{hfin[1]:02d}",
                "date": date_legacy or d.strftime("%d/%m/%Y"),
            }
            enriched.append(row)
            intervals.append((start_a, end_a))
            continue

        if libelle_in:
            row = {**raw, "libelle": libelle_in}
            if date_legacy:
                row["date"] = date_legacy
            enriched.append(row)
            continue

        errors.append(
            f"Créneau {idx + 1} : indiquez une date et des heures de début et de fin, ou un libellé descriptif."
        )

    if errors:
        return [], errors

    # Doublons / chevauchements (créneaux structurés uniquement)
    for a in range(len(intervals)):
        for b in range(a + 1, len(intervals)):
            sa, ea = intervals[a]
            sb, eb = intervals[b]
            if sa == sb and ea == eb:
                errors.append(
                    "Deux créneaux identiques (même date et même plage horaire) : supprimez le doublon."
                )
                break
            if intervals_overlap(sa, ea, sb, eb):
                errors.append(
                    "Chevauchement entre deux créneaux : même jour et plages horaires qui se recoupent."
                )
                break
        if errors:
            break

    if not errors and intervals:
        qs = ModulePropose.objects.filter(tuteur_id=tutor_id, actif=True).only("id", "creneaux")
        if exclude_module_id is not None:
            qs = qs.exclude(pk=exclude_module_id)
        for mod in qs:
            cr = mod.creneaux if isinstance(mod.creneaux, list) else []
            for c in cr:
                if not isinstance(c, dict):
                    continue
                inv = creneau_to_interval(c)
                if not inv:
                    continue
                sb, eb = inv
                for sa, ea in intervals:
                    if intervals_overlap(sa, ea, sb, eb):
                        errors.append(
                            "Un créneau chevauche une plage déjà publiée sur un autre module : modifiez l’horaire."
                        )
                        break
                if errors:
                    break
            if errors:
                break

    if errors:
        return [], errors

    stored: list[dict[str, Any]] = []
    for row in enriched:
        lib = (row.get("libelle") or "").strip()
        if not lib:
            errors.append("Chaque créneau doit avoir un libellé ou une date/heure complète.")
            return [], errors
        stored.append(normalize_creneau_for_storage(row, lib))

    return stored, []
