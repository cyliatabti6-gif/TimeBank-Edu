"""Validation stricte des liens de visioconférence (HTTPS, domaines de confiance)."""

from __future__ import annotations

from urllib.parse import urlparse

from django.core.exceptions import ValidationError

# Sous-domaines autorisés (ex. us02web.zoom.us → suffixe .zoom.us)
_ALLOWED_HOST_SUFFIXES: tuple[str, ...] = (
    "meet.google.com",
    "zoom.us",
    "zoom.com",
    "zoomgov.com",
    "teams.microsoft.com",
    "teams.live.com",
    "webex.com",
    "whereby.com",
    "jit.si",
)


def meet_url_hostname_trusted(hostname: str) -> bool:
    h = (hostname or "").strip().lower()
    if not h:
        return False
    for suf in _ALLOWED_HOST_SUFFIXES:
        if h == suf or h.endswith("." + suf):
            return True
    return False


def normalize_and_validate_meet_url(value: str | None) -> str | None:
    """
    Retourne l’URL normalisée ou None si vide.
    Lève ValidationError si l’URL est non vide mais invalide ou sur un domaine non autorisé.
    """
    if value is None or not str(value).strip():
        return None
    s = str(value).strip()
    if not s.startswith("https://"):
        raise ValidationError("L’URL doit commencer par https://")
    try:
        parsed = urlparse(s)
    except Exception as exc:
        raise ValidationError("URL invalide.") from exc
    host = (parsed.hostname or "").strip().lower()
    if not host:
        raise ValidationError("URL invalide (hôte manquant).")
    if parsed.username or parsed.password:
        raise ValidationError("URL non autorisée (identifiants dans le lien).")
    if not meet_url_hostname_trusted(host):
        raise ValidationError(
            "Domaine non autorisé pour la visio. Utilisez un lien "
            "Google Meet, Zoom, Microsoft Teams ou un service équivalent pris en charge.",
        )
    return s
