import { useEffect, useState } from 'react';
import { MessageSquare, Users, AlertTriangle, ArrowUpRight, ArrowDownLeft, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { supabase, Instance, ChatLog } from '../../lib/supabase';

type Metrics = {
  messagesToday: number;
  activeContacts: number;
  overflowRate: number;
  resolutionRate: number;
  avgMsgsPerConversation: number;
  avgResponseTime: string;
};

type PeriodKey = '7d' | '30d';

export function OverviewPage({ instance }: { instance: Instance | null }) {
  const [metrics, setMetrics] = useState<Metrics>({
    messagesToday: 0,
    activeContacts: 0,
    overflowRate: 0,
    resolutionRate: 0,
    avgMsgsPerConversation: 0,
    avgResponseTime: '--',
  });
  const [last, setLast] = useState<ChatLog[]>([]);
  const [series, setSeries] = useState<{ day: string; count: number }[]>([]);
  const [period, setPeriod] = useState<PeriodKey>('7d');

  useEffect(() => {
    if (!instance) return;
    const run = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const daysBack = period === '7d' ? 6 : 29;
      const rangeAgo = new Date();
      rangeAgo.setDate(rangeAgo.getDate() - daysBack);
      rangeAgo.setHours(0, 0, 0, 0);

      const { data: recent } = await supabase
        .from('chat_logs')
        .select('direction, message_body, tokens_used, created_at, customer_number')
        .eq('instance_id', instance.id)
        .gte('created_at', rangeAgo.toISOString())
        .order('created_at', { ascending: false });

      const rows = recent || [];

      const todayRows = rows.filter((r) => new Date(r.created_at) >= today);
      const contacts = new Set(rows.map((r) => r.customer_number));
      const overflow = (instance.overflow_keyword || '').toLowerCase();
      const overflowCount = overflow
        ? rows.filter((r) => r.direction === 'in' && r.message_body.toLowerCase().includes(overflow)).length
        : 0;
      const incoming = rows.filter((r) => r.direction === 'in').length || 1;
      const totalContacts = contacts.size || 1;
      const avgMsgs = rows.length > 0 ? Math.round((rows.length / totalContacts) * 10) / 10 : 0;

      // Resolution rate: conversations without overflow / total conversations
      const contactsWithOverflow = new Set(
        overflow
          ? rows.filter((r) => r.direction === 'in' && r.message_body.toLowerCase().includes(overflow)).map((r) => r.customer_number)
          : []
      );
      const resolutionRate = totalContacts > 0
        ? Math.round(((totalContacts - contactsWithOverflow.size) / totalContacts) * 100)
        : 0;

      // Average response time calculation
      let avgResponseTime = '--';
      const sortedByTime = [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const responseTimes: number[] = [];
      for (let i = 0; i < sortedByTime.length - 1; i++) {
        if (sortedByTime[i].direction === 'in' && sortedByTime[i + 1].direction === 'out' && sortedByTime[i].customer_number === sortedByTime[i + 1].customer_number) {
          const diff = new Date(sortedByTime[i + 1].created_at).getTime() - new Date(sortedByTime[i].created_at).getTime();
          if (diff > 0 && diff < 3600000) responseTimes.push(diff);
        }
      }
      if (responseTimes.length > 0) {
        const avgMs = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const secs = Math.round(avgMs / 1000);
        avgResponseTime = secs < 60 ? `${secs}s` : `${Math.round(secs / 60)}min`;
      }

      setMetrics({
        messagesToday: todayRows.length,
        activeContacts: contacts.size,
        overflowRate: Math.round((overflowCount / incoming) * 100),
        resolutionRate,
        avgMsgsPerConversation: avgMsgs,
        avgResponseTime,
      });

      // Build chart series
      const daysMap = new Map<string, number>();
      for (let i = daysBack; i >= 0; i--) {
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
  }, [instance?.id, instance?.overflow_keyword, period]);

  if (!instance) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Visao Geral</h1>
          <p className="text-sm text-neutral-500 mt-1">Crie um agente para comecar a ver o desempenho.</p>
        </div>
        <div className="border border-dashed border-[#242424] rounded-2xl p-12 text-center bg-[#0d0d0d]">
          <p className="text-sm text-neutral-400 mb-1">Nenhum agente disponivel</p>
          <p className="text-xs text-neutral-600">Va em Agentes e crie o seu primeiro.</p>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(1, ...series.map((s) => s.count));

  // Performance summary
  const summaryText = metrics.resolutionRate >= 80
    ? `Excelente! Seu agente resolveu ${metrics.resolutionRate}% das conversas sem transbordo.`
    : metrics.resolutionRate >= 50
    ? `Seu agente resolveu ${metrics.resolutionRate}% das conversas. Considere melhorar a base de conhecimento.`
    : metrics.activeContacts === 0
    ? 'Aguardando as primeiras conversas para gerar insights.'
    : `Taxa de resolucao em ${metrics.resolutionRate}%. Revise o prompt e a base de conhecimento do agente.`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Visao Geral</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Desempenho do agente <span className="text-neutral-300">{instance.instance_name}</span>
          </p>
        </div>
        <div className="flex gap-1 bg-[#141414] border border-[#242424] rounded-lg p-1">
          {(['7d', '30d'] as PeriodKey[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === p ? 'bg-[#1e1e1e] text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {p === '7d' ? '7 dias' : '30 dias'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <MetricCard icon={MessageSquare} label="Msgs hoje" value={metrics.messagesToday.toString()} />
        <MetricCard icon={Users} label="Contatos" value={metrics.activeContacts.toString()} />
        <MetricCard icon={AlertTriangle} label="Transbordo" value={`${metrics.overflowRate}%`} />
        <MetricCard icon={CheckCircle2} label="Resolucao" value={`${metrics.resolutionRate}%`} accent="emerald" />
        <MetricCard icon={TrendingUp} label="Msgs/conv." value={metrics.avgMsgsPerConversation.toString()} />
        <MetricCard icon={Clock} label="Tempo resp." value={metrics.avgResponseTime} />
      </div>

      {/* Performance summary */}
      {metrics.activeContacts > 0 && (
        <div className="border border-[#242424] rounded-xl bg-[#141414] px-5 py-4 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            metrics.resolutionRate >= 80 ? 'bg-emerald-950/40 border border-emerald-900/40' : 'bg-amber-950/40 border border-amber-900/40'
          }`}>
            {metrics.resolutionRate >= 80 ? (
              <CheckCircle2 size={14} className="text-emerald-400" />
            ) : (
              <TrendingUp size={14} className="text-amber-400" />
            )}
          </div>
          <p className="text-sm text-neutral-300">{summaryText}</p>
        </div>
      )}

      <div className="border border-[#242424] rounded-xl bg-[#141414] p-4 sm:p-6">
        <div className="text-xs uppercase tracking-wider text-neutral-500 mb-4">
          Mensagens nos ultimos {period === '7d' ? '7' : '30'} dias
        </div>
        <div className="flex items-end gap-0.5 sm:gap-1 h-32 sm:h-40">
          {series.map((s) => (
            <div key={s.day} className="flex-1 flex flex-col items-center gap-2 min-w-0">
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full bg-white/90 rounded-t transition-all"
                  style={{ height: `${(s.count / maxCount) * 100}%`, minHeight: s.count > 0 ? 4 : 0 }}
                />
              </div>
              {(period === '7d' || series.indexOf(s) % 5 === 0) && (
                <div className="text-[10px] text-neutral-500 font-mono">
                  {new Date(s.day + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border border-[#242424] rounded-xl bg-[#141414] p-4 sm:p-6">
        <div className="text-xs uppercase tracking-wider text-neutral-500 mb-4">Ultimas mensagens</div>
        {last.length === 0 ? (
          <p className="text-xs text-neutral-600 py-6 text-center">Nenhuma mensagem ainda</p>
        ) : (
          <div className="space-y-2">
            {last.map((log) => (
              <div
                key={log.id}
                className="border border-[#1c1c1c] rounded-lg px-3 py-2 sm:py-2.5 flex items-start sm:items-center gap-2 sm:gap-3 bg-[#0d0d0d] flex-wrap sm:flex-nowrap"
              >
                <div className="flex items-center gap-2 shrink-0">
                  {log.direction === 'in' ? (
                    <ArrowDownLeft size={12} className="text-blue-400 shrink-0" />
                  ) : (
                    <ArrowUpRight size={12} className="text-emerald-400 shrink-0" />
                  )}
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {log.customer_number}
                  </span>
                </div>
                <p className="text-xs text-neutral-300 truncate flex-1 w-full sm:w-auto">{log.message_body}</p>
                <span className="text-[10px] text-neutral-600 shrink-0 ml-auto">
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
  accent,
}: {
  icon: typeof MessageSquare;
  label: string;
  value: string;
  accent?: 'emerald';
}) {
  return (
    <div className="border border-[#242424] rounded-xl bg-[#141414] p-3 sm:p-4 hover:border-[#2e2e2e] transition-colors">
      <div className="flex items-center gap-1.5 sm:gap-2 text-neutral-500 mb-2 sm:mb-3">
        <Icon size={12} strokeWidth={1.8} />
        <span className="text-[10px] sm:text-[11px] uppercase tracking-wider truncate">{label}</span>
      </div>
      <div className={`text-lg sm:text-xl font-semibold tracking-tight ${accent === 'emerald' ? 'text-emerald-400' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}
