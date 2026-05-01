import { useEffect, useRef, useState } from 'react';
import { getAdminChatWebSocketUrl } from '../services/api';

/**
 * Admin chat WebSocket (HTTP 101 → JSON xabarlar).
 * Server → client: `{ type: 'message', message: {...} }` (REST dagi `data` o‘rashisiz).
 * Client → server: `{ type: 'send', content: '...' }`, `{ type: 'read', message_ids: [...] }`.
 *
 * Handshake sarlavhalari: dev da Vite proxy query dan `Authorization` / `x-uuid` qo‘yadi; to‘g‘ridan-to‘g‘ri
 * `wss://api...` da backend query yoki alohida proxy kerak bo‘lishi mumkin.
 */
export function useAdminChatWebSocket(conversationId, { onMessage, enabled = true } = {}) {
  const wsRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!conversationId || !enabled) {
      setIsLive(false);
      return undefined;
    }

    let cancelled = false;
    let retryTimer;
    let ws;

    const connect = () => {
      if (cancelled) return;
      const url = getAdminChatWebSocketUrl(conversationId);
      ws = new WebSocket(url);

      ws.onopen = () => {
        wsRef.current = ws;
        setIsLive(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === 'message' && payload.message && onMessageRef.current) {
            onMessageRef.current(payload.message);
          }
        } catch {
          /* not json */
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        setIsLive(false);
        if (cancelled) return;
        retryTimer = window.setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        try {
          ws?.close();
        } catch {
          /* ignore */
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      wsRef.current = null;
      setIsLive(false);
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    };
  }, [conversationId, enabled]);

  return { wsRef, isLive };
}
