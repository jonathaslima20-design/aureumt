import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase, Plan, UserPlan } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CheckoutPage } from '../pages/user/CheckoutPage';
import { PlanCard } from './PlanCard';

type BillingCycle = 'monthly' | 'semiannual' | 'annual';

const CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Mensal',
  semiannual: 'Semestral',
  annual: 'Anual',
};

export function PlansModal({ onClose }: { onClose: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userPlan, setUserPlan] = useState<(UserPlan & { plan?: Plan }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [checkout, setCheckout] = useState<{ plan: Plan; cycle: BillingCycle } | null>(null);

  useEffect(() => {
    (async () => {
      const [plansRes, userPlanRes] = await Promise.all([
        supabase
          .from('plans')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        profile
          ? supabase
              .from('user_plans')
              .select('*, plans(*)')
              .eq('user_id', profile.id)
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      setPlans(plansRes.data || []);
      if (userPlanRes.data) {
        setUserPlan({
          ...userPlanRes.data,
          plan: userPlanRes.data.plans || undefined,
        });
      }
      setLoading(false);
    })();
  }, [profile?.id]);

  const isCurrentPlan = (planId: string): boolean => userPlan?.plan_id === planId;

  if (checkout) {
    return (
      <div className="fixed inset-0 z-50 bg-[#050505] overflow-y-auto">
        <CheckoutPage
          plan={checkout.plan}
          cycle={checkout.cycle}
          onBack={() => setCheckout(null)}
          onSuccess={async () => {
            await refreshProfile();
            setCheckout(null);
            onClose();
            window.location.reload();
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl shadow-[0_32px_80px_-12px_rgba(0,0,0,0.8)] overflow-hidden animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#1a1a1a]">
          <div>
            <span className="font-mono text-[11px] tracking-[0.4em] uppercase text-accent block mb-1">
              INVESTIMENTO
            </span>
            <h2 className="font-display font-bold text-xl tracking-tighter text-white uppercase">
              Dimensione sua operacao.
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#1a1a1a]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-8 py-8 space-y-8">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={18} className="text-neutral-600 animate-spin" />
            </div>
          ) : (
            <>
              {/* Current plan banner */}
              {userPlan?.plan && (
                <div className="flex items-center justify-between px-5 py-3.5 rounded-xl border border-emerald-900/30 bg-emerald-950/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-sm text-neutral-300">
                      Plano atual:{' '}
                      <span className="text-white font-medium">
                        {userPlan.plan.name} — {CYCLE_LABELS[userPlan.billing_cycle]}
                      </span>
                    </span>
                  </div>
                  {userPlan.expires_at && (
                    <span className="text-xs text-neutral-500">
                      Ate {new Date(userPlan.expires_at).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              )}

              {/* Billing cycle toggle */}
              <div className="flex justify-center">
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

              {/* Plans grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    cycle={cycle}
                    isCurrent={isCurrentPlan(plan.id)}
                    onAction={() => setCheckout({ plan, cycle })}
                    actionLabel={plan.highlight ? 'ASSINAR AGORA' : 'ASSINAR AGORA'}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
