import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { MessageCircle, RefreshCw, Send, User, Wifi, WifiOff } from 'lucide-react';
import { Badge, Button, Card, PageHeader, Skeleton, Textarea } from '../../components/ui';
import { useChatConversationsInfinite, useChatMessages, useSendChatMessage } from '../../hooks/useApi';
import { useAdminChatWebSocket } from '../../hooks/useAdminChatWebSocket';
import { chatApi } from '../../services/api';
import { useAuthStore } from '../../store';
import { formatIsoDateTime, formatIsoDateOnly, formatIsoTime } from '../../utils/adminDisplay';
import { extractApiError } from '../../utils/error';
import styles from '../admin.module.css';
import chatStyles from './ChatPage.module.css';

function conversationTitle(c) {
  const name = String(c?.user_full_name ?? '').trim();
  if (name) return name;
  const phone = String(c?.user_phone ?? '').trim();
  if (phone) return phone;
  return `#${c?.user_id ?? '—'}`;
}

function conversationListMeta(c) {
  const name = String(c?.user_full_name ?? '').trim();
  const phone = String(c?.user_phone ?? '').trim();
  const bits = [];
  if (name && phone) bits.push(phone);
  bits.push(`#${c.id}`);
  bits.push(formatIsoDateOnly(c.updated_at || c.created_at));
  return bits.join(' · ');
}

function threadMetaLine(c, conversationId) {
  const phone = String(c?.user_phone ?? '').trim();
  const bits = [];
  if (phone) bits.push(phone);
  bits.push(`#${conversationId}`);
  return bits.join(' · ');
}

