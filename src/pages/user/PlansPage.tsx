import { useEffect, useState } from 'react';
import { Check, Loader2, Star, ExternalLink } from 'lucide-react';
import { supabase, Plan, UserPlan } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

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

export function PlansPage() {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userPlan, setUserPlan] = useState<(UserPlan & { plan?: Plan }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<BillingCycle>('monthly');

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

  const getPaymentLink = (plan: Plan, c: BillingCycle): string => {
    if (c === 'semiannual') return plan.payment_link_semiannual;
    if (c === 'annual') return plan.payment_link_annual;
    return plan.payment_link_monthly;
  };

  const isCurrentPlan = (planId: string): boolean => {
    return userPlan?.plan_id === planId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={18} className="text-neutral-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center max-w-2xl mx-auto px-2">
        <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Planos</h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-2 leading-relaxed">
          Escolha o plano ideal para o seu negocio. Todos incluem suporte e atualizacoes.
        </p>
      </div>

      {/* Billing cycle toggle */}
      <div className="flex justify-center px-2">
        <div className="inline-flex items-center bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-1 gap-0.5 overflow-x-auto">
          {(['monthly', 'semiannual', 'annual'] as BillingCycle[]).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const price = getPrice(plan, cycle);
          const link = getPaymentLink(plan, cycle);
          const isCurrent = isCurrentPlan(plan.id);
          const installment = installmentInfo(cycle, price);

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-4 sm:p-6 flex flex-col transition-all ${
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

              {isCurrent ? (
                <div className="w-full py-3 rounded-xl text-center text-sm font-medium border border-emerald-900/40 bg-emerald-950/20 text-emerald-400">
                  Plano Atual
                </div>
              ) : link ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-3 rounded-xl text-center text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    plan.highlight
                      ? 'bg-white text-black hover:bg-neutral-200'
                      : 'border border-[#2a2a2a] text-white hover:bg-[#141414] hover:border-[#3a3a3a]'
                  }`}
                >
                  Assinar agora <ExternalLink size={13} />
                </a>
              ) : (
                <div className="w-full py-3 rounded-xl text-center text-sm font-medium border border-[#1a1a1a] text-neutral-600">
                  Em breve
                </div>
              )}
            </div>
          );
        })}
      </div>

      {userPlan?.plan && (
        <div className="max-w-2xl mx-auto">
          <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Seu plano atual</div>
                <div className="text-sm text-white font-medium">{userPlan.plan.name} - {CYCLE_LABELS[userPlan.billing_cycle]}</div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md border border-emerald-900/40 bg-emerald-950/30 text-emerald-400 uppercase tracking-wider">
                {userPlan.status === 'active' ? 'Ativo' : userPlan.status}
              </span>
            </div>
            {userPlan.expires_at && (
              <p className="text-[11px] text-neutral-500 mt-2">
                Valido ate {new Date(userPlan.expires_at).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
