import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import { useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { userInitialsFromName } from '../../lib/userDisplay';
import { resolveAvatarSrc } from '../../lib/avatarUrl';
import {
  createOrGetConversation,
  fetchConversations,
  fetchMessageHistory,
  fetchMessengerUsers,
} from '../../lib/messengerApi';
import { useMessengerWebSocket } from '../../hooks/useMessengerWebSocket';

function sortMessages(items) {
  return [...items].sort((a, b) => {
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    if (ta !== tb) return ta - tb;
    const ia = a.message_id ?? a.id ?? 0;
    const ib = b.message_id ?? b.id ?? 0;
    return ia - ib;
  });
}

function otherParticipant(conv, myId) {
  const ps = conv?.participants || [];
  return ps.find((p) => p.id !== myId) || ps[0];
}

export default function Messenger() {
  const { currentUser } = useApp();
  const location = useLocation();
  const myId = currentUser?.id;
  const accessToken = getAccessToken();
  const openUserId = Number(location?.state?.openUserId);

  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [openingUserId, setOpeningUserId] = useState(null);
  const [typingName, setTypingName] = useState(null);
  const typingTimer = useRef(null);
  const messagesEndRef = useRef(null);
  const pendingByTemp = useRef(new Map());
  const openingChatRef = useRef(false);
  const autoOpenedUserRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      setConversations([]);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setUsersLoading(true);
      setUsersError(null);
      try {
        const data = await fetchMessengerUsers();
        if (!cancelled) setAllUsers(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setUsersError(e.message || 'Impossible de charger les utilisateurs');
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [allUsers, userSearch]);

  const mergeServerMessage = useCallback((row) => {
    const mid = row.message_id ?? row.id;
    setMessages((prev) => {
      const next = prev.filter((m) => {
        if (m.tempId && pendingByTemp.current.get(m.tempId) === mid) return false;
        return true;
      });
      const idKey = mid;
      if (next.some((m) => (m.message_id ?? m.id) === idKey)) return sortMessages(next);
      next.push({
        message_id: mid,
        id: mid,
        text: row.text,
        sender_id: row.sender_id,
        timestamp: row.timestamp,
        is_read: row.is_read,
        pending: false,
      });
      return sortMessages(next);
    });
  }, []);

  const loadMessages = useCallback(
    async (conversationId) => {
      if (!conversationId) return;
      setMessagesLoading(true);
      try {
        const data = await fetchMessageHistory(conversationId, 1);
        const raw = data.results ?? data;
        const arr = Array.isArray(raw) ? raw : [];
        const normalized = arr.map((m) => ({
          message_id: m.id,
          id: m.id,
          text: m.text,
          sender_id: m.sender_id,
          timestamp: m.timestamp,
          is_read: m.is_read,
          pending: false,
        }));
        setMessages(sortMessages(normalized));
      } catch {
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
    else setMessages([]);
  }, [selectedId, loadMessages]);

  const handleWsEvent = useCallback(
    (data) => {
      if (!data || typeof data !== 'object') return;
      const t = data.type;
      if (t === 'message_ack') {
        const mid = data.message_id;
        const tempId = data.temp_id;
        if (tempId) pendingByTemp.current.set(tempId, mid);
        setMessages((prev) =>
          sortMessages(
            prev.map((m) => {
              if (tempId && m.tempId === tempId) {
                return {
                  ...m,
                  message_id: mid,
                  id: mid,
                  pending: false,
                };
              }
              return m;
            }),
          ),
        );
        return;
      }
      if (t === 'message' && data.conversation_id === selectedId) {
        mergeServerMessage(data);
        if (data.sender_id !== myId && data.message_id) {
          sendJsonRef.current?.({ type: 'read', message_id: data.message_id });
        }
        return;
      }
      if (t === 'typing' && data.user_id && data.user_id !== myId) {
        const other = conversations.find((c) => c.id === selectedId);
        const op = otherParticipant(other, myId);
        setTypingName(op?.name || '…');
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTypingName(null), 3000);
      }
      if (t === 'read') {
        setMessages((prev) =>
          sortMessages(
            prev.map((m) =>
              (m.message_id ?? m.id) === data.message_id ? { ...m, is_read: true } : m,
            ),
          ),
        );
      }
    },
    [conversations, mergeServerMessage, myId, selectedId],
  );

  const sendJsonRef = useRef(() => {});
  const { sendJson, isOpen } = useMessengerWebSocket({
    conversationId: selectedId,
    accessToken,
    enabled: Boolean(selectedId && accessToken),
    onEvent: handleWsEvent,
    onOpen: () => {
      if (selectedId) loadMessages(selectedId);
    },
  });
  sendJsonRef.current = sendJson;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedId]);

  const sendText = () => {
    const text = input.trim();
    if (!text || !selectedId || !isOpen) return;
    const tempId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ts = new Date().toISOString();
    setMessages((prev) =>
      sortMessages([
        ...prev,
        {
          tempId,
          message_id: null,
          id: null,
          text,
          sender_id: myId,
          timestamp: ts,
          pending: true,
        },
      ]),
    );
    sendJson({ type: 'message', text, temp_id: tempId });
    setInput('');
  };

  const onInputChange = (e) => {
    setInput(e.target.value);
    if (isOpen) sendJson({ type: 'typing' });
  };

  const openChatWithUser = useCallback(
    async (userId) => {
      if (userId == null || openingChatRef.current) return;
      openingChatRef.current = true;
      setOpeningUserId(userId);
      try {
        const existing = conversations.find((c) => otherParticipant(c, myId)?.id === userId);
        if (existing) {
          setSelectedId(existing.id);
          return;
        }
        const conv = await createOrGetConversation(userId);
        await loadConversations();
        setSelectedId(conv.id);
      } catch {
        /* ignore */
      } finally {
        openingChatRef.current = false;
        setOpeningUserId(null);
      }
    },
    [conversations, myId, loadConversations],
  );

  useEffect(() => {
    if (!Number.isFinite(openUserId)) return;
    if (autoOpenedUserRef.current === openUserId) return;
    autoOpenedUserRef.current = openUserId;
    void openChatWithUser(openUserId);
  }, [openChatWithUser, openUserId]);

  const selectedConv = useMemo(
    () => conversations.find((c) => c.id === selectedId),
    [conversations, selectedId],
  );
  const other = selectedConv ? otherParticipant(selectedConv, myId) : null;

  const selectedOtherUserId = useMemo(() => {
    if (!selectedId || !selectedConv) return null;
    return otherParticipant(selectedConv, myId)?.id ?? null;
  }, [selectedConv, selectedId, myId]);

  return (
    <DashboardLayout>
      <div className="bg-[#f4f6f8] -mx-4 px-3 py-3 sm:mx-0 sm:px-0 sm:py-0 rounded-xl">
        <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] min-h-[480px] flex rounded-xl overflow-hidden border border-gray-200/70 bg-white shadow-sm">
        {/* Sidebar */}
        <aside className="w-full max-w-sm border-r border-gray-200/80 flex flex-col bg-white min-h-0">
          <div className="p-3 border-b border-gray-200/80 shrink-0 bg-white">
            <h1 className="text-lg font-semibold text-gray-800 mb-3">Messages</h1>
            <label className="sr-only" htmlFor="messenger-user-search">
              Rechercher un utilisateur
            </label>
            <input
              id="messenger-user-search"
              type="search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search users..."
              autoComplete="off"
              className="w-full rounded-xl bg-[#f3f4f6] border-0 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm ring-1 ring-gray-200/80 focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-3 pt-2 pb-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Contacts</p>
            </div>
            {usersLoading && <p className="px-4 py-3 text-sm text-gray-500">Chargement des utilisateurs…</p>}
            {usersError && <p className="px-4 py-2 text-sm text-red-600">{usersError}</p>}
            {!usersLoading &&
              filteredUsers.map((u) => {
                const active = selectedOtherUserId === u.id;
                const busy = openingUserId === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    disabled={busy}
                    onClick={() => openChatWithUser(u.id)}
                    className={`w-full text-left px-4 py-2.5 flex gap-3 border-b border-gray-100/90 transition-colors hover:bg-[#f3f4f6] disabled:opacity-60 ${
                      active
                        ? 'bg-white border-l-[3px] border-l-primary-600 pl-[13px] shadow-sm'
                        : 'border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <Avatar
                      initials={userInitialsFromName(u.name || '?')}
                      src={resolveAvatarSrc(u) || undefined}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-800 truncate">{u.name || 'Utilisateur'}</div>
                      <div className="text-xs text-gray-500 truncate">{u.email}</div>
                    </div>
                    {busy && <span className="text-xs text-gray-400 self-center">…</span>}
                  </button>
                );
              })}
            {!usersLoading && filteredUsers.length === 0 && !usersError && (
              <p className="p-4 text-sm text-gray-500">Aucun utilisateur ne correspond.</p>
            )}
          </div>
        </aside>

        {/* Thread */}
        <section className="flex-1 flex flex-col min-w-0 bg-[#efeae2]">
          {selectedId && other ? (
            <>
              <header className="px-4 py-3 bg-white border-b border-gray-200/70 flex items-center gap-3 shadow-sm">
                <Avatar
                  initials={userInitialsFromName(other.name)}
                  src={resolveAvatarSrc(other) || undefined}
                  size="sm"
                />
                <div>
                  <div className="font-semibold text-gray-800">{other.name}</div>
                  <div className="text-xs text-gray-400">
                    {isOpen ? 'En ligne (temps réel)' : 'Connexion…'}
                  </div>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {messagesLoading && (
                  <p className="text-center text-sm text-gray-400">Chargement de l’historique…</p>
                )}
                {typingName && (
                  <p className="text-xs text-gray-400 italic">{typingName} est en train d’écrire…</p>
                )}
                {messages.map((m) => {
                  const mine = m.sender_id === myId;
                  return (
                    <div key={m.tempId || m.message_id || m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[78%] rounded-xl px-3 py-2 text-sm shadow-sm ${
                          mine
                            ? 'bg-[#d9fdd3] text-gray-800 rounded-br-md'
                            : 'bg-white text-gray-800 rounded-bl-md border border-gray-100/80'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        <div className="text-[10px] mt-1.5 flex justify-end items-center gap-1 text-gray-400">
                          {new Date(m.timestamp).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {mine && m.pending && <span className="text-gray-400">· · ·</span>}
                          {mine && !m.pending && m.is_read !== false && (
                            <span className="text-primary-600 font-medium" aria-hidden>
                              ✓✓
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <footer className="p-3 bg-[#f3f4f6] border-t border-gray-200/60">
                <div className="flex gap-2 items-end">
                  <textarea
                    value={input}
                    onChange={onInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendText();
                      }
                    }}
                    placeholder="Écrire un message…"
                    rows={2}
                    className="flex-1 resize-none rounded-xl border-0 bg-[#f3f4f6] px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm ring-1 ring-gray-200/80 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={sendText}
                    disabled={!isOpen || !input.trim()}
                    className="px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium shadow-sm hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 transition-colors"
                  >
                    Envoyer
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-8 bg-[#efeae2]">
              Sélectionnez un contact ou une conversation.
            </div>
          )}
        </section>
      </div>
      </div>

    </DashboardLayout>
  );
}
