import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Search, Send, Loader2, User, Bot, Hand, MessagesSquare,
  Zap, Tag, StickyNote, ChevronRight, ChevronLeft, Trash2, Plus, X, Check, Pencil,
} from 'lucide-react';
import { supabase, ChatLog, Instance, QuickReply, ContactNote, ContactLabel, LABEL_COLORS } from '../../lib/supabase';
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

// ─── Quick-reply popover ──────────────────────────────────────────────────────

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

// ─── Label chip ───────────────────────────────────────────────────────────────

function LabelChip({ label, onRemove }: { label: ContactLabel; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
      style={{ background: label.color + '22', color: label.color, border: `1px solid ${label.color}44` }}
    >
      {label.label}
      {onRemove && (
        <button onClick={onRemove} className="opacity-60 hover:opacity-100 transition-opacity">
          <X size={9} />
        </button>
      )}
    </span>
  );
}

// ─── Inline Save icon (avoids re-importing) ───────────────────────────────────

function SaveIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

// ─── Contact detail panel ─────────────────────────────────────────────────────

function ContactPanel({
  instanceId,
  number,
  contactName,
  labels,
  notes,
  messageCount,
  firstContact,
  onNameSaved,
  onLabelsChanged,
  onNotesChanged,
}: {
  instanceId: string;
  number: string;
  contactName: string | null;
  labels: ContactLabel[];
  notes: ContactNote[];
  messageCount: number;
  firstContact: string | null;
  onNameSaved: (name: string) => void;
  onLabelsChanged: () => void;
  onNotesChanged: () => void;
}) {
  const [nameEdit, setNameEdit] = useState(contactName || '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [labelColor, setLabelColor] = useState(LABEL_COLORS[0]);
  const [addingLabel, setAddingLabel] = useState(false);
  const [savingLabel, setSavingLabel] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  useEffect(() => {
    setNameEdit(contactName || '');
  }, [contactName, number]);

  const saveName = async () => {
    setNameSaving(true);
    await supabase
      .from('conversation_states')
      .upsert(
        { instance_id: instanceId, customer_number: number, contact_name: nameEdit.trim() || null },
        { onConflict: 'instance_id,customer_number' }
      );
    setNameSaving(false);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 1500);
    onNameSaved(nameEdit.trim());
  };

  const saveLabel = async () => {
    if (!newLabel.trim()) return;
    setSavingLabel(true);
    await supabase.from('contact_labels').upsert(
      { instance_id: instanceId, customer_number: number, label: newLabel.trim(), color: labelColor },
      { onConflict: 'instance_id,customer_number,label' }
    );
    setSavingLabel(false);
    setNewLabel('');
    setAddingLabel(false);
    onLabelsChanged();
  };

  const removeLabel = async (id: string) => {
    await supabase.from('contact_labels').delete().eq('id', id);
    onLabelsChanged();
  };

  const saveNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    await supabase.from('contact_notes').insert({
      instance_id: instanceId,
      customer_number: number,
      content: noteText.trim(),
    });
    setSavingNote(false);
    setNoteText('');
    onNotesChanged();
  };

  const deleteNote = async (id: string) => {
    setDeletingNoteId(id);
    await supabase.from('contact_notes').delete().eq('id', id);
    setDeletingNoteId(null);
    onNotesChanged();
  };

  return (
    <div className="flex flex-col overflow-y-auto scrollbar-thin border-l border-[#242424] bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1a1a1a]">
        <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Contato</div>
        <div className="text-sm font-mono text-white break-all">{number}</div>
        {messageCount > 0 && (
          <div className="text-[10px] text-neutral-600 mt-0.5">
            {messageCount} mensagens
            {firstContact && ` · desde ${new Date(firstContact).toLocaleDateString('pt-BR')}`}
          </div>
        )}
      </div>

      {/* Name / alias */}
      <div className="px-4 py-3 border-b border-[#1a1a1a]">
        <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
          <Pencil size={9} /> Apelido
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={nameEdit}
            onChange={(e) => setNameEdit(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveName(); }}
            placeholder="Nome do contato"
            className="flex-1 min-w-0 bg-[#050505] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors"
          />
          <button
            onClick={saveName}
            disabled={nameSaving}
            className="text-neutral-400 hover:text-white transition-colors p-1.5 shrink-0"
          >
            {nameSaving
              ? <Loader2 size={12} className="animate-spin" />
              : nameSaved
              ? <Check size={12} className="text-emerald-400" />
              : <SaveIcon size={12} />}
          </button>
        </div>
      </div>

      {/* Labels */}
      <div className="px-4 py-3 border-b border-[#1a1a1a]">
        <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5"><Tag size={9} /> Etiquetas</span>
          <button onClick={() => setAddingLabel((v) => !v)} className="text-neutral-600 hover:text-white transition-colors">
            <Plus size={11} />
          </button>
        </div>

        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {labels.map((l) => (
              <LabelChip key={l.id} label={l} onRemove={() => removeLabel(l.id)} />
            ))}
          </div>
        )}

        {addingLabel && (
          <div className="space-y-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(); if (e.key === 'Escape') setAddingLabel(false); }}
              placeholder="Nome da etiqueta"
              autoFocus
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600"
            />
            <div className="flex flex-wrap gap-1.5">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setLabelColor(c)}
                  className="w-4 h-4 rounded-full transition-transform"
                  style={{
                    background: c,
                    transform: labelColor === c ? 'scale(1.3)' : 'scale(1)',
                    outline: labelColor === c ? `2px solid ${c}55` : 'none',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
            <button
              onClick={saveLabel}
              disabled={savingLabel || !newLabel.trim()}
              className="text-[11px] bg-white text-black rounded px-2.5 py-1 font-medium disabled:opacity-40 hover:bg-neutral-200 transition-colors flex items-center gap-1"
            >
              {savingLabel ? <Loader2 size={10} className="animate-spin" /> : 'Adicionar'}
            </button>
          </div>
        )}

        {labels.length === 0 && !addingLabel && (
          <p className="text-[11px] text-neutral-700">Sem etiquetas</p>
        )}
      </div>

      {/* Notes */}
      <div className="px-4 py-3 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
          <StickyNote size={9} /> Notas internas
        </div>

        <div className="space-y-2 mb-3">
          {notes.length === 0 && <p className="text-[11px] text-neutral-700">Sem notas ainda</p>}
          {notes.map((n) => (
            <div key={n.id} className="group bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2">
              <p className="text-[11px] text-neutral-300 leading-relaxed whitespace-pre-wrap">{n.content}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[9px] text-neutral-700">
                  {new Date(n.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                <button
                  onClick={() => deleteNote(n.id)}
                  disabled={deletingNoteId === n.id}
                  className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-400 transition-all"
                >
                  {deletingNoteId === n.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Adicionar nota..."
          rows={2}
          className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-2.5 py-2 text-xs text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 resize-none transition-colors"
        />
        <button
          onClick={saveNote}
          disabled={savingNote || !noteText.trim()}
          className="mt-1.5 text-[11px] bg-white text-black rounded px-2.5 py-1 font-medium disabled:opacity-40 hover:bg-neutral-200 transition-colors flex items-center gap-1"
        >
          {savingNote ? <Loader2 size={10} className="animate-spin" /> : <><Plus size={10} /> Salvar nota</>}
        </button>
      </div>
    </div>
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

export function ChatPage({ instance }: { instance: Instance }) {
  const { profile } = useAuth();

  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatLog[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [loadingThread, setLoadingThread] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [showPanel, setShowPanel] = useState(true);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [qrQuery, setQrQuery] = useState('');

  const [panelNotes, setPanelNotes] = useState<ContactNote[]>([]);
  const [panelLabels, setPanelLabels] = useState<ContactLabel[]>([]);
  const [panelMsgCount, setPanelMsgCount] = useState(0);
  const [panelFirstContact, setPanelFirstContact] = useState<string | null>(null);

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

  const loadPanelData = useCallback(async (number: string) => {
    const [notesRes, labelsRes, firstRes] = await Promise.all([
      supabase
        .from('contact_notes')
        .select('*')
        .eq('instance_id', instance.id)
        .eq('customer_number', number)
        .order('created_at', { ascending: false }),
      supabase
        .from('contact_labels')
        .select('*')
        .eq('instance_id', instance.id)
        .eq('customer_number', number),
      supabase
        .from('chat_logs')
        .select('id, created_at')
        .eq('instance_id', instance.id)
        .eq('customer_number', number)
        .order('created_at', { ascending: true })
        .limit(1),
    ]);
    setPanelNotes(notesRes.data || []);
    setPanelLabels(labelsRes.data || []);
    setPanelFirstContact(firstRes.data?.[0]?.created_at ?? null);
  }, [instance.id]);

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

  useEffect(() => {
    if (!selected) return;
    loadPanelData(selected);
    // get total count separately
    supabase
      .from('chat_logs')
      .select('id', { count: 'exact', head: true })
      .eq('instance_id', instance.id)
      .eq('customer_number', selected)
      .then(({ count }) => setPanelMsgCount(count || 0));
  }, [selected]);

  const loadThread = async (number: string) => {
    setLoadingThread(true);
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
    setTimeout(() => composeRef.current?.focus(), 50);
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Chat</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Histórico por contato com possibilidade de resposta manual.
        </p>
      </div>

      <div
        className="border border-[#242424] rounded-xl bg-[#141414] overflow-hidden"
        style={{
          height: 'calc(100vh - 200px)',
          display: 'grid',
          gridTemplateColumns: showPanel && selected ? '240px 1fr 220px' : '240px 1fr',
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
                  <button
                    onClick={() => setShowPanel((v) => !v)}
                    className="text-neutral-500 hover:text-white transition-colors p-1"
                    title={showPanel ? 'Ocultar painel' : 'Mostrar painel do contato'}
                  >
                    {showPanel ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
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
                          <p className="whitespace-pre-wrap break-words">{m.message_body}</p>
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
                    onClick={() => { setShowQR((v) => !v); setQrQuery(''); }}
                    title="Respostas rápidas"
                    className={`mb-0.5 p-2 rounded-lg border transition-colors shrink-0 ${
                      showQR
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

        {/* ── RIGHT: contact panel ── */}
        {showPanel && selected && (
          <ContactPanel
            instanceId={instance.id}
            number={selected}
            contactName={contactName}
            labels={panelLabels}
            notes={panelNotes}
            messageCount={panelMsgCount}
            firstContact={panelFirstContact}
            onNameSaved={(name) => {
              setContacts((prev) =>
                prev.map((c) => c.number === selected ? { ...c, name: name || null } : c)
              );
            }}
            onLabelsChanged={() => {
              loadPanelData(selected);
              loadContacts();
            }}
            onNotesChanged={() => loadPanelData(selected)}
          />
        )}
      </div>
    </div>
  );
}


export { ChatPage }