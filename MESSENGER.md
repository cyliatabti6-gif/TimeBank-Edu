# Messagerie temps réel (Django Channels + React)

## Architecture

- **WebSocket** (`/ws/chat/<conversation_id>/`) : envoi et diffusion des messages, accusés de réception (`message_ack`), indicateur de frappe, accusés de lecture.
- **REST** (`/api/conversations/`, `/api/messages/<id>/`) : liste des conversations, création/récupération d’une conversation 1‑à‑1, historique paginé. **Aucun envoi de message via REST** (évite la duplication).

Authentification WebSocket : **JWT** dans la query string `?token=<access>` (navigateur : pas d’en-tête `Authorization` sur `WebSocket`). Après handshake, la pile **AuthMiddlewareStack** + middleware JWT applique aussi la session si vous passez des cookies.

## Variables d’environnement

### Backend (`.env` à la racine du dossier `backend/` ou export système)

| Variable | Description |
|----------|-------------|
| `DJANGO_SECRET_KEY` | Clé secrète Django (production : obligatoire, forte). |
| `DJANGO_DEBUG` | `True` / `False` — en prod, `False` pour utiliser Redis par défaut pour le channel layer si `CHANNEL_LAYER_INMEMORY` n’est pas forcé. |
| `DJANGO_ALLOWED_HOSTS` | Hôtes autorisés, séparés par des virgules. |
| `REDIS_URL` | Ex. `redis://127.0.0.1:6379/0` — **couche Channels en production** (recommandé). |
| `CHANNEL_LAYER_INMEMORY` | `1` = `InMemoryChannelLayer` (dev sans Redis) ; `0` = Redis via `REDIS_URL`. Par défaut : en dev (`DEBUG=True`) mémoire, en prod Redis. |
| `CORS_ORIGINS` | Origines autorisées pour le navigateur (ex. `http://localhost:5173`). |
| `DATABASE_*` | Optionnel : MySQL si configuré (voir `config/settings.py`). |

### Frontend (`.env` / `.env.local` dans `frontend/`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Base HTTP de l’API (ex. `http://127.0.0.1:8000`). En dev vide, le proxy Vite sert `/api`. |
| `VITE_WS_URL` | Base **WebSocket** (ex. `ws://127.0.0.1:8000` ou `http://127.0.0.1:8000`, le préfixe est normalisé). Utilisée pour `/ws/chat/...` et `/ws/session/...`. Si vide, dérivée de `VITE_API_URL` ou de l’hôte courant. |

## Lancer le projet

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Pour ASGI + WebSockets (recommandé) :

```bash
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

En production, servez l’app ASGI derrière un proxy qui supporte les **WebSockets** (upgrade).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Ouvrez l’URL affichée (souvent `http://localhost:5173`). Le proxy Vite redirige `/api` et `/ws` vers Django (`vite.config.js`).

### Redis (optionnel en local, recommandé en prod)

Avec `CHANNEL_LAYER_INMEMORY=0` et `REDIS_URL` pointant vers une instance Redis accessible, la messagerie et les autres rooms Channels utilisent Redis.

## API REST (résumé)

- `GET /api/conversations/` — conversations dont l’utilisateur connecté est participant (JWT).
- `POST /api/conversations/` — corps `{ "other_user_id": <int> }` : crée ou retourne une conversation 1‑à‑1 sans doublon.
- `GET /api/messages/<conversation_id>/?page=` — historique paginé (JWT, participant uniquement).

## WebSocket (résumé)

- URL : `/ws/chat/<conversation_id>/?token=<JWT access>`
- Client → serveur : `{ "type": "message", "text": "...", "temp_id": "..." }`, `{ "type": "typing" }`, `{ "type": "read", "message_id": 123 }`
- Serveur → client : `message`, `message_ack`, `typing`, `read`, `error`

Codes de fermeture courants : `4401` non authentifié, `4403` non participant, `4404` conversation inconnue.
