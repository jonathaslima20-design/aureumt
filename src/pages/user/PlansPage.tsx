import { useEffect, useState } from 'react';
import { Loader2, QrCode, CreditCard, Clock } from 'lucide-react';
import { supabase, Plan, UserPlan } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { CheckoutPage } from './CheckoutPage';
import { PlanCard } from '../../components/PlanCard';

type BillingCycle = 'monthly' | 'semiannual' | 'annual';

type PaymentRow = {
  id: string;
  amount_cents: number;
  payment_method: string;
  status: string;
  status_detail: string | null;
  installments: number | null;
  billing_cycle: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  approved: { label: 'Aprovado', cls: 'border-emerald-900/40 bg-emerald-950/30 text-emerald-400' },
  pending: { label: 'Pendente', cls: 'border-amber-900/40 bg-amber-950/30 text-amber-400' },
  in_process: { label: 'Em analise', cls: 'border-amber-900/40 bg-amber-950/30 text-amber-400' },
  rejected: { label: 'Recusado', cls: 'border-red-900/40 bg-red-950/30 text-red-400' },
  cancelled: { label: 'Cancelado', cls: 'border-[#1a1a1a] text-neutral-500' },
  refunded: { label: 'Reembolsado', cls: 'border-[#1a1a1a] text-neutral-500' },
};

const CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Mensal',
  semiannual: 'Semestral',
  annual: 'Anual',
};

function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PlansPage() {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userPlan, setUserPlan] = useState<(UserPlan & { plan?: Plan }) | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [checkout, setCheckout] = useState<{ plan: Plan; cycle: BillingCycle } | null>(null);

  useEffect(() => {
    (async () => {
      const [plansRes, userPlanRes, paymentsRes] = await Promise.all([
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
        profile
          ? supabase
              .from('payments')
              .select('id, amount_cents, payment_method, status, status_detail, installments, billing_cycle, created_at')
              .eq('user_id', profile.id)
              .order('created_at', { ascending: false })
              .limit(10)
          : Promise.resolve({ data: [] }),
      ]);

      setPlans(plansRes.data || []);
      if (userPlanRes.data) {
        setUserPlan({
          ...userPlanRes.data,
          plan: userPlanRes.data.plans || undefined,
        });
      }
      setPayments((paymentsRes.data as PaymentRow[]) || []);
      setLoading(false);
    })();
  }, [profile?.id]);

  const isCurrentPlan = (planId: string): boolean => userPlan?.plan_id === planId;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={18} className="text-neutral-600 animate-spin" />
      </div>
    );
  }

  if (checkout) {
    return (
      <CheckoutPage
        plan={checkout.plan}
        cycle={checkout.cycle}
        onBack={() => setCheckout(null)}
        onSuccess={() => {
          setCheckout(null);
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center max-w-2xl mx-auto px-2">
        <span className="font-mono text-[11px] tracking-[0.4em] uppercase text-accent block mb-2">
          INVESTIMENTO
        </span>
        <h1 className="font-display font-bold text-xl sm:text-2xl tracking-tighter text-white uppercase">
          Dimensione sua operacao.
        </h1>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            cycle={cycle}
            isCurrent={isCurrentPlan(plan.id)}
            onAction={() => setCheckout({ plan, cycle })}
            actionLabel="ASSINAR AGORA"
          />
        ))}
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

      {payments.length > 0 && (
        <div className="max-w-3xl mx-auto">
          <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center gap-2">
              <Clock size={13} className="text-neutral-500" />
              <h2 className="text-sm font-medium text-white">Historico de pagamentos</h2>
            </div>
            <div className="divide-y divide-[#111]">
              {payments.map((p) => {
                const status = STATUS_LABEL[p.status] || { label: p.status, cls: 'border-[#1a1a1a] text-neutral-400' };
                return (
                  <div key={p.id} className="px-5 py-3 flex items-center gap-4 hover:bg-[#0d0d0d] transition-colors">
                    <div className="text-neutral-500 shrink-0">
                      {p.payment_method === 'pix' ? <QrCode size={14} /> : <CreditCard size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white">
                        {formatPrice((p.amount_cents || 0) / 100)}
                        {p.installments && p.installments > 1 && (
                          <span className="text-neutral-500 text-xs ml-1">em {p.installments}x</span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        {p.payment_method === 'pix' ? 'Pix' : 'Cartao'} {' . '} {CYCLE_LABELS[p.billing_cycle as BillingCycle] || p.billing_cycle}
                        {' . '} {new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border uppercase tracking-wider whitespace-nowrap ${status.cls}`}>
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
