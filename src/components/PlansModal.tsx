import { useEffect, useState } from 'react';
import { X, Check, Star, ArrowRight, Loader2 } from 'lucide-react';
import { supabase, Plan, UserPlan } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CheckoutPage } from '../pages/user/CheckoutPage';

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

  const getPrice = (plan: Plan, c: BillingCycle): number => {
    if (c === 'semiannual') return plan.price_semiannual;
    if (c === 'annual') return plan.price_annual;
    return plan.price_monthly;
  };

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
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl shadow-[0_32px_80px_-12px_rgba(0,0,0,0.8)] overflow-hidden animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1a1a1a]">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">Planos</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Escolha o plano ideal para o seu negocio.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#1a1a1a]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={18} className="text-neutral-600 animate-spin" />
            </div>
          ) : (
            <>
              {/* Current plan banner */}
              {userPlan?.plan && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-emerald-900/30 bg-emerald-950/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-xs text-neutral-300">
                      Plano atual:{' '}
                      <span className="text-white font-medium">
                        {userPlan.plan.name} — {CYCLE_LABELS[userPlan.billing_cycle]}
                      </span>
                    </span>
                  </div>
                  {userPlan.expires_at && (
                    <span className="text-[11px] text-neutral-500">
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {plans.map((plan) => {
                  const price = getPrice(plan, cycle);
                  const isCurrent = isCurrentPlan(plan.id);
                  const installment = installmentInfo(cycle, price);

                  return (
                    <div
                      key={plan.id}
                      className={`relative rounded-xl border p-5 flex flex-col transition-all ${
                        plan.highlight
                          ? 'border-white/15 bg-[#111111] shadow-[0_0_30px_-8px_rgba(255,255,255,0.08)]'
                          : 'border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#252525]'
                      }`}
                    >
                      {plan.highlight && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="inline-flex items-center gap-1 bg-white text-black text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                            <Star size={9} className="fill-current" /> Recomendado
                          </span>
                        </div>
                      )}

                      <div className="mb-3">
                        <h3 className="text-sm font-semibold text-white">{plan.name}</h3>
                        <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">{plan.description}</p>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-white tracking-tight">
                            {formatPrice(price)}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            /{cycle === 'monthly' ? 'mes' : cycle === 'semiannual' ? 'sem' : 'ano'}
                          </span>
                        </div>
                        {installment && (
                          <p className="text-[11px] text-neutral-500 mt-0.5">{installment}</p>
                        )}
                      </div>

                      <ul className="space-y-2 mb-5 flex-1">
                        {(plan.features || []).map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-neutral-300">
                            <Check size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {isCurrent ? (
                        <div className="w-full py-2.5 rounded-lg text-center text-xs font-medium border border-emerald-900/40 bg-emerald-950/20 text-emerald-400">
                          Plano Atual
                        </div>
                      ) : price > 0 ? (
                        <button
                          onClick={() => setCheckout({ plan, cycle })}
                          className={`w-full py-2.5 rounded-lg text-center text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                            plan.highlight
                              ? 'bg-white text-black hover:bg-neutral-200'
                              : 'border border-[#2a2a2a] text-white hover:bg-[#141414] hover:border-[#3a3a3a]'
                          }`}
                        >
                          Assinar agora <ArrowRight size={11} />
                        </button>
                      ) : (
                        <div className="w-full py-2.5 rounded-lg text-center text-xs font-medium border border-[#1a1a1a] text-neutral-600">
                          Em breve
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
