import { useEffect, useState, useMemo } from 'react';
import {
  MessageSquare,
  Users,
  CheckCircle2,
  Clock,
  ThumbsUp,
  PhoneForwarded,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  BarChart3,
} from 'lucide-react';
import { supabase, Instance } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type PeriodKey = 'today' | '7d' | '30d' | '90d';

type AnalyticsData = {
  messages_in: number;
  messages_out: number;
  active_contacts: number;
  avg_response_time_seconds: number;
  resolution_rate: number;
  escalations: number;
  feedback_positive: number;
  feedback_negative: number;
  daily_series: { day: string; messages_in: number; messages_out: number }[];
  hourly_distribution: { hour: number; count: number }[];
  prev_period: {
    messages_total: number;
    active_contacts: number;
  };
};

type AgentComparison = {
  instance_id: string;
  instance_name: string;
  avatar_url: string | null;
  color: string;
  messages_total: number;
  messages_in: number;
  messages_out: number;
  active_contacts: number;
  avg_response_time_seconds: number;
};

const PERIOD_OPTIONS: { key: PeriodKey; label: string; days: number }[] = [
  { key: 'today', label: 'Hoje', days: 1 },
  { key: '7d', label: '7 dias', days: 7 },
  { key: '30d', label: '30 dias', days: 30 },
  { key: '90d', label: '90 dias', days: 90 },
];

function getDateRange(period: PeriodKey): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  if (period === 'today') {
    from.setHours(0, 0, 0, 0);
  } else {
    const days = PERIOD_OPTIONS.find((p) => p.key === period)!.days;
    from.setDate(from.getDate() - (days - 1));
    from.setHours(0, 0, 0, 0);
  }
  return { from, to };
}

