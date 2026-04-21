"""
ASGI entrypoint — HTTP (Django) + WebSocket (Channels + AuthMiddlewareStack + JWT).

Requires `channels` and `daphne` (see config.settings); no silent HTTP-only fallback.
"""

import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import OriginValidator
from django.conf import settings
from django.core.asgi import get_asgi_application

from accounts.middleware import JWTAuthMiddlewareStack
from accounts.routing import websocket_urlpatterns

django_asgi_app = get_asgi_application()


def _websocket_allowed_origins():
    """Match browser Origin to CORS (Vite dev ports), not only ALLOWED_HOSTS."""
    seen = set()
    out = []
    for o in getattr(settings, "CORS_ALLOWED_ORIGINS", []):
        if o and o not in seen:
            seen.add(o)
            out.append(o)
    for port in range(5173, 5181):
        for host in ("localhost", "127.0.0.1"):
            o = f"http://{host}:{port}"
            if o not in seen:
                seen.add(o)
                out.append(o)
    for o in ("http://127.0.0.1:8000", "http://localhost:8000"):
        if o not in seen:
            seen.add(o)
            out.append(o)
    return out


application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": OriginValidator(
            JWTAuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
            _websocket_allowed_origins(),
        ),
    },
)
