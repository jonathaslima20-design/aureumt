import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Search, Send, Loader2, User, Bot, Hand, MessagesSquare,
  Zap, X, Plus, Trash2, Save, Check, ChevronDown,
} from 'lucide-react';
import { supabase, ChatLog, Instance, QuickReply, ContactLabel, LABEL_COLORS } from '../../lib/supabase';
import { evolution } from '../../lib/evolution';
import { useAuth } from '../../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type ContactSummary = {
  number: string;
  name: string | null;
  lastMessage: string;
  lastAt: string;
  manual: boolean;
  labels: ContactLabel[];
};

type ActiveFilter = 'all' | 'manual' | string;

type EditState = {
  id: string | null;
  shortcut: string;
  title: string;
  body: string;
  instance_id: string | null;
};

const EMPTY_EDIT: EditState = { id: null, shortcut: '', title: '', body: '', instance_id: null };

// ─── Quick-reply picker popover ───────────────────────────────────────────────

function QuickReplyPicker({
  replies,
  query,
  onSelect,
  onClose,
}: {
  replies: QuickReply[];
  query: string;
  onSelect: (body: string) => void;
  onClose: () => void;
}) {
  const filtered = replies.filter(
    (r) =>
      r.shortcut.toLowerCase().includes(query.toLowerCase()) ||
      r.title.toLowerCase().includes(query.toLowerCase())
  );

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden z-30 max-h-64 overflow-y-auto">
      <div className="px-3 py-2 border-b border-[#1a1a1a] flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
          <Zap size={10} /> Respostas rápidas
        </span>
        <button onClick={onClose} className="text-neutral-600 hover:text-white transition-colors">
          <X size={12} />
        </button>
      </div>
      {filtered.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r.body)}
          className="w-full text-left px-3 py-2.5 hover:bg-[#1a1a1a] transition-colors border-b border-[#111] last:border-0"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-white">{r.title}</span>
            {r.shortcut && (
              <span className="text-[9px] font-mono text-neutral-500 bg-[#0d0d0d] px-1.5 py-0.5 rounded border border-[#1a1a1a]">
                /{r.shortcut}
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">{r.body}</p>
        </button>
      ))}
    </div>
  );
}

// ─── Quick-replies management panel ──────────────────────────────────────────

