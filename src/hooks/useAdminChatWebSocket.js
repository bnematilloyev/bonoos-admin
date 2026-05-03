import { useCallback, useEffect, useRef, useState } from 'react';
import { getAdminChatWebSocketUrl } from '../services/api';
import { describeWebSocketClose, sanitizeAdminChatWsUrl } from '../utils/webSocketDiagnostic';

/**
 * Admin chat WebSocket (HTTP 101 → JSON xabarlar).
 * Server → client: `{ type: 'message', message: {...} }` (REST dagi `data` o‘rashisiz).
 * Client → server: `{ type: 'send', content: '...' }`, `{ type: 'read', message_ids: [...] }`.
 *
 * Handshake sarlavhalari: dev da Vite proxy query dan `Authorization` / `x-uuid` qo‘yadi; to‘g‘ridan-to‘g‘ri
 * `wss://api...` da backend query yoki alohida proxy kerak bo‘lishi mumkin.
 *
 * Eslatma: brauzer `error` hodisasida sabab bermaydi; tafsilot odatda `close` dagi code/reason da.
 */
export function useAdminChatWebSocket(conversationId, { onMessage, enabled = true } = {}) {
  const wsRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const [isLive, setIsLive] = useState(false);
  const [wsDiagnostic, setWsDiagnostic] = useState(null);

  const clearWsDiagnostic = useCallback(() => setWsDiagnostic(null), []);

  useEffect(() => {
    if (!conversationId || !enabled) {
      setIsLive(false);
      setWsDiagnostic(null);
      return undefined;
    }

    setWsDiagnostic(null);

    let cancelled = false;
    let retryTimer;
    let ws;

    const connect = () => {
      if (cancelled) return;
      const url = getAdminChatWebSocketUrl(conversationId);
      const safeUrl = sanitizeAdminChatWsUrl(url);
      ws = new WebSocket(url);

      ws.onopen = () => {
        wsRef.current = ws;
        setIsLive(true);
        setWsDiagnostic(null);
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

      ws.onclose = (event) => {
        const { code, reason, wasClean } = event;
        wsRef.current = null;
        setIsLive(false);
        if (cancelled) return;

        const normal = wasClean && (code === 1000 || code === 1001);
        if (!normal) {
          const diag = describeWebSocketClose(code, reason, wasClean);
          setWsDiagnostic(diag);
          console.warn(
            `[admin-chat-ws] ${diag.summary}\n${diag.hint}\nURL (token yashirin): ${safeUrl}`,
            import.meta.env.DEV ? { code, reason, wasClean, conversationId } : undefined
          );
        }

        retryTimer = window.setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        console.warn(
          '[admin-chat-ws] WebSocket "error" hodisasi (brauzer batafsil sabab bermaydi). ' +
            'Keyingi qatorda "close" dagi code/reason ni qarang.',
          import.meta.env.DEV ? { url: safeUrl, conversationId } : undefined
        );
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

  return { wsRef, isLive, wsDiagnostic, clearWsDiagnostic };
}
