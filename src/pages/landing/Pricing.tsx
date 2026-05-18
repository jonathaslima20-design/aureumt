import { useEffect, useState } from 'react';
import { supabase, Plan } from '../../lib/supabase';
import { PlanCard } from '../../components/PlanCard';

type BillingCycle = 'monthly' | 'semiannual' | 'annual';

const CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Mensal',
  semiannual: 'Semestral',
  annual: 'Anual',
};

interface PricingProps {
  onStart: () => void;
}

export function Pricing({ onStart }: PricingProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [cycle, setCycle] = useState<BillingCycle>('monthly');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (data) setPlans(data);
    })();
  }, []);

  if (plans.length === 0) return null;

  return (
    <section id="pricing" className="py-10 md:py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <span className="font-mono text-[11px] tracking-[0.4em] uppercase text-accent">
            INVESTIMENTO
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tighter text-white uppercase">
            DIMENSIONE SUA OPERACAO.
          </h2>
        </div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center bg-[#080808] border border-[#1a1a1a] rounded-xl p-1 gap-0.5">
            {(['monthly', 'semiannual', 'annual'] as BillingCycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  cycle === c
                    ? 'bg-white text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {CYCLE_LABELS[c]}
                {c === 'annual' && (
                  <span className={`ml-1.5 text-[10px] ${cycle === c ? 'text-emerald-600' : 'text-emerald-400'}`}>
                    -20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              cycle={cycle}
              onAction={onStart}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