function QuickRepliesPanel({
  instances,
  replies,
  onReload,
  onClose,
  onInsert,
}: {
  instances: Instance[];
  replies: QuickReply[];
  onReload: () => void;
  onClose: () => void;
  onInsert: (body: string) => void;
}) {
  const { profile } = useAuth();
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (edit && bodyRef.current) bodyRef.current.focus();
  }, [edit?.id]);

  const startCreate = () =>
    setEdit({ ...EMPTY_EDIT, instance_id: instances.length === 1 ? instances[0].id : null });

  const startEdit = (r: QuickReply) =>
    setEdit({ id: r.id, shortcut: r.shortcut, title: r.title, body: r.body, instance_id: r.instance_id });

  const cancel = () => setEdit(null);

  const save = async () => {
    if (!edit || !profile) return;
    if (!edit.title.trim() || !edit.body.trim()) return;
    setSaving(true);
    if (edit.id) {
      await supabase.from('quick_replies').update({
        shortcut: edit.shortcut.trim(),
        title: edit.title.trim(),
        body: edit.body.trim(),
        instance_id: edit.instance_id,
      }).eq('id', edit.id);
      setSavedId(edit.id);
      setTimeout(() => setSavedId(null), 1500);
    } else {
      await supabase.from('quick_replies').insert({
        user_id: profile.id,
        shortcut: edit.shortcut.trim(),
        title: edit.title.trim(),
        body: edit.body.trim(),
        instance_id: edit.instance_id,
        sort_order: replies.length,
      });
    }
    setSaving(false);
    setEdit(null);
    onReload();
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    await supabase.from('quick_replies').delete().eq('id', id);
    setDeletingId(null);
    onReload();
    if (edit?.id === id) setEdit(null);
  };

  const instanceLabel = (id: string | null) => {
    if (!id) return 'Todos';
    const inst = instances.find((i) => i.id === id);
    return inst?.display_name || inst?.instance_name || 'Agente';
  };

  return (
    <div className="flex flex-col border-l border-[#242424] bg-[#0a0a0a] w-72 shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={13} className="text-neutral-400" />
          <span className="text-xs font-medium text-white">Respostas Rápidas</span>
        </div>
        <div className="flex items-center gap-1">
          {!edit && (
            <button
              onClick={startCreate}
              className="text-neutral-500 hover:text-white transition-colors p-1"
              title="Nova resposta"
            >
              <Plus size={13} />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors p-1"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Create / edit form */}
        {edit && (
          <div className="p-3 border-b border-[#1a1a1a] space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-neutral-500">
              {edit.id ? 'Editar resposta' : 'Nova resposta'}
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1 block">Atalho</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-mono">/</span>
                <input
                  type="text"
                  value={edit.shortcut}
                  onChange={(e) => setEdit({ ...edit, shortcut: e.target.value.replace(/\s/g, '_').toLowerCase() })}
                  placeholder="saudacao"
                  className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg pl-6 pr-2.5 py-2 text-xs text-white font-mono placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1 block">
                Título <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                placeholder="Nome no seletor"
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-2.5 py-2 text-xs text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1 block">
                Mensagem <span className="text-red-400">*</span>
              </label>
              <textarea
                ref={bodyRef}
                value={edit.body}
                onChange={(e) => setEdit({ ...edit, body: e.target.value })}
                placeholder="Texto da mensagem..."
                rows={3}
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-2.5 py-2 text-xs text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors resize-none"
              />
            </div>

            {instances.length > 1 && (
              <div>
                <label className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1 block">Disponível em</label>
                <div className="relative">
                  <select
                    value={edit.instance_id || ''}
                    onChange={(e) => setEdit({ ...edit, instance_id: e.target.value || null })}
                    className="w-full appearance-none bg-[#050505] border border-[#1a1a1a] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-neutral-600 transition-colors pr-7"
                  >
                    <option value="">Todos os agentes</option>
                    {instances.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.display_name || inst.instance_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={save}
                disabled={saving || !edit.title.trim() || !edit.body.trim()}
                className="flex items-center gap-1.5 bg-white text-black rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-neutral-200 transition-colors disabled:opacity-40"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Salvar
              </button>
              <button
                onClick={cancel}
                className="text-xs text-neutral-500 hover:text-white px-2 py-1.5 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {replies.length === 0 && !edit ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Zap size={18} className="text-neutral-700 mb-3" strokeWidth={1.5} />
            <p className="text-xs text-neutral-600 mb-3">Nenhuma resposta ainda.</p>
            <button
              onClick={startCreate}
              className="text-xs bg-white text-black rounded-lg px-3 py-1.5 font-medium hover:bg-neutral-200 transition-colors flex items-center gap-1.5"
            >
              <Plus size={11} /> Criar
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#111]">
            {replies.map((r) => {
              const isSaved = savedId === r.id;
              return (
                <div key={r.id} className="group px-3 py-3 hover:bg-[#0d0d0d] transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => onInsert(r.body)}
                      className="min-w-0 flex-1 text-left"
                      title="Clique para inserir no chat"
                    >
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-xs text-white font-medium truncate">{r.title}</span>
                        {r.shortcut && (
                          <span className="text-[9px] font-mono bg-[#1a1a1a] border border-[#2a2a2a] text-neutral-500 px-1 py-0.5 rounded shrink-0">
                            /{r.shortcut}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-600 leading-relaxed line-clamp-2">{r.body}</p>
                      <span className="text-[9px] text-neutral-700 mt-0.5 block">{instanceLabel(r.instance_id)}</span>
                    </button>
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isSaved ? (
                        <Check size={11} className="text-emerald-400" />
                      ) : (
                        <button
                          onClick={() => startEdit(r)}
                          className="text-[10px] text-neutral-500 hover:text-white px-1.5 py-1 rounded border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors"
                        >
                          Editar
                        </button>
                      )}
                      <button
                        onClick={() => remove(r.id)}
                        disabled={deletingId === r.id}
                        className="p-1 text-neutral-600 hover:text-red-400 transition-colors"
                      >
                        {deletingId === r.id
                          ? <Loader2 size={11} className="animate-spin" />
                          : <Trash2 size={11} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Label chip ───────────────────────────────────────────────────────────────

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

// ─── Filter pill ──────────────────────────────────────────────────────────────

function FilterPill({
  active,
  onClick,
  amber,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  amber?: boolean;
  color?: string;
  children: React.ReactNode;
}) {
  if (amber) {
    return (
      <button
        onClick={onClick}
        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
          active
            ? 'bg-amber-950/40 border-amber-900/40 text-amber-400'
            : 'border-[#1a1a1a] text-neutral-500 hover:text-neutral-300'
        }`}
      >
        {children}
      </button>
    );
  }
  if (color) {
    return (
      <button
        onClick={onClick}
        className="text-[10px] px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap"
        style={
          active
            ? { background: color + '22', color, border: `1px solid ${color}55` }
            : { borderColor: '#1a1a1a', color: '#737373' }
        }
      >
        {children}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
        active
          ? 'bg-white/10 border-white/20 text-white'
          : 'border-[#1a1a1a] text-neutral-500 hover:text-neutral-300'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Main ChatPage ────────────────────────────────────────────────────────────

export function ChatPage({ instance, instances }: { instance: Instance; instances: Instance[] }) {
  const { profile } = useAuth();

  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatLog[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [loadingThread, setLoadingThread] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [qrQuery, setQrQuery] = useState('');
  const [showQRPanel, setShowQRPanel] = useState(false);
  const [showMobileThread, setShowMobileThread] = useState(false);

  const threadRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLTextAreaElement>(null);

  const loadContacts = useCallback(async () => {
    const [logsRes, statesRes, labelsRes] = await Promise.all([
      supabase
        .from('chat_logs')
        .select('customer_number, message_body, created_at')
        .eq('instance_id', instance.id)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('conversation_states')
        .select('customer_number, manual_override, contact_name')
        .eq('instance_id', instance.id),
      supabase
        .from('contact_labels')
        .select('*')
        .eq('instance_id', instance.id),
    ]);

    const stateMap = new Map<string, { manual: boolean; name: string | null }>();
    (statesRes.data || []).forEach((s: { customer_number: string; manual_override: boolean; contact_name: string | null }) =>
      stateMap.set(s.customer_number, { manual: s.manual_override, name: s.contact_name })
    );

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
          labels: labelMap.get(row.customer_number) || [],
        });
      }
    }

    const list = Array.from(seen.values()).sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
    );
    setContacts(list);
    setSelected((prev) => {
      if (!prev && list.length > 0) return list[0].number;
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

  useEffect(() => {
    loadContacts();
    loadQuickReplies();
    const channel = supabase
      .channel(`chat_list:${instance.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_logs',
        filter: `instance_id=eq.${instance.id}`,
      }, loadContacts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [instance.id]);

  const loadThread = async (number: string) => {
    setLoadingThread(true);
    setShowMobileThread(true);
    const { data } = await supabase
      .from('chat_logs')
      .select('*')
      .eq('instance_id', instance.id)
      .eq('customer_number', number)
      .order('created_at', { ascending: true })
      .limit(200);
    setThread(data || []);
    setLoadingThread(false);
    setTimeout(() => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight }), 50);
  };

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
        if (row.customer_number === selected) {
          setThread((prev) => [...prev, row]);
          setTimeout(() => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight }), 50);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected, instance.id]);

  const sendReply = async () => {
    if (!selected || !draft.trim()) return;
    setSending(true);
    try {
      await evolution.sendMessage(instance.id, selected, draft.trim());
      setDraft('');
      setShowQR(false);
      loadContacts();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const toggleManual = async () => {
    if (!selected) return;
    const current = contacts.find((c) => c.number === selected);
    const next = !(current?.manual ?? false);
    try {
      await evolution.setManualOverride(instance.id, selected, next);
      loadContacts();
    } catch (e) {
      console.error(e);
    }
  };

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

  const selectedContact = contacts.find((c) => c.number === selected);
  const contactName = selectedContact?.name ?? null;

  const allLabels = Array.from(
    new Map(contacts.flatMap((c) => c.labels).map((l) => [l.label, l])).values()
  );

  const filteredContacts = contacts.filter((c) => {
    const matchSearch =
      c.number.includes(search) ||
      (c.name || '').toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (activeFilter === 'manual') return c.manual;
    if (activeFilter !== 'all') return c.labels.some((l) => l.label === activeFilter);
    return true;
  });

  const manualCount = contacts.filter((c) => c.manual).length;

  // keep LABEL_COLORS import alive (used by ContactLabel color logic in future)
  void LABEL_COLORS;

  return (
    <div className="space-y-4">
      <div className="hidden lg:block">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Chat</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Histórico por contato com possibilidade de resposta manual.
        </p>
      </div>

      <div
        className="border border-[#242424] rounded-xl bg-[#141414] overflow-hidden"
        style={{
          height: 'calc(100vh - 200px)',
          minHeight: 400,
        }}
      >
        <div
          className="h-full hidden lg:grid"
          style={{
            gridTemplateColumns: showQRPanel ? '240px 1fr 288px' : '240px 1fr',
          }}
        >
        {/* ── LEFT: contacts ── */}
        <div className="border-r border-[#242424] flex flex-col min-w-0 overflow-hidden">
          <div className="p-3 border-b border-[#242424] space-y-2">
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input
                type="text"
                placeholder="Buscar contato"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#363636] transition-colors"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              <FilterPill active={activeFilter === 'all'} onClick={() => setActiveFilter('all')}>
                Todos ({contacts.length})
              </FilterPill>
              {manualCount > 0 && (
                <FilterPill active={activeFilter === 'manual'} onClick={() => setActiveFilter('manual')} amber>
                  Manual ({manualCount})
                </FilterPill>
              )}
              {allLabels.map((l) => {
                const cnt = contacts.filter((c) => c.labels.some((cl) => cl.label === l.label)).length;
                return (
                  <FilterPill key={l.label} active={activeFilter === l.label} onClick={() => setActiveFilter(l.label)} color={l.color}>
                    {l.label} ({cnt})
                  </FilterPill>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-16 px-4">
                <MessagesSquare size={20} className="text-neutral-700 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-xs text-neutral-600">Nenhum contato</p>
              </div>
            ) : (
              filteredContacts.map((c) => {
                const isActive = c.number === selected;
                return (
                  <button
                    key={c.number}
                    onClick={() => setSelected(c.number)}
                    className={`w-full text-left px-3 py-3 border-b border-[#1a1a1a] transition-colors ${
                      isActive ? 'bg-[#1a1a1a]' : 'hover:bg-[#0d0d0d]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-mono text-white truncate flex-1">
                        {c.name || c.number}
                      </span>
                      <span className="text-[10px] text-neutral-600 shrink-0 ml-1">
                        {new Date(c.lastAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {c.name && (
                      <div className="text-[10px] text-neutral-600 font-mono mb-0.5">{c.number}</div>
                    )}
                    <p className="text-[11px] text-neutral-500 truncate">{c.lastMessage}</p>
                    {(c.manual || c.labels.length > 0) && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {c.manual && (
                          <span className="text-[9px] bg-amber-950/40 border border-amber-900/40 text-amber-400 px-1.5 py-0.5 rounded">
                            Manual
                          </span>
                        )}
                        {c.labels.slice(0, 2).map((l) => (
                          <span
                            key={l.id}
                            className="text-[9px] px-1.5 py-0.5 rounded"
                            style={{ background: l.color + '22', color: l.color, border: `1px solid ${l.color}44` }}
                          >
                            {l.label}
                          </span>
                        ))}
                        {c.labels.length > 2 && (
                          <span className="text-[9px] text-neutral-600">+{c.labels.length - 2}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── CENTER: thread ── */}
        <div className="flex flex-col min-w-0 overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-neutral-600">Selecione um contato</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-[#242424] flex items-center justify-between gap-3">
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
                <div className="flex items-center gap-2 shrink-0">
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

              <div ref={threadRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3 bg-[#0a0a0a]">
                {loadingThread ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 size={16} className="text-neutral-600 animate-spin" />
                  </div>
                ) : (
                  thread.map((m) => {
                    const isIn = m.direction === 'in';
                    return (
                      <div key={m.id} className={`flex gap-2 ${isIn ? 'justify-start' : 'justify-end'}`}>
                        {isIn && (
                          <div className="w-6 h-6 rounded-full bg-[#141414] border border-[#242424] flex items-center justify-center shrink-0">
                            <User size={11} className="text-neutral-500" />
                          </div>
                        )}
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                            isIn
                              ? 'bg-[#1a1a1a] border border-[#242424] text-neutral-200 rounded-tl-sm'
                              : 'bg-white text-black rounded-tr-sm'
                          }`}
                        >
                          {m.media_type === 'audio' && m.media_url ? (
                            <audio
                              controls
                              preload="metadata"
                              className="max-w-full h-8"
                              style={{ minWidth: 200 }}
                            >
                              <source src={m.media_url} />
                            </audio>
                          ) : m.media_type === 'image' && m.media_url ? (
                            <img
                              src={m.media_url}
                              alt="Imagem"
                              className="max-w-full rounded-lg max-h-64 object-contain"
                            />
                          ) : (
                            <p className="whitespace-pre-wrap break-words">{m.message_body}</p>
                          )}
                          <div className={`text-[9px] mt-1 ${isIn ? 'text-neutral-600' : 'text-neutral-500'}`}>
                            {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {!isIn && (
                          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                            <Bot size={11} className="text-black" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 border-t border-[#242424] bg-[#141414]">
                <div className="relative flex items-end gap-2">
                  {showQR && (
                    <QuickReplyPicker
                      replies={quickReplies}
                      query={qrQuery}
                      onSelect={applyQuickReply}
                      onClose={() => { setShowQR(false); setQrQuery(''); }}
                    />
                  )}
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
                  <textarea
                    ref={composeRef}
                    value={draft}
                    onChange={(e) => handleDraftChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
                      if (e.key === 'Escape') { setShowQR(false); setQrQuery(''); }
                    }}
                    placeholder="Escreva uma resposta… ou / para respostas rápidas"
                    rows={1}
                    className="flex-1 bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#363636] resize-none max-h-32 transition-colors"
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !draft.trim()}
                    className="mb-0.5 bg-white text-black rounded-lg p-2.5 hover:bg-neutral-200 transition-colors disabled:opacity-40"
                  >
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
                <p className="text-[10px] text-neutral-600 mt-2">
                  Enviar uma mensagem ativa o modo manual, pausando o bot para este contato.
                </p>
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT: quick replies panel ── */}
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

        {/* ── MOBILE LAYOUT ── */}
        <div className="lg:hidden h-full flex flex-col">
          {!showMobileThread ? (
            /* Mobile: contacts list */
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-3 border-b border-[#242424] space-y-2">
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                  <input
                    type="text"
                    placeholder="Buscar contato"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#363636] transition-colors"
                  />
                </div>
                <div className="flex gap-1 flex-wrap">
                  <FilterPill active={activeFilter === 'all'} onClick={() => setActiveFilter('all')}>
                    Todos ({contacts.length})
                  </FilterPill>
                  {manualCount > 0 && (
                    <FilterPill active={activeFilter === 'manual'} onClick={() => setActiveFilter('manual')} amber>
                      Manual ({manualCount})
                    </FilterPill>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <MessagesSquare size={20} className="text-neutral-700 mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-xs text-neutral-600">Nenhum contato</p>
                  </div>
                ) : (
                  filteredContacts.map((c) => (
                    <button
                      key={c.number}
                      onClick={() => { setSelected(c.number); loadThread(c.number); }}
                      className="w-full text-left px-3 py-3 border-b border-[#1a1a1a] hover:bg-[#0d0d0d] transition-colors"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-mono text-white truncate flex-1">
                          {c.name || c.number}
                        </span>
                        <span className="text-[10px] text-neutral-600 shrink-0 ml-1">
                          {new Date(c.lastAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 truncate">{c.lastMessage}</p>
                      {c.manual && (
                        <span className="text-[9px] bg-amber-950/40 border border-amber-900/40 text-amber-400 px-1.5 py-0.5 rounded mt-1 inline-block">
                          Manual
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Mobile: thread view */
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-3 py-2.5 border-b border-[#242424] flex items-center gap-3">
                <button
                  onClick={() => setShowMobileThread(false)}
                  className="text-neutral-400 hover:text-white p-1 transition-colors"
                >
                  <X size={16} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white font-medium truncate">
                    {contactName || <span className="font-mono text-xs">{selected}</span>}
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    {selectedContact?.manual ? 'Modo manual' : 'Bot ativo'}
                  </div>
                </div>
                <button
                  onClick={toggleManual}
                  className={`text-[10px] px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-colors ${
                    selectedContact?.manual
                      ? 'bg-amber-950/30 border-amber-900/40 text-amber-400'
                      : 'border-[#242424] text-neutral-400'
                  }`}
                >
                  <Hand size={10} />
                  {selectedContact?.manual ? 'Retomar' : 'Manual'}
                </button>
              </div>

              <div ref={threadRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2.5 bg-[#0a0a0a]">
                {loadingThread ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 size={16} className="text-neutral-600 animate-spin" />
                  </div>
                ) : (
                  thread.map((m) => {
                    const isIn = m.direction === 'in';
                    return (
                      <div key={m.id} className={`flex gap-1.5 ${isIn ? 'justify-start' : 'justify-end'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                            isIn
                              ? 'bg-[#1a1a1a] border border-[#242424] text-neutral-200 rounded-tl-sm'
                              : 'bg-white text-black rounded-tr-sm'
                          }`}
                        >
                          {m.media_type === 'audio' && m.media_url ? (
                            <audio controls preload="metadata" className="max-w-full h-8" style={{ minWidth: 160 }}>
                              <source src={m.media_url} />
                            </audio>
                          ) : m.media_type === 'image' && m.media_url ? (
                            <img src={m.media_url} alt="Imagem" className="max-w-full rounded-lg max-h-48 object-contain" />
                          ) : (
                            <p className="whitespace-pre-wrap break-words">{m.message_body}</p>
                          )}
                          <div className={`text-[9px] mt-1 ${isIn ? 'text-neutral-600' : 'text-neutral-500'}`}>
                            {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-2.5 border-t border-[#242424] bg-[#141414]">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={composeRef}
                    value={draft}
                    onChange={(e) => handleDraftChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
                    }}
                    placeholder="Mensagem..."
                    rows={1}
                    className="flex-1 bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#363636] resize-none max-h-24 transition-colors"
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !draft.trim()}
                    className="bg-white text-black rounded-lg p-2.5 hover:bg-neutral-200 transition-colors disabled:opacity-40"
                  >
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}