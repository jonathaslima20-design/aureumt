import { useEffect, useState } from 'react';
import { MessageSquare, Zap, Users, AlertTriangle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { supabase, Instance, ChatLog } from '../../lib/supabase';

type Metrics = {
  messagesToday: number;
  tokensToday: number;
  activeContacts: number;
  overflowRate: number;
};

export function OverviewPage({ instance }: { instance: Instance }) {
  const [metrics, setMetrics] = useState<Metrics>({
    messagesToday: 0,
    tokensToday: 0,
    activeContacts: 0,
    overflowRate: 0,
  });
  const [last, setLast] = useState<ChatLog[]>([]);
  const [series, setSeries] = useState<{ day: string; count: number }[]>([]);

  useEffect(() => {
    const run = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sevenAgo = new Date();
      sevenAgo.setDate(sevenAgo.getDate() - 6);
      sevenAgo.setHours(0, 0, 0, 0);

      const { data: recent } = await supabase
        .from('chat_logs')
        .select('direction, message_body, tokens_used, created_at, customer_number')
        .eq('instance_id', instance.id)
        .gte('created_at', sevenAgo.toISOString())
        .order('created_at', { ascending: false });

      const rows = recent || [];

      const todayRows = rows.filter((r) => new Date(r.created_at) >= today);
      const contacts = new Set(rows.map((r) => r.customer_number));
      const overflow = (instance.overflow_keyword || '').toLowerCase();
      const overflowCount = overflow
        ? rows.filter((r) => r.direction === 'in' && r.message_body.toLowerCase().includes(overflow)).length
        : 0;
      const incoming = rows.filter((r) => r.direction === 'in').length || 1;

      setMetrics({
        messagesToday: todayRows.length,
        tokensToday: todayRows.reduce((acc, r) => acc + (r.tokens_used || 0), 0),
        activeContacts: contacts.size,
        overflowRate: Math.round((overflowCount / incoming) * 100),
      });

      const daysMap = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        daysMap.set(d.toISOString().slice(0, 10), 0);
      }
      for (const r of rows) {
        const k = new Date(r.created_at).toISOString().slice(0, 10);
        if (daysMap.has(k)) daysMap.set(k, (daysMap.get(k) || 0) + 1);
      }
      setSeries(Array.from(daysMap.entries()).map(([day, count]) => ({ day, count })));

      const { data: latest } = await supabase
        .from('chat_logs')
        .select('*')
        .eq('instance_id', instance.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setLast(latest || []);
    };
    run();
  }, [instance.id, instance.overflow_keyword]);

  const maxCount = Math.max(1, ...series.map((s) => s.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Visão Geral</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Desempenho do agente <span className="text-neutral-300">{instance.instance_name}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={MessageSquare} label="Mensagens hoje" value={metrics.messagesToday.toString()} />
        <MetricCard icon={Zap} label="Tokens hoje" value={metrics.tokensToday.toLocaleString('pt-BR')} />
        <MetricCard icon={Users} label="Contatos ativos" value={metrics.activeContacts.toString()} />
        <MetricCard icon={AlertTriangle} label="Taxa transbordo" value={`${metrics.overflowRate}%`} />
      </div>

      <div className="border border-[#242424] rounded-xl bg-[#141414] p-6">
        <div className="text-xs uppercase tracking-wider text-neutral-500 mb-4">Mensagens nos últimos 7 dias</div>
        <div className="flex items-end gap-2 h-40">
          {series.map((s) => (
            <div key={s.day} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full bg-white/90 rounded-t transition-all"
                  style={{ height: `${(s.count / maxCount) * 100}%`, minHeight: s.count > 0 ? 4 : 0 }}
                />
              </div>
              <div className="text-[10px] text-neutral-500 font-mono">
                {new Date(s.day + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-[#242424] rounded-xl bg-[#141414] p-6">
        <div className="text-xs uppercase tracking-wider text-neutral-500 mb-4">Últimas mensagens</div>
        {last.length === 0 ? (
          <p className="text-xs text-neutral-600 py-6 text-center">Nenhuma mensagem ainda</p>
        ) : (
          <div className="space-y-2">
            {last.map((log) => (
              <div
                key={log.id}
                className="border border-[#1c1c1c] rounded-lg px-3 py-2.5 flex items-center gap-3 bg-[#0d0d0d]"
              >
                {log.direction === 'in' ? (
                  <ArrowDownLeft size={12} className="text-blue-400 shrink-0" />
                ) : (
                  <ArrowUpRight size={12} className="text-emerald-400 shrink-0" />
                )}
                <span className="text-[11px] text-neutral-500 font-mono shrink-0">
                  {log.customer_number}
                </span>
                <p className="text-xs text-neutral-300 truncate flex-1">{log.message_body}</p>
                <span className="text-[10px] text-neutral-600 shrink-0">
                  {new Date(log.created_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MessageSquare;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-[#242424] rounded-xl bg-[#141414] p-4 hover:border-[#2e2e2e] transition-colors">
      <div className="flex items-center gap-2 text-neutral-500 mb-3">
        <Icon size={13} strokeWidth={1.8} />
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-white tracking-tight">{value}</div>
    </div>
  );
}
