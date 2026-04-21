import { getApiBase } from './api';

/**
 * Real-time chat — `messenger/routing.py`: `ws/chat/<conversation_id>/`
 * JWT: pass `token` in query (browser WebSockets cannot set Authorization headers).
 */
export function chatWebSocketPath(conversationId, searchParams = {}) {
  const q = new URLSearchParams(searchParams).toString();
  const qs = q ? `?${q}` : '';
  return `/ws/chat/${Number(conversationId)}/${qs}`;
}

/**
 * WebSocket URL for the same host as the API (or Vite proxy in dev).
 * Override with `VITE_WS_URL` (e.g. `ws://127.0.0.1:8000`) so `/ws/chat/...` hits Django ASGI.
 * @param {string} pathWithQuery e.g. `/ws/session/12/?token=...`
 */
export function getWebSocketUrl(pathWithQuery) {
  const path = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
  const rawWs = import.meta.env.VITE_WS_URL;
  if (rawWs != null && String(rawWs).trim() !== '') {
    let u = String(rawWs).trim().replace(/\/$/, '');
    if (u.startsWith('http://')) u = `ws://${u.slice(7)}`;
    else if (u.startsWith('https://')) u = `wss://${u.slice(8)}`;
    return `${u}${path}`;
  }
  const base = getApiBase();
  if (!base) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}${path}`;
  }
  try {
    const u = new URL(base);
    const wsProto = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${u.host}${path}`;
  } catch {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}${path}`;
  }
}
