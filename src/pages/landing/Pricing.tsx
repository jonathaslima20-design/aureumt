import { useEffect, useState } from 'react';
import { supabase, Plan } from '../../lib/supabase';

interface PricingProps {
  onStart: () => void;
}

function formatInt(n: number): string {
  return Math.round(n).toLocaleString('pt-BR');
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
    <section id="pricing" className="py-32 px-6">
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
          {plans.map((plan) => {
            const monthlyEquiv = plan.price_annual / 12;

            return (
              <div
                key={plan.id}
                className={`relative border rounded-3xl p-8 flex flex-col ${
                  plan.highlight
                    ? 'pricing-card-popular border-accent/40'
                    : 'border-white/5'
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 right-6 px-3 py-1 bg-accent text-white font-mono text-[11px] tracking-[0.2em] uppercase rounded-full">
                    RECOMENDADO
                  </span>
                )}

                <div className="mb-8">
                  <span className="font-mono text-xs tracking-[0.4em] uppercase text-gray-500">
                    {plan.name.toUpperCase()}
                  </span>
                  {plan.description && (
                    <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                      {plan.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="font-mono text-xs text-gray-500">R$</span>
                    <span className="font-display font-bold text-4xl text-white">
                      {formatInt(plan.price_monthly)}
                    </span>
                    <span className="font-mono text-xs text-gray-500">/MES</span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-gray-600">
                    ANUAL: R${formatInt(monthlyEquiv)}/MES
                  </p>
                </div>

                <ul className="space-y-3 flex-1">
                  {(plan.features || []).map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <span className="w-1 h-1 rounded-full bg-accent shrink-0" />
                      <span className="text-sm text-gray-400">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onStart}
                  className={`mt-8 w-full py-4 rounded-xl font-mono text-xs tracking-[0.2em] uppercase transition-all duration-300 ${
                    plan.highlight
                      ? 'bg-accent text-white hover:bg-accent/90 shadow-[0_0_20px_rgba(255,59,0,0.2)]'
                      : 'border border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {plan.highlight ? 'COMECAR AGORA' : 'SELECIONAR'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
