"""JWT (query ?token= or Authorization: Bearer) after session auth for WebSockets."""

from urllib.parse import parse_qs

from channels.auth import AuthMiddlewareStack
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken


def _parse_headers(scope):
    out = {}
    for k, v in scope.get("headers") or []:
        try:
            out[k.decode("latin1").lower()] = v.decode("latin1")
        except Exception:
            continue
    return out


def _extract_token(scope) -> str | None:
    if scope.get("type") != "websocket":
        return None
    qs = scope.get("query_string", b"").decode()
    query = parse_qs(qs)
    t = (query.get("token") or [None])[0]
    if t:
        return t.strip() or None
    headers = _parse_headers(scope)
    auth = headers.get("authorization") or headers.get("Authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth[7:].strip() or None
    return None


@database_sync_to_async
def _user_from_token(token_string: str):
    from accounts.models import User

    try:
        token = AccessToken(token_string)
        uid = token["user_id"]
        return User.objects.get(pk=uid)
    except (InvalidToken, TokenError, KeyError, User.DoesNotExist):
        return AnonymousUser()


class JWTAuthMiddleware:
    """
    Runs inside AuthMiddlewareStack after session user is set.
    If a Bearer/query token is present, replaces scope[\"user\"] with the JWT user (or Anonymous if invalid).
    If no token is present, leaves the session user unchanged.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "websocket":
            return await self.app(scope, receive, send)
        token = _extract_token(scope)
        if token is not None:
            scope["user"] = await _user_from_token(token)
        return await self.app(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    """AuthMiddlewareStack + JWT override (same stack as Channels session auth)."""
    return AuthMiddlewareStack(JWTAuthMiddleware(inner))