function formatResponseTime(seconds: number): string {
  if (seconds === 0) return '--';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

function calcDelta(current: number, previous: number): { value: number; direction: 'up' | 'down' | 'neutral' } {
  if (previous === 0 && current === 0) return { value: 0, direction: 'neutral' };
  if (previous === 0) return { value: 100, direction: 'up' };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { value: Math.abs(pct), direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral' };
}

export function AnalyticsPage({ instances }: { instances: Instance[] }) {
  const { profile } = useAuth();
  const [period, setPeriod] = useState<PeriodKey>('7d');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('all');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [agentsData, setAgentsData] = useState<AgentComparison[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    const run = async () => {
      setLoading(true);
      const { from, to } = getDateRange(period);
      const instanceId = selectedInstanceId === 'all' ? null : selectedInstanceId;

      const { data: result, error } = await supabase.rpc('get_analytics_overview', {
        p_user_id: profile.id,
        p_instance_id: instanceId,
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      });

      if (!error && result) {
        setData(result as AnalyticsData);
      }

      if (instances.length > 1) {
        const { data: agents } = await supabase.rpc('get_analytics_agents_comparison', {
          p_user_id: profile.id,
          p_from: from.toISOString(),
          p_to: to.toISOString(),
        });
        if (agents) setAgentsData(agents as AgentComparison[]);
      }

      setLoading(false);
    };
    run();
  }, [profile?.id, period, selectedInstanceId, instances.length]);

  const totalMessages = data ? data.messages_in + data.messages_out : 0;
  const prevTotalMessages = data?.prev_period?.messages_total ?? 0;
  const messageDelta = calcDelta(totalMessages, prevTotalMessages);
  const contactsDelta = calcDelta(data?.active_contacts ?? 0, data?.prev_period?.active_contacts ?? 0);

  const satisfactionRate = useMemo(() => {
    if (!data) return 0;
    const total = data.feedback_positive + data.feedback_negative;
    if (total === 0) return 0;
    return Math.round((data.feedback_positive / total) * 100);
  }, [data]);

  const peakHours = useMemo(() => {
    if (!data?.hourly_distribution) return [];
    return [...data.hourly_distribution]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .filter((h) => h.count > 0);
  }, [data]);

  const handleExport = () => {
    if (!data?.daily_series) return;
    const header = 'Data,Mensagens Recebidas,Mensagens Enviadas\n';
    const rows = data.daily_series
      .map((d) => `${d.day},${d.messages_in},${d.messages_out}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!profile) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent block mb-1">
            ANALYTICS
          </span>
          <h1 className="font-display font-bold text-xl tracking-tighter text-white uppercase">
            Painel Analitico
          </h1>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed max-w-xl">
            Metricas de desempenho dos seus agentes em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {instances.length > 1 && (
            <select
              value={selectedInstanceId}
              onChange={(e) => setSelectedInstanceId(e.target.value)}
              className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-white focus:border-[#2a2a2a] outline-none"
            >
              <option value="all">Todos os agentes</option>
              {instances.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.display_name || i.instance_name}
                </option>
              ))}
            </select>
          )}

          <div className="flex gap-0.5 glass rounded-lg p-1">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                  period === p.key
                    ? 'bg-white/[0.08] text-white'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            disabled={!data?.daily_series?.length}
            className="glass rounded-lg px-3 py-2 text-xs text-neutral-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Download size={12} />
            CSV
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-sm text-neutral-400">Nenhum dado disponivel para o periodo selecionado.</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <KpiCard
              icon={MessageSquare}
              label="Mensagens"
              value={totalMessages.toLocaleString('pt-BR')}
              sub={`${data.messages_in} in / ${data.messages_out} out`}
              delta={messageDelta}
            />
            <KpiCard
              icon={Users}
              label="Contatos Ativos"
              value={data.active_contacts.toLocaleString('pt-BR')}
              delta={contactsDelta}
            />
            <KpiCard
              icon={Clock}
              label="Tempo Medio"
              value={formatResponseTime(data.avg_response_time_seconds)}
              sub="primeira resposta"
            />
            <KpiCard
              icon={CheckCircle2}
              label="Resolucao"
              value={`${data.resolution_rate}%`}
              accent={data.resolution_rate >= 80 ? 'green' : data.resolution_rate >= 50 ? 'yellow' : 'red'}
            />
            <KpiCard
              icon={ThumbsUp}
              label="Satisfacao"
              value={satisfactionRate > 0 ? `${satisfactionRate}%` : '--'}
              sub={`${data.feedback_positive + data.feedback_negative} avaliacoes`}
              accent={satisfactionRate >= 80 ? 'green' : satisfactionRate >= 50 ? 'yellow' : 'red'}
            />
            <KpiCard
              icon={PhoneForwarded}
              label="Escalonamentos"
              value={data.escalations.toLocaleString('pt-BR')}
              sub="transferidos p/ humano"
            />
          </section>

          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            {/* Daily Series Chart - takes 2/3 */}
            <section className="xl:col-span-2 glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs uppercase tracking-wider text-neutral-500 font-mono">
                  Volume de Mensagens
                </span>
                <div className="flex items-center gap-4 text-[10px] font-mono text-neutral-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-white/80" />
                    Recebidas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-accent/70" />
                    Enviadas
                  </span>
                </div>
              </div>
              <DailyChart series={data.daily_series} period={period} />
            </section>

            {/* Hourly Heatmap - takes 1/3 */}
            <section className="glass rounded-2xl p-6">
              <span className="text-xs uppercase tracking-wider text-neutral-500 font-mono block mb-4">
                Distribuicao por Horario
              </span>
              <HourlyChart distribution={data.hourly_distribution} />
              {peakHours.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <span className="text-[10px] font-mono uppercase text-neutral-600 block mb-2">Picos</span>
                  <div className="flex gap-2">
                    {peakHours.map((h) => (
                      <span
                        key={h.hour}
                        className="text-xs font-mono px-2 py-1 rounded bg-white/5 text-neutral-300"
                      >
                        {String(h.hour).padStart(2, '0')}:00 ({h.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Agents Comparison */}
          {instances.length > 1 && agentsData.length > 0 && selectedInstanceId === 'all' && (
            <section className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 size={14} className="text-neutral-500" />
                <span className="text-xs uppercase tracking-wider text-neutral-500 font-mono">
                  Comparativo de Agentes
                </span>
              </div>
              <AgentsComparisonTable agents={agentsData} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

/* ============ Sub-components ============ */

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  delta,
  accent,
}: {
  icon: typeof MessageSquare;
  label: string;
  value: string;
  sub?: string;
  delta?: { value: number; direction: 'up' | 'down' | 'neutral' };
  accent?: 'green' | 'yellow' | 'red';
}) {
  const accentColor =
    accent === 'green'
      ? 'text-emerald-400'
      : accent === 'yellow'
      ? 'text-amber-400'
      : accent === 'red'
      ? 'text-red-400'
      : 'text-white';

  return (
    <div className="glass rounded-2xl p-5 hover:border-white/10 transition-colors group">
      <div className="flex items-center gap-2 text-neutral-500 mb-2">
        <Icon size={13} strokeWidth={1.6} />
        <span className="text-[10px] font-mono uppercase tracking-wider truncate">{label}</span>
      </div>
      <div className={`text-2xl font-display font-bold tracking-tight ${accentColor}`}>{value}</div>
      <div className="flex items-center justify-between mt-1.5 min-h-[16px]">
        {sub && <span className="text-[10px] text-neutral-600 truncate">{sub}</span>}
        {delta && delta.direction !== 'neutral' && (
          <span
            className={`text-[10px] font-mono flex items-center gap-0.5 ${
              delta.direction === 'up' ? 'text-emerald-500' : 'text-red-400'
            }`}
          >
            {delta.direction === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {delta.value}%
          </span>
        )}
        {delta && delta.direction === 'neutral' && (
          <span className="text-[10px] font-mono flex items-center gap-0.5 text-neutral-600">
            <Minus size={10} />
          </span>
        )}
      </div>
    </div>
  );
}

function DailyChart({
  series,
  period,
}: {
  series: { day: string; messages_in: number; messages_out: number }[];
  period: PeriodKey;
}) {
  const maxCount = Math.max(1, ...series.map((s) => s.messages_in + s.messages_out));
  const showEvery = period === '90d' ? 7 : period === '30d' ? 5 : 1;

  return (
    <div className="flex items-end gap-[3px] h-44">
      {series.map((s, idx) => {
        const inH = (s.messages_in / maxCount) * 100;
        const outH = (s.messages_out / maxCount) * 100;
        return (
          <div key={s.day} className="flex-1 flex flex-col items-center gap-1.5 min-w-0 group/bar">
            <div className="w-full flex-1 flex items-end gap-[1px] relative">
              <div
                className="flex-1 bg-white/70 rounded-t-sm transition-all group-hover/bar:bg-white"
                style={{ height: `${inH}%`, minHeight: s.messages_in > 0 ? 2 : 0 }}
              />
              <div
                className="flex-1 bg-accent/60 rounded-t-sm transition-all group-hover/bar:bg-accent/90"
                style={{ height: `${outH}%`, minHeight: s.messages_out > 0 ? 2 : 0 }}
              />
              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-[9px] font-mono text-neutral-300 whitespace-nowrap opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-10">
                {s.messages_in + s.messages_out} msg
              </div>
            </div>
            {idx % showEvery === 0 && (
              <span className="text-[9px] text-neutral-600 font-mono">
                {new Date(s.day + 'T00:00:00').toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HourlyChart({ distribution }: { distribution: { hour: number; count: number }[] }) {
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));

  return (
    <div className="space-y-1">
      {[0, 6, 12, 18].map((startHour) => (
        <div key={startHour} className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-neutral-600 w-8 text-right shrink-0">
            {String(startHour).padStart(2, '0')}h
          </span>
          <div className="flex gap-[2px] flex-1">
            {distribution
              .filter((d) => d.hour >= startHour && d.hour < startHour + 6)
              .map((d) => {
                const intensity = d.count / maxCount;
                return (
                  <div
                    key={d.hour}
                    className="flex-1 h-6 rounded-sm transition-colors relative group/cell"
                    style={{
                      backgroundColor:
                        intensity === 0
                          ? 'rgba(255,255,255,0.02)'
                          : `rgba(255, 59, 0, ${0.15 + intensity * 0.7})`,
                    }}
                    title={`${String(d.hour).padStart(2, '0')}:00 - ${d.count} msgs`}
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1.5 py-0.5 text-[8px] font-mono text-neutral-300 whitespace-nowrap opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none z-10">
                      {String(d.hour).padStart(2, '0')}h: {d.count}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-2">
        <span className="w-8" />
        <div className="flex justify-between flex-1 text-[8px] font-mono text-neutral-600">
          <span>+0</span>
          <span>+1</span>
          <span>+2</span>
          <span>+3</span>
          <span>+4</span>
          <span>+5</span>
        </div>
      </div>
    </div>
  );
}

function AgentsComparisonTable({ agents }: { agents: AgentComparison[] }) {
  const maxMessages = Math.max(1, ...agents.map((a) => a.messages_total));

  return (
    <div className="space-y-2">
      {agents.map((agent) => (
        <div
          key={agent.instance_id}
          className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/[0.03] transition-colors"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: agent.color || '#333' }}
          >
            {(agent.instance_name || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white font-medium truncate">{agent.instance_name}</span>
              <span className="text-[10px] font-mono text-neutral-400 shrink-0 ml-2">
                {agent.messages_total} msgs
              </span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-white/60 to-white/30 rounded-full transition-all"
                style={{ width: `${(agent.messages_total / maxMessages) * 100}%` }}
              />
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 shrink-0 ml-2">
            <div className="text-center">
              <div className="text-[9px] font-mono text-neutral-600 uppercase">Contatos</div>
              <div className="text-xs text-white font-medium">{agent.active_contacts}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] font-mono text-neutral-600 uppercase">T. Resp.</div>
              <div className="text-xs text-white font-medium">
                {formatResponseTime(agent.avg_response_time_seconds)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
