import { useEffect, useState } from 'react';
import { Check, Loader2, Star, ArrowRight, LogOut } from 'lucide-react';
import { supabase, Plan } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { CheckoutPage } from './user/CheckoutPage';

type BillingCycle = 'monthly' | 'semiannual' | 'annual';

const CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Mensal',
  semiannual: 'Semestral',
  annual: 'Anual',
};

function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function installmentInfo(cycle: BillingCycle, price: number): string | null {
  if (cycle === 'semiannual') return `ou 6x de ${formatPrice(price / 6)}`;
  if (cycle === 'annual') return `ou 12x de ${formatPrice(price / 12)}`;
  return null;
}

export function PlanSelectionPage({ onPlanSelected }: { onPlanSelected: () => void }) {
  const { signOut, refreshProfile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [checkout, setCheckout] = useState<{ plan: Plan; cycle: BillingCycle } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      setPlans(data || []);
      setLoading(false);
    })();
  }, []);

  const getPrice = (plan: Plan, c: BillingCycle): number => {
    if (c === 'semiannual') return plan.price_semiannual;
    if (c === 'annual') return plan.price_annual;
    return plan.price_monthly;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <Loader2 size={20} className="text-neutral-600 animate-spin" />
      </div>
    );
  }

  if (checkout) {
    return (
      <CheckoutPage
        plan={checkout.plan}
        cycle={checkout.cycle}
        onBack={() => setCheckout(null)}
        onSuccess={async () => {
          await refreshProfile();
          onPlanSelected();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center px-4 py-12 relative overflow-hidden">

      <div className="relative z-10 w-full max-w-5xl">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent block mb-3">
            PLANOS E PRECOS
          </span>
          <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tighter text-white uppercase">
            Escolha seu plano
          </h1>
          <p className="text-sm text-neutral-500 mt-2 max-w-md mx-auto leading-relaxed">
            Selecione o plano que melhor se adapta ao seu negocio para comecar a usar o AuraTalk.
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center glass rounded-xl p-1 gap-0.5">
            {(['monthly', 'semiannual', 'annual'] as BillingCycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`px-4 py-2 rounded-lg font-mono text-xs font-medium transition-all ${
                  cycle === c
                    ? 'bg-accent text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {CYCLE_LABELS[c]}
                {c === 'annual' && (
                  <span className={`ml-1.5 text-[10px] ${cycle === c ? 'text-white/80' : 'text-emerald-400'}`}>
                    -20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const price = getPrice(plan, cycle);
            const installment = installmentInfo(cycle, price);

            return (
              <div
                key={plan.id}
                className={`relative glass rounded-3xl p-6 flex flex-col transition-all ${
                  plan.highlight
                    ? 'pricing-card-popular'
                    : 'hover:border-white/10'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 right-6">
                    <span className="inline-flex items-center gap-1 bg-accent text-white font-mono text-[10px] font-semibold uppercase tracking-[0.2em] px-3 py-1 rounded-full">
                      <Star size={10} className="fill-current" /> MAIS POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="font-mono text-xs tracking-[0.3em] uppercase text-neutral-400">{plan.name}</h3>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-display font-bold text-white tracking-tight">
                      {formatPrice(price)}
                    </span>
                    <span className="font-mono text-xs text-neutral-500">
                      /{cycle === 'monthly' ? 'mes' : cycle === 'semiannual' ? 'sem' : 'ano'}
                    </span>
                  </div>
                  {installment && (
                    <p className="font-mono text-[11px] text-neutral-500 mt-1">{installment}</p>
                  )}
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {(plan.features || []).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                      <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {price > 0 ? (
                  <button
                    onClick={() => setCheckout({ plan, cycle })}
                    className={`w-full py-3 rounded-xl text-sm font-display font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                      plan.highlight
                        ? 'bg-accent text-white shadow-[0_0_20px_rgba(255,59,0,0.25)] hover:shadow-[0_0_30px_rgba(255,59,0,0.4)]'
                        : 'border border-white/20 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    Assinar {plan.name} <ArrowRight size={13} />
                  </button>
                ) : (
                  <div className="w-full py-3 rounded-xl text-center text-sm font-mono uppercase tracking-wider border border-white/[0.06] text-neutral-600">
                    Em breve
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-center mt-10">
          <button
            onClick={signOut}
            className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-neutral-500 hover:text-white transition-colors px-4 py-2 rounded-lg border border-white/[0.08] hover:border-white/20"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
