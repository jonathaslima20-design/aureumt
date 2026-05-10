import { useEffect, useRef, useState } from 'react';
import { Search, Send, Loader2, User, Bot, Hand, MessagesSquare } from 'lucide-react';
import { supabase, ChatLog, Instance } from '../../lib/supabase';
import { evolution } from '../../lib/evolution';

type ContactSummary = {
  number: string;
  lastMessage: string;
  lastAt: string;
  manual: boolean;
};

export function ConversationsPage({ instance }: { instance: Instance }) {
  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatLog[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [loadingThread, setLoadingThread] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const loadContacts = async () => {
    const { data: logs } = await supabase
      .from('chat_logs')
      .select('customer_number, message_body, created_at')
      .eq('instance_id', instance.id)
      .order('created_at', { ascending: false })
      .limit(500);

    const { data: states } = await supabase
      .from('conversation_states')
      .select('customer_number, manual_override')
      .eq('instance_id', instance.id);

    const stateMap = new Map<string, boolean>();
    (states || []).forEach((s) => stateMap.set(s.customer_number, s.manual_override));

    const seen = new Map<string, ContactSummary>();
    for (const row of logs || []) {
      if (!seen.has(row.customer_number)) {
        seen.set(row.customer_number, {
          number: row.customer_number,
          lastMessage: row.message_body,
          lastAt: row.created_at,
          manual: stateMap.get(row.customer_number) || false,
        });
      }
    }

    const list = Array.from(seen.values()).sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
    );
    setContacts(list);
    if (!selected && list.length > 0) setSelected(list[0].number);
  };

  useEffect(() => {
    loadContacts();
    const channel = supabase
      .channel(`conv_list:${instance.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_logs',
          filter: `instance_id=eq.${instance.id}`,
        },
        () => loadContacts()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [instance.id]);

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
    setTimeout(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
    }, 50);
  };

  useEffect(() => {
    if (!selected) return;
    loadThread(selected);
    const channel = supabase
      .channel(`conv_thread:${instance.id}:${selected}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_logs',
          filter: `instance_id=eq.${instance.id}`,
        },
        (payload) => {
          const row = payload.new as ChatLog;
          if (row.customer_number === selected) {
            setThread((prev) => [...prev, row]);
            setTimeout(() => {
              threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
            }, 50);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selected, instance.id]);

  const sendReply = async () => {
    if (!selected || !draft.trim()) return;
    setSending(true);
    try {
      await evolution.sendMessage(instance.id, selected, draft.trim());
      setDraft('');
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

  const selectedContact = contacts.find((c) => c.number === selected);
  const filteredContacts = contacts.filter((c) => c.number.includes(search));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Conversas</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Histórico por contato com possibilidade de resposta manual.
        </p>
      </div>

      <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] overflow-hidden grid grid-cols-1 md:grid-cols-3 h-[calc(100vh-220px)]">
        <div className="border-r border-[#1a1a1a] flex flex-col">
          <div className="p-3 border-b border-[#1a1a1a]">
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input
                type="text"
                placeholder="Buscar contato"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-16 px-4">
                <MessagesSquare size={20} className="text-neutral-700 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-xs text-neutral-600">Nenhum contato ainda</p>
              </div>
            ) : (
              filteredContacts.map((c) => {
                const active = c.number === selected;
                return (
                  <button
                    key={c.number}
                    onClick={() => setSelected(c.number)}
                    className={`w-full text-left px-4 py-3 border-b border-[#111] transition-colors ${
                      active ? 'bg-[#111]' : 'hover:bg-[#0d0d0d]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-white">{c.number}</span>
                      <span className="text-[10px] text-neutral-600">
                        {new Date(c.lastAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] text-neutral-500 truncate flex-1">{c.lastMessage}</p>
                      {c.manual && (
                        <span className="shrink-0 text-[9px] bg-amber-950/40 border border-amber-900/40 text-amber-400 px-1.5 py-0.5 rounded">
                          Manual
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="md:col-span-2 flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-neutral-600">Selecione um contato</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between">
                <div>
                  <div className="text-sm text-white font-mono">{selected}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    {selectedContact?.manual
                      ? 'Modo manual ativo — o bot não responderá'
                      : 'Bot respondendo automaticamente'}
                  </div>
                </div>
                <button
                  onClick={toggleManual}
                  className={`text-[11px] px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
                    selectedContact?.manual
                      ? 'bg-amber-950/30 border-amber-900/40 text-amber-400 hover:bg-amber-950/50'
                      : 'border-[#1a1a1a] text-neutral-400 hover:text-white hover:border-[#262626]'
                  }`}
                >
                  <Hand size={11} />
                  {selectedContact?.manual ? 'Retomar bot' : 'Assumir manual'}
                </button>
              </div>

              <div
                ref={threadRef}
                className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3 bg-[#050505]"
              >
                {loadingThread ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 size={16} className="text-neutral-600 animate-spin" />
                  </div>
                ) : (
                  thread.map((m) => {
                    const isIn = m.direction === 'in';
                    return (
                      <div
                        key={m.id}
                        className={`flex gap-2 ${isIn ? 'justify-start' : 'justify-end'}`}
                      >
                        {isIn && (
                          <div className="w-6 h-6 rounded-full bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-center shrink-0">
                            <User size={11} className="text-neutral-500" />
                          </div>
                        )}
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                            isIn
                              ? 'bg-[#0d0d0d] border border-[#1a1a1a] text-neutral-200 rounded-tl-sm'
                              : 'bg-white text-black rounded-tr-sm'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.message_body}</p>
                          <div
                            className={`text-[9px] mt-1 ${
                              isIn ? 'text-neutral-600' : 'text-neutral-500'
                            }`}
                          >
                            {new Date(m.created_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
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

              <div className="p-3 border-t border-[#1a1a1a] bg-[#0a0a0a]">
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                    placeholder="Escreva uma resposta manual..."
                    rows={1}
                    className="flex-1 bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 resize-none max-h-32"
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !draft.trim()}
                    className="bg-white text-black rounded-lg p-2.5 hover:bg-neutral-200 transition-colors disabled:opacity-40"
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
      </div>
    </div>
  );
}
