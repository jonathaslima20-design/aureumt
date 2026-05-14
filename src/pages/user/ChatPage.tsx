import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Search, Send, Loader2, Hand, MessagesSquare,
  Zap, X, ArrowLeft, ArrowDown, WifiOff, MessageSquareText, Inbox,
  Archive, Pin, CornerUpLeft,
} from 'lucide-react';
import { supabase, ChatLog, Instance, QuickReply, ContactLabel, LABEL_COLORS } from '../../lib/supabase';
import { evolution } from '../../lib/evolution';
import { useAuth } from '../../context/AuthContext';
import { QuickReplyPicker, QuickRepliesPanel } from './chat/QuickReplies';
import { ContactItem, ContactSummary } from './chat/ContactItem';
import { MessageBubble } from './chat/MessageBubble';
import { Lightbox } from './chat/Lightbox';
import { Avatar } from './chat/Avatar';
import { dateLabel, timeBucket, bucketLabel } from './chat/utils';

type ActiveFilter = 'all' | 'unread' | 'manual' | 'no_reply' | 'archived' | string;
type SearchMode = 'contacts' | 'messages';
type LocalMsg = ChatLog & { _localId?: string };

const THREAD_PAGE_SIZE = 80;

function LabelChip({ label }: { label: ContactLabel }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
      style={{ background: label.color + '22', color: label.color, border: `1px solid ${label.color}44` }}
    >
      {label.label}
    </span>
  );
}

function FilterPill({
  active, onClick, amber, color, children,
}: {
  active: boolean; onClick: () => void; amber?: boolean; color?: string; children: React.ReactNode;
}) {
  if (amber) {
    return (
      <button
        onClick={onClick}
        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
          active ? 'bg-amber-950/40 border-amber-900/40 text-amber-400'
                 : 'border-[#1a1a1a] text-neutral-500 hover:text-neutral-300'
        }`}
      >{children}</button>
    );
  }
  if (color) {
    return (
      <button
        onClick={onClick}
        className="text-[10px] px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap"
        style={active
          ? { background: color + '22', color, border: `1px solid ${color}55` }
          : { borderColor: '#1a1a1a', color: '#737373' }}
      >{children}</button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
        active ? 'bg-white/10 border-white/20 text-white' : 'border-[#1a1a1a] text-neutral-500 hover:text-neutral-300'
      }`}
    >{children}</button>
  );
}

function ContactListSkeleton() {
  return (
    <div className="divide-y divide-[#111]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-3 py-3 flex items-start gap-2.5 animate-pulse-subtle">
          <div className="w-9 h-9 rounded-full bg-[#1a1a1a]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-[#1a1a1a] rounded w-2/3" />
            <div className="h-2.5 bg-[#141414] rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}>
          <div className={`h-12 bg-[#1a1a1a] rounded-2xl animate-pulse-subtle ${i % 2 ? 'w-1/2' : 'w-2/3'}`} />
        </div>
      ))}
    </div>
  );
}

