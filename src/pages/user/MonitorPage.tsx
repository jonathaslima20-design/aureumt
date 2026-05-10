import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, MessageSquare, Pause, Play, Search } from 'lucide-react';
import { supabase, ChatLog, Instance } from '../../lib/supabase';

type Filter = 'all' | 'in' | 'out';

export function MonitorPage({ instance }: { instance: Instance }) {
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('chat_logs')
      .select('*')
      .eq('instance_id', instance.id)
      .order('created_at', { ascending: false })
      .limit(100);
    setLogs(data || []);
  };

  useEffect(() => {
    fetchLogs();
    const channel = supabase
      .channel(`chat_logs_monitor:${instance.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_logs',
          filter: `instance_id=eq.${instance.id}`,
        },
        () => {
          if (!pausedRef.current) fetchLogs();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [instance.id]);

  const filtered = logs.filter((l) => {
    if (filter !== 'all' && l.direction !== filter) return false;
    if (search && !l.customer_number.includes(search) && !l.message_body.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Monitor ao Vivo</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Fluxo em tempo real de <span className="text-neutral-300">{instance.instance_name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-[11px] text-neutral-500 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                paused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse-subtle'
              }`}
            />
            {paused ? 'Pausado' : 'Ao vivo'}
          </div>
          <button
            onClick={() => setPaused((p) => !p)}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-[#1a1a1a] text-neutral-300 hover:text-white hover:border-[#262626] transition-colors"
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
            {paused ? 'Retomar' : 'Pausar'}
          </button>
        </div>
      </div>

      <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a]">
        <div className="p-4 border-b border-[#1a1a1a] flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-[#050505] border border-[#1a1a1a] rounded-lg p-1">
            {(['all', 'in', 'out'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[11px] px-3 py-1.5 rounded-md transition-colors ${
                  filter === f ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {f === 'all' ? 'Todas' : f === 'in' ? 'Entrada' : 'Saída'}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[220px] relative">
            <Search
              size={12}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
            />
            <input
              type="text"
              placeholder="Buscar por número ou texto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
            />
          </div>
        </div>

        <div className="p-4 space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-thin">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare size={22} className="text-neutral-700 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-xs text-neutral-600">Nenhuma mensagem corresponde ao filtro</p>
            </div>
          ) : (
            filtered.map((log) => (
              <div
                key={log.id}
                className="border border-[#151515] rounded-lg px-3 py-2.5 hover:bg-[#0d0d0d] transition-colors animate-fade-in"
              >
                <div className="flex items-center gap-2 text-[10px] mb-1">
                  {log.direction === 'in' ? (
                    <ArrowDownLeft size={10} className="text-blue-400" />
                  ) : (
                    <ArrowUpRight size={10} className="text-emerald-400" />
                  )}
                  <span className="text-neutral-500 font-mono">{log.customer_number}</span>
                  {log.tokens_used > 0 && (
                    <span className="text-neutral-700 font-mono">{log.tokens_used} tk</span>
                  )}
                  <span className="text-neutral-700 ml-auto">
                    {new Date(log.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">{log.message_body}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
