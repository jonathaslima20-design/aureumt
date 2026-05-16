import { useEffect, useState } from 'react';
import { MessageSquare, Users, CheckCircle2 } from 'lucide-react';
import { supabase, Instance } from '../../lib/supabase';

type Metrics = {
  messagesToday: number;
  activeContacts: number;
  resolutionRate: number;
};

type PeriodKey = '7d' | '30d';

export function OverviewPage({ instance }: { instance: Instance | null }) {
  const [metrics, setMetrics] = useState<Metrics>({
    messagesToday: 0,
    activeContacts: 0,
    resolutionRate: 0,
  });
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
        .select('direction, message_body, created_at, customer_number')
        .eq('instance_id', instance.id)
        .gte('created_at', rangeAgo.toISOString())
        .order('created_at', { ascending: false });

      const rows = recent || [];

      const todayRows = rows.filter((r) => new Date(r.created_at) >= today);
      const contacts = new Set(rows.map((r) => r.customer_number));
      const overflow = (instance.overflow_keyword || '').toLowerCase();
      const totalContacts = contacts.size || 1;

      const contactsWithOverflow = new Set(
        overflow
          ? rows.filter((r) => r.direction === 'in' && r.message_body.toLowerCase().includes(overflow)).map((r) => r.customer_number)
          : []
      );
      const resolutionRate = totalContacts > 0
        ? Math.round(((totalContacts - contactsWithOverflow.size) / totalContacts) * 100)
        : 0;

      setMetrics({
        messagesToday: todayRows.length,
        activeContacts: contacts.size,
        resolutionRate,
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
