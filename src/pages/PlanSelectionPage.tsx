import { useEffect, useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { supabase, Plan } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { CheckoutPage } from './user/CheckoutPage';
import { PlanCard } from '../components/PlanCard';

type BillingCycle = 'monthly' | 'semiannual' | 'annual';

const CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Mensal',
  semiannual: 'Semestral',
  annual: 'Anual',
};

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
          <span className="font-mono text-[11px] tracking-[0.4em] uppercase text-accent block mb-3">
            INVESTIMENTO
          </span>
          <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tighter text-white uppercase">
            Escolha seu plano
          </h1>
          <p className="text-sm text-neutral-500 mt-2 max-w-md mx-auto leading-relaxed">
            Selecione o plano que melhor se adapta ao seu negocio para comecar a usar o AuraTalk.
          </p>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              cycle={cycle}
              onAction={() => setCheckout({ plan, cycle })}
              actionLabel="ASSINAR AGORA"
            />
          ))}
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