export const ChatPage = () => {
  const queryClient = useQueryClient();
  const { user: adminUser } = useAuthStore();
  const adminId = adminUser?.id;

  const [searchParams] = useSearchParams();
  const preUserId = searchParams.get('user');

  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState('');
  const [loadOlderError, setLoadOlderError] = useState('');
  const [loadingOlder, setLoadingOlder] = useState(false);

  const {
    data: convPages,
    isLoading: convLoading,
    isError: convError,
    error: convErr,
    refetch: refetchConversations,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatConversationsInfinite({ limit: 50 });

  const conversations = useMemo(() => convPages?.pages.flatMap((p) => p.items) ?? [], [convPages]);

  useEffect(() => {
    if (!preUserId || !conversations.length) return;
    const uid = Number(preUserId);
    if (Number.isNaN(uid)) return;
    const found = conversations.find((c) => Number(c.user_id) === uid);
    if (found) setSelectedId(found.id);
  }, [preUserId, conversations]);

  const onWsMessage = useCallback(
    (msg) => {
      if (!selectedId) return;
      queryClient.setQueryData(['chat-messages', selectedId], (old = []) => {
        if (old.some((m) => Number(m.id) === Number(msg.id))) return old;
        return [...old, msg].sort((a, b) => Number(a.id) - Number(b.id));
      });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
    [queryClient, selectedId]
  );

  const { wsRef, isLive } = useAdminChatWebSocket(selectedId, { onMessage: onWsMessage });

  const {
    data: messages = [],
    isLoading: msgLoading,
    isError: msgError,
    error: msgErr,
  } = useChatMessages(selectedId);

  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedId]);

  const sendMutation = useSendChatMessage();

  const selectedConv = useMemo(
    () => conversations.find((c) => Number(c.id) === Number(selectedId)) || null,
    [conversations, selectedId]
  );

  /** API: sender_role 1 = mijoz (chap), 2 = agent/admin (o‘ng). sender_id ikkala tomonda ham bir xil bo‘lishi mumkin. */
  const isAgentMessage = (m) => {
    const role = Number(m.sender_role);
    if (role === 2) return true;
    if (role === 1) return false;
    if (adminId != null && Number(m.sender_id) === Number(adminId)) return true;
    if (selectedConv && Number(m.sender_id) === Number(selectedConv.admin_id)) return true;
    return false;
  };

  const messageTimeline = useMemo(() => {
    const sorted = [...messages].sort((a, b) => Number(a.id) - Number(b.id));
    const out = [];
    let lastDayKey = '';
    for (const m of sorted) {
      const raw = m.sent_at;
      const d = raw ? new Date(String(raw)) : new Date();
      const dayKey = Number.isNaN(d.getTime())
        ? ''
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dayKey && dayKey !== lastDayKey) {
        lastDayKey = dayKey;
        const label = Number.isNaN(d.getTime())
          ? formatIsoDateOnly(raw)
          : d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });
        out.push({ kind: 'date', key: `day-${dayKey}`, label });
      }
      out.push({ kind: 'msg', key: `m-${m.id}`, m });
    }
    return out;
  }, [messages]);

  const onSend = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !selectedId) return;

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'send', content: text }));
      setDraft('');
      return;
    }

    try {
      await sendMutation.mutateAsync({ conversationId: selectedId, content: text });
      setDraft('');
    } catch {
      /* toast optional */
    }
  };

  const loadOlder = async () => {
    if (!selectedId || !messages.length) return;
    setLoadOlderError('');
    setLoadingOlder(true);
    try {
      const ids = messages.map((m) => Number(m.id));
      const minId = Math.min(...ids);
      const older = await chatApi.listMessages({
        conversationId: selectedId,
        limit: 50,
        beforeId: minId,
      });
      queryClient.setQueryData(['chat-messages', selectedId], (old = []) => {
        const merged = [...older, ...old];
        const map = new Map(merged.map((m) => [m.id, m]));
        return [...map.values()].sort((a, b) => Number(a.id) - Number(b.id));
      });
    } catch (err) {
      setLoadOlderError(extractApiError(err, 'Yuklash muvaffaqiyatsiz'));
    } finally {
      setLoadingOlder(false);
    }
  };

  return (
    <div className={`${styles.page} ${chatStyles.chatPage}`}>
      <PageHeader
        title="Mijozlar chat"
        actions={
          <Button variant="secondary" leftIcon={<RefreshCw size={18} />} onClick={() => refetchConversations()}>
            Yangilash
          </Button>
        }
      />

      <div className={chatStyles.shell}>
        {convError && (
          <p style={{ color: 'var(--error)', fontSize: 14 }}>{extractApiError(convErr)}</p>
        )}

        <div className={chatStyles.grid}>
          <Card className={chatStyles.listCard}>
            <div className={chatStyles.listCardHead}>
              <MessageCircle size={18} className={chatStyles.listCardIcon} />
              <span className={chatStyles.listCardTitle}>Suhbatlar</span>
              <Badge variant="default">
                {hasNextPage ? `${conversations.length}+` : conversations.length}
              </Badge>
            </div>
            {convLoading ? (
              <div className={chatStyles.skeletonStack}>
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} height={56} />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className={chatStyles.hint}>Hozircha suhbat yo‘q.</p>
            ) : (
              <div className={chatStyles.convList}>
                {conversations.map((c) => {
                  const st = String(c.status || 'open').toLowerCase();
                  const open = st === 'open';
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`${chatStyles.convBtn} ${Number(selectedId) === Number(c.id) ? chatStyles.convBtnActive : ''}`}
                      onClick={() => setSelectedId(c.id)}
                    >
                      <div className={chatStyles.convBtnTop}>
                        <span className={chatStyles.convTitle}>{conversationTitle(c)}</span>
                        <Badge variant={open ? 'success' : 'error'} className={chatStyles.convStatus}>
                          {open ? 'Ochiq' : 'Yopiq'}
                        </Badge>
                      </div>
                      <div className={chatStyles.convMeta}>{conversationListMeta(c)}</div>
                    </button>
                  );
                })}
                {hasNextPage && (
                  <div className={chatStyles.listLoadMore}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => fetchNextPage()}
                      isLoading={isFetchingNextPage}
                      disabled={isFetchingNextPage}
                    >
                      Yana yuklash
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className={chatStyles.threadWrap}>
            {!selectedId ? (
              <div className={chatStyles.emptyThread}>Chapdan suhbat tanlang.</div>
            ) : (
              <div className={chatStyles.threadInner}>
                <div className={chatStyles.threadHeader}>
                  <div className={chatStyles.threadHeaderMain}>
                    <div className={chatStyles.threadAvatar}>
                      <User size={18} />
                    </div>
                    <div>
                      <div className={chatStyles.threadTitle}>
                        {selectedConv ? conversationTitle(selectedConv) : '—'}
                      </div>
                      {selectedConv && (
                        <div className={chatStyles.threadMeta}>{threadMetaLine(selectedConv, selectedId)}</div>
                      )}
                    </div>
                  </div>
                  <Badge variant={isLive ? 'success' : 'warning'} title={isLive ? 'WebSocket ulangan' : 'WebSocket qayta ulanmoqda'}>
                    <span className={chatStyles.liveBadge}>
                      {isLive ? <Wifi size={14} /> : <WifiOff size={14} />}
                      {isLive ? 'Real-time' : 'WS…'}
                    </span>
                  </Badge>
                </div>

                <div className={chatStyles.messages}>
                  {msgError && (
                    <p className={chatStyles.threadError}>{extractApiError(msgErr)}</p>
                  )}
                  {msgLoading ? (
                    <Skeleton height={200} />
                  ) : (
                    <>
                      {messages.length > 0 && (
                        <div className={chatStyles.loadOlder}>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={loadOlder}
                            isLoading={loadingOlder}
                            disabled={loadingOlder}
                          >
                            Oldingi xabarlar
                          </Button>
                          {loadOlderError && <p className={chatStyles.loadOlderErr}>{loadOlderError}</p>}
                        </div>
                      )}
                      {messageTimeline.map((item) => {
                        if (item.kind === 'date') {
                          return (
                            <div key={item.key} className={chatStyles.dateSep}>
                              {item.label}
                            </div>
                          );
                        }
                        const m = item.m;
                        const agent = isAgentMessage(m);
                        return (
                          <div
                            key={item.key}
                            className={`${chatStyles.msgRow} ${agent ? chatStyles.msgRowAgent : chatStyles.msgRowClient}`}
                          >
                            {!agent && (
                              <div className={chatStyles.msgAvatar}>
                                <User size={14} />
                              </div>
                            )}
                            <div className={chatStyles.msgBlock}>
                              <div className={`${chatStyles.bubble} ${agent ? chatStyles.bubbleAgent : chatStyles.bubbleClient}`}>
                                <div className={chatStyles.bubbleText}>{m.content}</div>
                                <div className={chatStyles.bubbleMeta}>{formatIsoTime(m.sent_at)}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                <form className={chatStyles.compose} onSubmit={onSend}>
                  <Textarea
                    rows={2}
                    placeholder="Javob yozing…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className={chatStyles.composeInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onSend(e);
                      }
                    }}
                  />
                  <div className={chatStyles.composeRow}>
                    <Button
                      type="submit"
                      leftIcon={<Send size={18} />}
                      disabled={!draft.trim() || sendMutation.isPending}
                      isLoading={sendMutation.isPending}
                    >
                      Yuborish
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
