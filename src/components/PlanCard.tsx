import { Check } from 'lucide-react';
import { Plan } from '../lib/supabase';

type BillingCycle = 'monthly' | 'semiannual' | 'annual';

function formatInt(n: number): string {
  return Math.round(n).toLocaleString('pt-BR');
}

function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getPrice(plan: Plan, cycle: BillingCycle): number {
  if (cycle === 'semiannual') return plan.price_semiannual;
  if (cycle === 'annual') return plan.price_annual;
  return plan.price_monthly;
}

function cycleSuffix(cycle: BillingCycle): string {
  if (cycle === 'semiannual') return '/SEM';
  if (cycle === 'annual') return '/ANO';
  return '/MES';
}

function installmentInfo(cycle: BillingCycle, price: number): string | null {
  if (cycle === 'semiannual') return `ou 6x de ${formatPrice(price / 6)}`;
  if (cycle === 'annual') return `ou 12x de ${formatPrice(price / 12)}`;
  return null;
}

type PlanCardProps = {
  plan: Plan;
  cycle?: BillingCycle;
  isCurrent?: boolean;
  onAction: () => void;
  actionLabel?: string;
  showAnnualEquiv?: boolean;
};

export function PlanCard({
  plan,
  cycle = 'monthly',
  isCurrent = false,
  onAction,
  actionLabel,
  showAnnualEquiv = false,
}: PlanCardProps) {
  const price = getPrice(plan, cycle);
  const installment = installmentInfo(cycle, price);
  const monthlyEquiv = plan.price_annual / 12;

  return (
    <div
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
            {formatInt(price)}
          </span>
          <span className="font-mono text-xs text-gray-500">{cycleSuffix(cycle)}</span>
        </div>
        {showAnnualEquiv && cycle === 'monthly' && (
          <p className="mt-1 font-mono text-[11px] text-gray-600">
            ANUAL: R${formatInt(monthlyEquiv)}/MES
          </p>
        )}
        {!showAnnualEquiv && installment && (
          <p className="mt-1 font-mono text-[11px] text-gray-600">
            {installment}
          </p>
        )}
      </div>

      <ul className="space-y-3 flex-1">
        {(plan.features || []).map((feature) => (
          <li key={feature} className="flex items-center gap-3">
            <Check size={14} className="text-emerald-400 shrink-0" />
            <span className="text-sm text-gray-400">{feature}</span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="mt-8 w-full py-4 rounded-xl text-center font-mono text-xs tracking-[0.2em] uppercase border border-emerald-900/40 bg-emerald-950/20 text-emerald-400">
          Plano Atual
        </div>
      ) : price > 0 ? (
        <button
          onClick={onAction}
          className={`mt-8 w-full py-4 rounded-xl font-mono text-xs tracking-[0.2em] uppercase transition-all duration-300 ${
            plan.highlight
              ? 'bg-accent text-white hover:bg-accent/90 shadow-[0_0_20px_rgba(255,59,0,0.2)]'
              : 'border border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
          }`}
        >
          {actionLabel || (plan.highlight ? 'COMECAR AGORA' : 'SELECIONAR')}
        </button>
      ) : (
        <div className="mt-8 w-full py-4 rounded-xl text-center font-mono text-xs tracking-[0.2em] uppercase border border-white/5 text-gray-600">
          Em breve
        </div>
      )}
    </div>
  );
}
