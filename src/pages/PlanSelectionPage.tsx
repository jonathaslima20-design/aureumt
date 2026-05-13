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
      <div
        className="absolute pointer-events-none animate-aura-breathe"
        style={{
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80vw',
          height: '60vw',
          maxWidth: 700,
          maxHeight: 500,
          background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 45%, transparent 68%)',
          filter: 'blur(48px)',
          borderRadius: '50%',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-5xl">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Logo size={40} />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Escolha seu plano
          </h1>
          <p className="text-sm text-neutral-500 mt-2 max-w-md mx-auto leading-relaxed">
            Selecione o plano que melhor se adapta ao seu negocio para comecar a usar o AuraTalk.
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-1 gap-0.5">
            {(['monthly', 'semiannual', 'annual'] as BillingCycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const price = getPrice(plan, cycle);
            const installment = installmentInfo(cycle, price);

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 flex flex-col transition-all ${
                  plan.highlight
                    ? 'border-white/20 bg-[#0d0d0d] shadow-[0_0_40px_-12px_rgba(255,255,255,0.1)]'
                    : 'border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#262626]'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 bg-white text-black text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full">
                      <Star size={10} className="fill-current" /> Recomendado
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white tracking-tight">
                      {formatPrice(price)}
                    </span>
                    <span className="text-xs text-neutral-500">
                      /{cycle === 'monthly' ? 'mes' : cycle === 'semiannual' ? 'sem' : 'ano'}
                    </span>
                  </div>
                  {installment && (
                    <p className="text-[11px] text-neutral-500 mt-1">{installment}</p>
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
                    className={`w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      plan.highlight
                        ? 'bg-white text-black hover:bg-neutral-200'
                        : 'border border-[#2a2a2a] text-white hover:bg-[#141414] hover:border-[#3a3a3a]'
                    }`}
                  >
                    Assinar {plan.name} <ArrowRight size={13} />
                  </button>
                ) : (
                  <div className="w-full py-3 rounded-xl text-center text-sm font-medium border border-[#1a1a1a] text-neutral-600">
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
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-white transition-colors px-4 py-2 rounded-lg border border-[#1a1a1a] hover:border-[#2a2a2a]"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
