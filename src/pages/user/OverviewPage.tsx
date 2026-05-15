import { useEffect, useState } from 'react';
import { MessageSquare, Users, CheckCircle2, Clock, TrendingUp, AlertTriangle, ChevronDown, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { supabase, Instance, ChatLog } from '../../lib/supabase';
import { useUIPreferences } from '../../context/UIPreferencesContext';

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
  const { focusMode } = useUIPreferences();
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
  const [showMoreMetrics, setShowMoreMetrics] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

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

      const contactsWithOverflow = new Set(
        overflow
          ? rows.filter((r) => r.direction === 'in' && r.message_body.toLowerCase().includes(overflow)).map((r) => r.customer_number)
          : []
      );
      const resolutionRate = totalContacts > 0
        ? Math.round(((totalContacts - contactsWithOverflow.size) / totalContacts) * 100)
        : 0;

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
      <div className="space-y-8">
        <header>
          <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent block mb-1">DASHBOARD</span>
          <h1 className="font-display font-bold text-xl tracking-tighter text-white uppercase">Visao Geral</h1>
          <p className="text-sm text-neutral-500 mt-2">Crie um agente para ver o desempenho.</p>
        </header>
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-sm text-neutral-400">Nenhum agente disponível</p>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(1, ...series.map((s) => s.count));

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent block mb-1">DASHBOARD</span>
          <h1 className="font-display font-bold text-xl tracking-tighter text-white uppercase">Visao Geral</h1>
          <p className="text-sm text-neutral-500 mt-2">{instance.instance_name}</p>
        </div>
        <div className="flex gap-1 glass rounded-lg p-1">
          {(['7d', '30d'] as PeriodKey[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                period === p ? 'bg-white/[0.08] text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {p === '7d' ? '7 dias' : '30 dias'}
            </button>
          ))}
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <PrimaryKpi icon={MessageSquare} label="Mensagens hoje" value={metrics.messagesToday.toString()} />
        <PrimaryKpi icon={Users} label="Contatos ativos" value={metrics.activeContacts.toString()} />
        <PrimaryKpi icon={CheckCircle2} label="Resolução" value={`${metrics.resolutionRate}%`} accent />
      </section>

      {!focusMode && (
        <section>
          <button
            onClick={() => setShowMoreMetrics((v) => !v)}
            className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <ChevronDown size={12} className={`transition-transform ${showMoreMetrics ? 'rotate-180' : ''}`} />
            {showMoreMetrics ? 'Ocultar métricas' : 'Ver mais métricas'}
          </button>

          {showMoreMetrics && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 animate-fade-in">
              <SecondaryKpi icon={Clock} label="Tempo de resposta" value={metrics.avgResponseTime} />
              <SecondaryKpi icon={TrendingUp} label="Mensagens por conversa" value={metrics.avgMsgsPerConversation.toString()} />
              <SecondaryKpi icon={AlertTriangle} label="Transbordo" value={`${metrics.overflowRate}%`} />
            </div>
          )}
        </section>
      )}

      <section className="glass rounded-2xl p-6">
        <div className="text-xs uppercase tracking-wider text-neutral-500 mb-6">
          Mensagens nos últimos {period === '7d' ? '7' : '30'} dias
        </div>
        <div className="flex items-end gap-1 h-40">
          {series.map((s) => (
            <div key={s.day} className="flex-1 flex flex-col items-center gap-2 min-w-0">
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full bg-white/90 rounded-t transition-all"
                  style={{ height: `${(s.count / maxCount) * 100}%`, minHeight: s.count > 0 ? 4 : 0 }}
                />
              </div>
              {(period === '7d' || series.indexOf(s) % 5 === 0) && (
                <div className="text-[11px] text-neutral-500 font-mono">
                  {new Date(s.day + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {!focusMode && (
        <section>
          <button
            onClick={() => setShowActivity((v) => !v)}
            className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <ChevronDown size={12} className={`transition-transform ${showActivity ? 'rotate-180' : ''}`} />
            {showActivity ? 'Ocultar atividade' : 'Ver atividade recente'}
          </button>

          {showActivity && (
            <div className="glass rounded-2xl p-6 mt-4 animate-fade-in">
              {last.length === 0 ? (
                <p className="text-sm text-neutral-600 text-center py-4">Nenhuma mensagem ainda</p>
              ) : (
                <div className="space-y-1">
                  {last.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 py-2">
                      {log.direction === 'in' ? (
                        <ArrowDownLeft size={12} className="text-blue-400 shrink-0" />
                      ) : (
                        <ArrowUpRight size={12} className="text-emerald-400 shrink-0" />
                      )}
                      <span className="text-xs text-neutral-500 font-mono shrink-0">{log.customer_number}</span>
                      <p className="text-sm text-neutral-300 truncate flex-1">{log.message_body}</p>
                      <span className="text-xs text-neutral-600 shrink-0">
                        {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function PrimaryKpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof MessageSquare;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-6 hover:border-white/10 transition-colors">
      <div className="flex items-center gap-2 text-neutral-500 mb-3">
        <Icon size={14} strokeWidth={1.6} />
        <span className="text-xs font-mono uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-3xl font-display font-bold tracking-tight ${accent ? 'text-emerald-400' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}

function SecondaryKpi({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MessageSquare;
  label: string;
  value: string;
}) {
  return (
    <div className="glass rounded-xl px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-neutral-500">
        <Icon size={12} strokeWidth={1.6} />
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-sm font-medium text-neutral-200 tracking-tight">{value}</div>
    </div>
  );
}
