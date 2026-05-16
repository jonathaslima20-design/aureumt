import { useEffect, useState } from 'react';
import { supabase, Plan } from '../../lib/supabase';
import { PlanCard } from '../../components/PlanCard';

interface PricingProps {
  onStart: () => void;
}

export function Pricing({ onStart }: PricingProps) {
  const [plans, setPlans] = useState<Plan[]>([]);

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              cycle="monthly"
              onAction={onStart}
              showAnnualEquiv
            />
          ))}
        </div>
      </div>
    </section>
  );
}