export function ChatPage({ instance, instances, onBack }: { instance: Instance; instances: Instance[]; onBack?: () => void }) {
  const { profile } = useAuth();

  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<LocalMsg[]>([]);
  const [hasMoreThread, setHasMoreThread] = useState(false);
  const [loadingMoreThread, setLoadingMoreThread] = useState(false);
  const [unreadDividerId, setUnreadDividerId] = useState<string | null>(null);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('contacts');
  const [messageSearchResults, setMessageSearchResults] = useState<Map<string, string>>(new Map());
  const [loadingThread, setLoadingThread] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [qrQuery, setQrQuery] = useState('');
  const [showQRPanel, setShowQRPanel] = useState(false);
  const [showMobileThread, setShowMobileThread] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatLog | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [newMessagesBelow, setNewMessagesBelow] = useState(0);
  const [online, setOnline] = useState(true);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  const threadRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const isAtBottomRef = useRef(true);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ────────────────────────────────────────────────────────────────────────
  // Contacts loader
  const loadContacts = useCallback(async () => {
    const [logsRes, statesRes, labelsRes] = await Promise.all([
      supabase
        .from('chat_logs')
        .select('customer_number, message_body, created_at')
        .eq('instance_id', instance.id)
        .order('created_at', { ascending: false })
        .limit(800),
      supabase
        .from('conversation_states')
        .select('customer_number, manual_override, contact_name, is_pinned, is_archived, unread_count, last_seen_at')
        .eq('instance_id', instance.id),
      supabase
        .from('contact_labels')
        .select('*')
        .eq('instance_id', instance.id),
    ]);

    const stateMap = new Map<string, {
      manual: boolean; name: string | null;
      pinned: boolean; archived: boolean; unread: number; last_seen_at: string;
    }>();
    (statesRes.data || []).forEach((s: {
      customer_number: string; manual_override: boolean; contact_name: string | null;
      is_pinned: boolean; is_archived: boolean; unread_count: number; last_seen_at: string;
    }) => stateMap.set(s.customer_number, {
      manual: s.manual_override, name: s.contact_name,
      pinned: s.is_pinned, archived: s.is_archived, unread: s.unread_count,
      last_seen_at: s.last_seen_at,
    }));

    const labelMap = new Map<string, ContactLabel[]>();
    (labelsRes.data || []).forEach((l: ContactLabel) => {
      const arr = labelMap.get(l.customer_number) || [];
      arr.push(l);
      labelMap.set(l.customer_number, arr);
    });

    const seen = new Map<string, ContactSummary>();
    for (const row of logsRes.data || []) {
      if (!seen.has(row.customer_number)) {
        const state = stateMap.get(row.customer_number);
        seen.set(row.customer_number, {
          number: row.customer_number,
          name: state?.name ?? null,
          lastMessage: row.message_body,
          lastAt: row.created_at,
          manual: state?.manual ?? false,
          pinned: state?.pinned ?? false,
          archived: state?.archived ?? false,
          unread: state?.unread ?? 0,
          labels: labelMap.get(row.customer_number) || [],
        });
      }
    }

    const list = Array.from(seen.values()).sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
    });
    setContacts(list);
    setLoadingContacts(false);
    setSelected((prev) => {
      if (!prev && list.length > 0) return list.find((c) => !c.archived)?.number || list[0].number;
      return prev;
    });
  }, [instance.id]);

  const loadQuickReplies = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('quick_replies')
      .select('*')
      .eq('user_id', profile.id)
      .or(`instance_id.is.null,instance_id.eq.${instance.id}`)
      .order('sort_order', { ascending: true });
    setQuickReplies(data || []);
  }, [profile?.id, instance.id]);

  // ────────────────────────────────────────────────────────────────────────
  // Granular realtime: insert/update locally instead of refetching everything
  useEffect(() => {
    setLoadingContacts(true);
    loadContacts();
    loadQuickReplies();
    const channel = supabase
      .channel(`chat_list:${instance.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_logs',
        filter: `instance_id=eq.${instance.id}`,
      }, (payload) => {
        const row = payload.new as ChatLog;
        setContacts((prev) => {
          const next = [...prev];
          const idx = next.findIndex((c) => c.number === row.customer_number);
          if (idx >= 0) {
            const c = { ...next[idx] };
            c.lastMessage = row.message_body;
            c.lastAt = row.created_at;
            if (row.direction === 'in' && row.customer_number !== selected) {
              c.unread = c.unread + 1;
            }
            next.splice(idx, 1);
            next.unshift(c);
          } else {
            next.unshift({
              number: row.customer_number,
              name: null,
              lastMessage: row.message_body,
              lastAt: row.created_at,
              manual: false,
              pinned: false,
              archived: false,
              unread: row.direction === 'in' ? 1 : 0,
              labels: [],
            });
          }
          return next.sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
          });
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'conversation_states',
        filter: `instance_id=eq.${instance.id}`,
      }, (payload) => {
        const s = payload.new as {
          customer_number: string; manual_override: boolean; contact_name: string | null;
          is_pinned: boolean; is_archived: boolean; unread_count: number;
        };
        setContacts((prev) => prev.map((c) => c.number === s.customer_number ? {
          ...c,
          manual: s.manual_override,
          name: s.contact_name,
          pinned: s.is_pinned,
          archived: s.is_archived,
          unread: s.unread_count,
        } : c));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setOnline(true);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setOnline(false);
      });
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance.id]);

  // ────────────────────────────────────────────────────────────────────────
  // Message search (full-text)
  useEffect(() => {
    if (searchMode !== 'messages' || !debouncedSearch) {
      setMessageSearchResults(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('chat_logs')
        .select('customer_number, message_body, created_at')
        .eq('instance_id', instance.id)
        .ilike('message_body', `%${debouncedSearch}%`)
        .order('created_at', { ascending: false })
        .limit(200);
      if (cancelled) return;
      const snippet = new Map<string, string>();
      (data || []).forEach((row: { customer_number: string; message_body: string }) => {
        if (!snippet.has(row.customer_number)) snippet.set(row.customer_number, row.message_body);
      });
      setMessageSearchResults(snippet);
    })();
    return () => { cancelled = true; };
  }, [searchMode, debouncedSearch, instance.id]);

  // ────────────────────────────────────────────────────────────────────────
  // Thread loader (paginated, oldest-on-top)
  const loadThread = useCallback(async (number: string) => {
    setLoadingThread(true);
    setShowMobileThread(true);
    setHasMoreThread(false);

    // unread divider = first incoming message after last_seen_at
    const stateRes = await supabase
      .from('conversation_states')
      .select('last_seen_at, unread_count')
      .eq('instance_id', instance.id)
      .eq('customer_number', number)
      .maybeSingle();
    const lastSeen = stateRes.data?.last_seen_at as string | undefined;

    const { data } = await supabase
      .from('chat_logs')
      .select('*')
      .eq('instance_id', instance.id)
      .eq('customer_number', number)
      .order('created_at', { ascending: false })
      .limit(THREAD_PAGE_SIZE);

    const rows = (data || []).reverse() as ChatLog[];
    setThread(rows);
    setHasMoreThread(rows.length === THREAD_PAGE_SIZE);

    // find first unread incoming message
    if (lastSeen) {
      const first = rows.find((m) => m.direction === 'in' && m.created_at > lastSeen);
      setUnreadDividerId(first?.id ?? null);
    } else {
      setUnreadDividerId(null);
    }

    setLoadingThread(false);
    setNewMessagesBelow(0);
    isAtBottomRef.current = true;
    setTimeout(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
    }, 50);

    // mark as seen (zero unread, advance last_seen_at)
    await supabase
      .from('conversation_states')
      .upsert({
        instance_id: instance.id,
        customer_number: number,
        last_seen_at: new Date().toISOString(),
        unread_count: 0,
      }, { onConflict: 'instance_id,customer_number' });

    // Optimistic local update so the badge clears immediately
    setContacts((prev) => prev.map((c) => c.number === number ? { ...c, unread: 0 } : c));
  }, [instance.id]);

  const loadOlderThread = useCallback(async () => {
    if (!selected || thread.length === 0 || loadingMoreThread || !hasMoreThread) return;
    setLoadingMoreThread(true);
    const oldest = thread[0].created_at;
    const beforeHeight = threadRef.current?.scrollHeight || 0;

    const { data } = await supabase
      .from('chat_logs')
      .select('*')
      .eq('instance_id', instance.id)
      .eq('customer_number', selected)
      .lt('created_at', oldest)
      .order('created_at', { ascending: false })
      .limit(THREAD_PAGE_SIZE);

    const rows = ((data || []) as ChatLog[]).reverse();
    setThread((prev) => [...rows, ...prev]);
    setHasMoreThread(rows.length === THREAD_PAGE_SIZE);
    setLoadingMoreThread(false);
    requestAnimationFrame(() => {
      if (threadRef.current) {
        const after = threadRef.current.scrollHeight;
        threadRef.current.scrollTop = after - beforeHeight;
      }
    });
  }, [selected, thread, loadingMoreThread, hasMoreThread, instance.id]);

  // selected changes → load thread + subscribe
  useEffect(() => {
    if (!selected) return;
    loadThread(selected);
    const channel = supabase
      .channel(`chat_thread:${instance.id}:${selected}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_logs',
        filter: `instance_id=eq.${instance.id}`,
      }, (payload) => {
        const row = payload.new as ChatLog;
        if (row.customer_number !== selected) return;
        setThread((prev) => {
          // De-dupe optimistic local message that just got persisted
          if (row.direction === 'out') {
            const tempIdx = prev.findIndex(
              (m) => m._localId && m.message_body === row.message_body && m.delivery_status === 'pending'
            );
            if (tempIdx >= 0) {
              const next = [...prev];
              next[tempIdx] = row as LocalMsg;
              return next;
            }
          }
          return [...prev, row as LocalMsg];
        });
        if (isAtBottomRef.current) {
          setTimeout(() => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight }), 50);
        } else if (row.direction === 'in') {
          setNewMessagesBelow((n) => n + 1);
        }
        // keep last_seen_at fresh while viewing
        supabase
          .from('conversation_states')
          .upsert({
            instance_id: instance.id,
            customer_number: selected,
            last_seen_at: new Date().toISOString(),
            unread_count: 0,
          }, { onConflict: 'instance_id,customer_number' });
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'chat_logs',
        filter: `instance_id=eq.${instance.id}`,
      }, (payload) => {
        const row = payload.new as ChatLog;
        if (row.customer_number !== selected) return;
        setThread((prev) => prev.map((m) => m.id === row.id ? { ...m, ...row } : m));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected, instance.id, loadThread]);

  // online/offline indicator
  useEffect(() => {
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, []);

  // ────────────────────────────────────────────────────────────────────────
  // Send (optimistic UI)
  const sendReply = async () => {
    if (!selected || !draft.trim()) return;
    setSending(true);
    const text = draft.trim();
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tempMsg: LocalMsg = {
      id: localId,
      _localId: localId,
      instance_id: instance.id,
      whatsapp_connection_id: null,
      customer_number: selected,
      direction: 'out',
      message_body: text,
      tokens_used: 0,
      created_at: new Date().toISOString(),
      media_type: null,
      media_url: null,
      reply_to_id: replyTo?.id ?? null,
      delivery_status: 'pending',
    };
    setThread((prev) => [...prev, tempMsg]);
    setDraft('');
    setShowQR(false);
    setReplyTo(null);
    setTimeout(() => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight }), 50);

    try {
      await evolution.sendMessage(instance.id, selected, text);
      // success path: realtime will replace temp with real row; mark as sent meanwhile
      setThread((prev) => prev.map((m) =>
        m._localId === localId ? { ...m, delivery_status: 'sent' } : m
      ));
    } catch (e) {
      console.error(e);
      setThread((prev) => prev.map((m) =>
        m._localId === localId ? { ...m, delivery_status: 'failed' } : m
      ));
    } finally {
      setSending(false);
    }
  };

  const retryFailed = async (m: LocalMsg) => {
    if (!selected) return;
    setThread((prev) => prev.map((x) =>
      x._localId === m._localId ? { ...x, delivery_status: 'pending' } : x
    ));
    try {
      await evolution.sendMessage(instance.id, selected, m.message_body);
      setThread((prev) => prev.map((x) =>
        x._localId === m._localId ? { ...x, delivery_status: 'sent' } : x
      ));
    } catch {
      setThread((prev) => prev.map((x) =>
        x._localId === m._localId ? { ...x, delivery_status: 'failed' } : x
      ));
    }
  };

  const toggleManual = async () => {
    if (!selected) return;
    const current = contacts.find((c) => c.number === selected);
    const next = !(current?.manual ?? false);
    try {
      await evolution.setManualOverride(instance.id, selected, next);
      setContacts((prev) => prev.map((c) => c.number === selected ? { ...c, manual: next } : c));
    } catch (e) {
      console.error(e);
    }
  };

  const togglePin = useCallback(async (number: string) => {
    const c = contacts.find((x) => x.number === number);
    if (!c) return;
    const next = !c.pinned;
    setContacts((prev) => prev.map((x) => x.number === number ? { ...x, pinned: next } : x).sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
    }));
    await supabase.from('conversation_states').upsert({
      instance_id: instance.id,
      customer_number: number,
      is_pinned: next,
    }, { onConflict: 'instance_id,customer_number' });
  }, [contacts, instance.id]);

  const toggleArchive = useCallback(async (number: string) => {
    const c = contacts.find((x) => x.number === number);
    if (!c) return;
    const next = !c.archived;
    setContacts((prev) => prev.map((x) => x.number === number ? { ...x, archived: next } : x));
    if (next && number === selected) {
      const nextContact = contacts.find((x) => x.number !== number && !x.archived);
      setSelected(nextContact?.number ?? null);
    }
    await supabase.from('conversation_states').upsert({
      instance_id: instance.id,
      customer_number: number,
      is_archived: next,
    }, { onConflict: 'instance_id,customer_number' });
  }, [contacts, instance.id, selected]);

  const handleDraftChange = (val: string) => {
    setDraft(val);
    if (val.startsWith('/')) {
      setQrQuery(val.slice(1));
      setShowQR(true);
    } else {
      setShowQR(false);
      setQrQuery('');
    }
  };

  const applyQuickReply = (body: string) => {
    setDraft(body);
    setShowQR(false);
    setQrQuery('');
    setShowQRPanel(false);
    setTimeout(() => composeRef.current?.focus(), 50);
  };

  const toggleQRPanel = () => {
    setShowQRPanel((v) => !v);
    setShowQR(false);
    setQrQuery('');
  };

  const handleThreadScroll = () => {
    const el = threadRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distance < 80;
    isAtBottomRef.current = atBottom;
    setShowScrollDown(!atBottom);
    if (atBottom) setNewMessagesBelow(0);
    if (el.scrollTop < 60 && hasMoreThread && !loadingMoreThread) {
      loadOlderThread();
    }
  };

  const scrollToBottom = () => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
    setNewMessagesBelow(0);
    isAtBottomRef.current = true;
  };

  const scrollToMessage = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-amber-400/60');
      setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400/60'), 1500);
    }
  };

  const openImage = (url: string) => {
    const images = thread.filter((m) => m.media_type === 'image' && m.media_url).map((m) => m.media_url!) as string[];
    const idx = images.indexOf(url);
    setLightbox({ images, index: Math.max(0, idx) });
  };

  const selectedContact = useMemo(() => contacts.find((c) => c.number === selected), [contacts, selected]);
  const contactName = selectedContact?.name ?? null;

  const allLabels = useMemo(() => Array.from(
    new Map(contacts.flatMap((c) => c.labels).map((l) => [l.label, l])).values()
  ), [contacts]);

  const showArchived = activeFilter === 'archived';

  const filteredContacts = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return contacts.filter((c) => {
      if (showArchived ? !c.archived : c.archived) return false;
      if (q) {
        if (searchMode === 'contacts') {
          const match = c.number.toLowerCase().includes(q) || (c.name || '').toLowerCase().includes(q);
          if (!match) return false;
        } else {
          if (!messageSearchResults.has(c.number)) return false;
        }
      }
      if (activeFilter === 'unread') return c.unread > 0;
      if (activeFilter === 'manual') return c.manual;
      if (activeFilter === 'no_reply') return new Date(c.lastAt).getTime() < oneHourAgo;
      if (activeFilter === 'all' || activeFilter === 'archived') return true;
      return c.labels.some((l) => l.label === activeFilter);
    });
  }, [contacts, showArchived, debouncedSearch, searchMode, messageSearchResults, activeFilter]);

  // group by time bucket (when sorted by lastAt and not searching)
  const groupedContacts = useMemo(() => {
    const groups: Array<{ bucket: 'pinned' | 'today' | 'yesterday' | 'week' | 'older'; items: ContactSummary[] }> = [];
    const pushTo = (bucket: typeof groups[number]['bucket'], c: ContactSummary) => {
      let g = groups.find((x) => x.bucket === bucket);
      if (!g) { g = { bucket, items: [] }; groups.push(g); }
      g.items.push(c);
    };
    filteredContacts.forEach((c) => {
      if (c.pinned && !showArchived) pushTo('pinned', c);
      else pushTo(timeBucket(c.lastAt), c);
    });
    return groups;
  }, [filteredContacts, showArchived]);

  const manualCount = useMemo(() => contacts.filter((c) => c.manual && !c.archived).length, [contacts]);
  const unreadCount = useMemo(() => contacts.filter((c) => c.unread > 0 && !c.archived).length, [contacts]);
  const archivedCount = useMemo(() => contacts.filter((c) => c.archived).length, [contacts]);

  const messagesById = useMemo(() => {
    const map = new Map<string, ChatLog>();
    thread.forEach((m) => map.set(m.id, m));
    return map;
  }, [thread]);

  // build date separators
  const renderedThread = useMemo(() => {
    const out: Array<{ kind: 'sep'; key: string; label: string } | { kind: 'msg'; message: LocalMsg }> = [];
    let lastDate = '';
    thread.forEach((m) => {
      const dl = dateLabel(m.created_at);
      if (dl !== lastDate) {
        out.push({ kind: 'sep', key: `sep-${m.id}`, label: dl });
        lastDate = dl;
      }
      out.push({ kind: 'msg', message: m });
    });
    return out;
  }, [thread]);

  // ────────────────────────────────────────────────────────────────────────
  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (meta && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        const unread = contacts.filter((c) => c.unread > 0 && !c.archived);
        if (unread.length > 0) {
          const idx = unread.findIndex((c) => c.number === selected);
          const next = unread[(idx + 1) % unread.length];
          if (next) setSelected(next.number);
        }
      } else if (meta && e.key.toLowerCase() === 'e' && selected) {
        e.preventDefault();
        toggleArchive(selected);
      } else if (meta && e.key.toLowerCase() === 'p' && selected) {
        e.preventDefault();
        togglePin(selected);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [contacts, selected, toggleArchive, togglePin]);

  void LABEL_COLORS;

  // ────────────────────────────────────────────────────────────────────────
  // Renders

  const renderContactsList = () => {
    if (loadingContacts) return <ContactListSkeleton />;
    if (filteredContacts.length === 0) {
      return (
        <div className="text-center py-16 px-4">
          <MessagesSquare size={20} className="text-neutral-700 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-xs text-neutral-600">Nenhum contato</p>
        </div>
      );
    }

    // when searching, don't group
    const isSearching = !!debouncedSearch;
    if (isSearching) {
      return (
        <div role="listbox" aria-label="Contatos">
          {filteredContacts.map((c) => (
            <ContactItem
              key={c.number}
              contact={c}
              active={c.number === selected}
              searchQuery={debouncedSearch}
              snippet={searchMode === 'messages' ? messageSearchResults.get(c.number) : null}
              onClick={() => setSelected(c.number)}
              onTogglePin={() => togglePin(c.number)}
              onToggleArchive={() => toggleArchive(c.number)}
            />
          ))}
        </div>
      );
    }

    return (
      <div role="listbox" aria-label="Contatos">
        {groupedContacts.map((g) => (
          <div key={g.bucket}>
            <div className="px-3 py-1.5 bg-[#0a0a0a] text-[9px] uppercase tracking-wider text-neutral-600 font-medium sticky top-0 z-10 border-b border-[#1a1a1a]">
              {g.bucket === 'pinned' ? 'Fixadas' : bucketLabel(g.bucket as 'today' | 'yesterday' | 'week' | 'older')}
            </div>
            {g.items.map((c) => (
              <ContactItem
                key={c.number}
                contact={c}
                active={c.number === selected}
                onClick={() => setSelected(c.number)}
                onTogglePin={() => togglePin(c.number)}
                onToggleArchive={() => toggleArchive(c.number)}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderSidebar = () => (
    <div className="border-r border-[#242424] flex flex-col min-w-0 overflow-hidden">
      <div className="p-3 border-b border-[#242424] space-y-2">
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
          <input
            ref={searchRef}
            type="text"
            placeholder={searchMode === 'contacts' ? 'Buscar contato (Ctrl+K)' : 'Buscar em mensagens...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#363636] transition-colors"
            aria-label="Buscar"
          />
        </div>
        <div className="flex items-center gap-1 text-[10px]">
          <button
            onClick={() => setSearchMode('contacts')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
              searchMode === 'contacts' ? 'bg-[#1a1a1a] text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title="Buscar por nome ou número"
          >
            <Inbox size={10} /> Contatos
          </button>
          <button
            onClick={() => setSearchMode('messages')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
              searchMode === 'messages' ? 'bg-[#1a1a1a] text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title="Buscar dentro das mensagens"
          >
            <MessageSquareText size={10} /> Mensagens
          </button>
        </div>
        <div className="flex gap-1 flex-wrap">
          <FilterPill active={activeFilter === 'all'} onClick={() => setActiveFilter('all')}>
            Todos ({contacts.filter((c) => !c.archived).length})
          </FilterPill>
          {unreadCount > 0 && (
            <FilterPill active={activeFilter === 'unread'} onClick={() => setActiveFilter('unread')}>
              Não lidas ({unreadCount})
            </FilterPill>
          )}
          {manualCount > 0 && (
            <FilterPill active={activeFilter === 'manual'} onClick={() => setActiveFilter('manual')} amber>
              Manual ({manualCount})
            </FilterPill>
          )}
          <FilterPill active={activeFilter === 'no_reply'} onClick={() => setActiveFilter('no_reply')}>
            Sem resposta 1h+
          </FilterPill>
          {archivedCount > 0 && (
            <FilterPill active={activeFilter === 'archived'} onClick={() => setActiveFilter('archived')}>
              Arquivadas ({archivedCount})
            </FilterPill>
          )}
          {allLabels.map((l) => {
            const cnt = contacts.filter((c) => !c.archived && c.labels.some((cl) => cl.label === l.label)).length;
            return (
              <FilterPill key={l.label} active={activeFilter === l.label} onClick={() => setActiveFilter(l.label)} color={l.color}>
                {l.label} ({cnt})
              </FilterPill>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {renderContactsList()}
      </div>
    </div>
  );

  const renderThread = (compact = false) => {
    if (!selected) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-neutral-600">Selecione um contato</p>
        </div>
      );
    }
    return (
      <>
        <div className="px-4 py-3 border-b border-[#242424] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {compact && (
              <button
                onClick={() => setShowMobileThread(false)}
                className="text-neutral-400 hover:text-white p-1 transition-colors"
                aria-label="Voltar"
              >
                <X size={16} />
              </button>
            )}
            <Avatar name={selectedContact?.name ?? null} number={selected} size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-sm text-white font-medium truncate">
                  {contactName || <span className="font-mono">{selected}</span>}
                </div>
                {contactName && (
                  <span className="text-[10px] font-mono text-neutral-600 shrink-0">{selected}</span>
                )}
                {selectedContact?.labels.map((l) => (
                  <LabelChip key={l.id} label={l} />
                ))}
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                {selectedContact?.manual
                  ? 'Modo manual ativo — o bot não responderá'
                  : 'Bot respondendo automaticamente'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => selected && togglePin(selected)}
              title={selectedContact?.pinned ? 'Desafixar (Ctrl+P)' : 'Fixar (Ctrl+P)'}
              className={`p-1.5 rounded-lg border transition-colors ${
                selectedContact?.pinned
                  ? 'bg-amber-950/30 border-amber-900/40 text-amber-400'
                  : 'border-[#242424] text-neutral-400 hover:text-white'
              }`}
              aria-label="Fixar"
            >
              <Pin size={12} />
            </button>
            <button
              onClick={() => selected && toggleArchive(selected)}
              title="Arquivar (Ctrl+E)"
              className="p-1.5 rounded-lg border border-[#242424] text-neutral-400 hover:text-white transition-colors"
              aria-label="Arquivar"
            >
              <Archive size={12} />
            </button>
            <button
              onClick={toggleManual}
              className={`text-[11px] px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
                selectedContact?.manual
                  ? 'bg-amber-950/30 border-amber-900/40 text-amber-400 hover:bg-amber-950/50'
                  : 'border-[#242424] text-neutral-400 hover:text-white hover:border-[#2e2e2e]'
              }`}
            >
              <Hand size={11} />
              {selectedContact?.manual ? 'Retomar bot' : 'Assumir manual'}
            </button>
          </div>
        </div>

        <div
          ref={threadRef}
          onScroll={handleThreadScroll}
          className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3 bg-[#0a0a0a] relative"
        >
          {loadingMoreThread && (
            <div className="flex items-center justify-center py-2">
              <Loader2 size={14} className="text-neutral-600 animate-spin" />
            </div>
          )}
          {loadingThread ? (
            <ThreadSkeleton />
          ) : renderedThread.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <p className="text-xs text-neutral-600">Sem mensagens ainda</p>
            </div>
          ) : (
            renderedThread.map((node) => {
              if (node.kind === 'sep') {
                return (
                  <div key={node.key} className="flex justify-center my-3">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500 bg-[#141414] border border-[#242424] px-3 py-1 rounded-full">
                      {node.label}
                    </span>
                  </div>
                );
              }
              const m = node.message;
              const quoted = m.reply_to_id ? messagesById.get(m.reply_to_id) ?? null : null;
              return (
                <div
                  key={m.id}
                  onClick={() => m.delivery_status === 'failed' && retryFailed(m)}
                  className={m.delivery_status === 'failed' ? 'cursor-pointer' : ''}
                  title={m.delivery_status === 'failed' ? 'Falha ao enviar — clique para tentar novamente' : undefined}
                >
                  <MessageBubble
                    message={m}
                    quoted={quoted}
                    isUnreadDivider={m.id === unreadDividerId}
                    isTrainingExample={!!m.is_training_example}
                    onReply={(msg) => { setReplyTo(msg); composeRef.current?.focus(); }}
                    onImage={openImage}
                    onQuoteClick={scrollToMessage}
                    onFeedbackChange={(id, patch) =>
                      setThread((prev) => prev.map((x) => x.id === id ? { ...x, ...patch } : x))
                    }
                  />
                </div>
              );
            })
          )}
        </div>

        {showScrollDown && (
          <button
            onClick={scrollToBottom}
            className="absolute right-6 bottom-28 bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#222] text-white rounded-full p-2.5 shadow-lg transition-colors flex items-center gap-1.5"
            aria-label="Rolar para o fim"
            style={{ zIndex: 20 }}
          >
            <ArrowDown size={14} />
            {newMessagesBelow > 0 && (
              <span className="text-[10px] bg-emerald-500 text-black font-semibold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center">
                {newMessagesBelow}
              </span>
            )}
          </button>
        )}

        <div className={`p-3 border-t border-[#242424] bg-[#141414] ${compact ? 'p-2.5' : ''}`}>
          {replyTo && (
            <div className="mb-2 flex items-start gap-2 px-2.5 py-1.5 bg-[#0d0d0d] border border-[#242424] rounded-lg">
              <CornerUpLeft size={12} className="text-neutral-500 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                  Respondendo a {replyTo.direction === 'in' ? 'cliente' : 'você'}
                </div>
                <p className="text-[11px] text-neutral-400 truncate">{replyTo.message_body || '(mídia)'}</p>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="text-neutral-500 hover:text-white p-0.5"
                aria-label="Cancelar resposta"
              >
                <X size={11} />
              </button>
            </div>
          )}
          <div className="relative flex items-end gap-2">
            {showQR && (
              <QuickReplyPicker
                replies={quickReplies}
                query={qrQuery}
                onSelect={applyQuickReply}
                onClose={() => { setShowQR(false); setQrQuery(''); }}
              />
            )}
            {!compact && (
              <button
                onClick={toggleQRPanel}
                title="Respostas rápidas"
                className={`mb-0.5 p-2 rounded-lg border transition-colors shrink-0 ${
                  showQRPanel
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'border-[#1c1c1c] text-neutral-500 hover:text-white hover:border-[#2a2a2a]'
                }`}
              >
                <Zap size={13} />
              </button>
            )}
            <textarea
              ref={composeRef}
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
                if (e.key === 'Escape') {
                  if (replyTo) setReplyTo(null);
                  setShowQR(false); setQrQuery('');
                }
              }}
              placeholder={compact ? 'Mensagem...' : 'Escreva uma resposta… ou / para respostas rápidas'}
              rows={1}
              className="flex-1 bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#363636] resize-none max-h-32 transition-colors"
              aria-label="Compor mensagem"
            />
            <button
              onClick={sendReply}
              disabled={sending || !draft.trim()}
              className="mb-0.5 bg-white text-black rounded-lg p-2.5 hover:bg-neutral-200 transition-colors disabled:opacity-40"
              aria-label="Enviar"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          {!compact && (
            <p className="text-[10px] text-neutral-600 mt-2">
              Enviar uma mensagem ativa o modo manual, pausando o bot para este contato.
            </p>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="hidden lg:block">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg border border-[#242424] text-neutral-400 hover:text-white hover:border-[#2e2e2e] hover:bg-[#141414] transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-white tracking-tight">Chat</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Histórico por contato com possibilidade de resposta manual.
            </p>
          </div>
          {!online && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-950/30 border border-amber-900/40 px-2.5 py-1 rounded-lg">
              <WifiOff size={11} /> Reconectando...
            </div>
          )}
        </div>
      </div>

      <div
        className="border border-[#242424] rounded-xl bg-[#141414] overflow-hidden"
        style={{ height: 'calc(100vh - 200px)', minHeight: 400 }}
      >
        <div
          className="h-full hidden lg:grid"
          style={{ gridTemplateColumns: showQRPanel ? '260px 1fr 288px' : '260px 1fr' }}
        >
          {renderSidebar()}
          <div className="flex flex-col min-w-0 overflow-hidden relative">
            {renderThread(false)}
          </div>
          {showQRPanel && (
            <QuickRepliesPanel
              instances={instances}
              replies={quickReplies}
              onReload={loadQuickReplies}
              onClose={() => setShowQRPanel(false)}
              onInsert={applyQuickReply}
            />
          )}
        </div>

        {/* Mobile layout */}
        <div className="lg:hidden h-full flex flex-col">
          {!showMobileThread ? renderSidebar() : (
            <div className="flex flex-col h-full overflow-hidden relative">{renderThread(true)}</div>
          )}
        </div>
      </div>

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onPrev={() => setLightbox((p) => p ? { ...p, index: (p.index - 1 + p.images.length) % p.images.length } : p)}
          onNext={() => setLightbox((p) => p ? { ...p, index: (p.index + 1) % p.images.length } : p)}
        />
      )}
    </div>
  );
}
