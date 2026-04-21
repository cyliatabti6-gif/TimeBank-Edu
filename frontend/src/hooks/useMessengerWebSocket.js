import { useCallback, useEffect, useRef, useState } from 'react';
import { chatWebSocketPath, getWebSocketUrl } from '../lib/wsUrl';

const MAX_BACKOFF_MS = 30000;
const BASE_MS = 1000;

function devLog(...args) {
  if (import.meta.env.DEV) console.debug('[messenger-ws]', ...args);
}

/**
 * WebSocket client for /ws/chat/:id/ with JWT in query, exponential backoff reconnect, ACK-driven sends.
 * @param {object} opts
 * @param {number|null} opts.conversationId
 * @param {string|null} opts.accessToken
 * @param {boolean} opts.enabled
 * @param {(ev: object) => void} [opts.onEvent] — parsed JSON from server
 * @param {() => void} [opts.onOpen]
 */
export function useMessengerWebSocket({
  conversationId,
  accessToken,
  enabled,
  onEvent,
  onOpen,
}) {
  const [readyState, setReadyState] = useState(WebSocket.CLOSED);
  const wsRef = useRef(null);
  const reconnectAttempt = useRef(0);
  const timerRef = useRef(null);
  const onEventRef = useRef(onEvent);
  const onOpenRef = useRef(onOpen);
  const aliveRef = useRef(true);
  onEventRef.current = onEvent;
  onOpenRef.current = onOpen;

  const clearReconnect = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    clearReconnect();
    if (!enabled || !conversationId || !accessToken) {
      setReadyState(WebSocket.CLOSED);
      return;
    }

    const path = chatWebSocketPath(conversationId, { token: accessToken });
    const url = getWebSocketUrl(path);
    devLog('connecting', url.replace(/token=[^&]+/, 'token=***'));

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setReadyState(ws.readyState);

      ws.onopen = () => {
        reconnectAttempt.current = 0;
        setReadyState(WebSocket.OPEN);
        devLog('open', conversationId);
        try {
          onOpenRef.current?.();
        } catch (e) {
          devLog('onOpen error', e);
        }
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          devLog('message', data);
          onEventRef.current?.(data);
        } catch (err) {
          devLog('parse error', err);
        }
      };

      ws.onerror = () => {
        devLog('error event');
      };

      ws.onclose = (ev) => {
        setReadyState(WebSocket.CLOSED);
        devLog('close', ev.code, ev.reason);
        wsRef.current = null;
        if (!aliveRef.current) return;
        if (!enabled || !conversationId || !accessToken) return;
        const n = reconnectAttempt.current++;
        const backoff = Math.min(MAX_BACKOFF_MS, BASE_MS * 2 ** Math.min(n, 16));
        const jitter = Math.floor(Math.random() * 400);
        timerRef.current = setTimeout(() => {
          connect();
        }, backoff + jitter);
      };
    } catch (e) {
      devLog('connect exception', e);
      setReadyState(WebSocket.CLOSED);
    }
  }, [accessToken, clearReconnect, conversationId, enabled]);

  useEffect(() => {
    aliveRef.current = true;
    connect();
    return () => {
      aliveRef.current = false;
      clearReconnect();
      const w = wsRef.current;
      wsRef.current = null;
      if (w && (w.readyState === WebSocket.OPEN || w.readyState === WebSocket.CONNECTING)) {
        w.close();
      }
      setReadyState(WebSocket.CLOSED);
    };
  }, [connect, clearReconnect]);

  const sendJson = useCallback((payload) => {
    const w = wsRef.current;
    if (!w || w.readyState !== WebSocket.OPEN) {
      devLog('send skipped (not open)', payload?.type);
      return false;
    }
    const s = JSON.stringify(payload);
    devLog('send', payload?.type, payload?.temp_id);
    w.send(s);
    return true;
  }, []);

  return {
    readyState,
    isOpen: readyState === WebSocket.OPEN,
    sendJson,
  };
}
