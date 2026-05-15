import { Check } from 'lucide-react';

interface PricingProps {
  onStart: () => void;
}

const plans = [
  {
    name: 'BUSINESS',
    price: '197',
    popular: false,
    features: [
      '1 Agente de IA',
      '2.000 mensagens/mes',
      '1 conexao WhatsApp',
      '2 bases de conhecimento',
      'Treinamento por texto',
      'Suporte incluso',
    ],
    description: 'Profissionais autonomos e pequenas operacoes.',
  },
  {
    name: 'PROFESSIONAL',
    price: '397',
    popular: true,
    features: [
      'Ate 5 Agentes de IA',
      '10.000 mensagens/mes',
      '3 conexoes WhatsApp',
      '10 bases de conhecimento',
      'Treinamento por PDF e arquivos',
      'Metricas avancadas',
    ],
    description: 'Empresas com departamentos distintos.',
  },
  {
    name: 'ELITE',
    price: '797',
    popular: false,
    features: [
      'Agentes ilimitados',
      'Mensagens ilimitadas',
      'Conexoes ilimitadas',
      'Bases ilimitadas',
      'Webhooks para integracoes',
      'Suporte prioritario',
    ],
    description: 'Agencias e operacoes de alto volume.',
  },
];

export function Pricing({ onStart }: PricingProps) {
  return (
    <section id="pricing" className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-accent">
            INVESTIMENTO
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tighter text-white uppercase">
            PLANOS DIMENSIONADOS.
          </h2>
          <p className="text-sm text-white/30 max-w-md mx-auto">
            Todos incluem suporte tecnico e atualizacoes da plataforma.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative border rounded-3xl p-8 flex flex-col ${
                plan.popular
                  ? 'pricing-card-popular border-accent/30'
                  : 'border-white/5'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent text-white font-mono text-[9px] tracking-[0.3em] uppercase rounded-full">
                  RECOMENDADO
                </span>
              )}

              <div className="mb-6">
                <span className="font-mono text-[10px] tracking-[0.4em] uppercase text-white/40">
                  {plan.name}
                </span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-mono text-[10px] text-white/40">R$</span>
                  <span className="font-display font-bold text-4xl text-white">
                    {plan.price}
                  </span>
                  <span className="font-mono text-[10px] text-white/30">/MES</span>
                </div>
                <p className="mt-2 text-xs text-white/25">
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check size={12} className="text-accent shrink-0" />
                    <span className="text-xs text-white/50">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={onStart}
                className={`mt-8 w-full py-3 rounded-lg font-mono text-[10px] tracking-[0.2em] uppercase transition-all duration-300 ${
                  plan.popular
                    ? 'bg-accent text-white hover:bg-accent/90'
                    : 'border border-white/10 text-white/60 hover:border-white/30 hover:text-white'
                }`}
              >
                COMECAR AGORA
              </button>
            </div>
          ))}
        </div>

        <p className="text-center mt-8 font-mono text-[9px] tracking-[0.3em] text-white/20 uppercase">
          PLANOS ANUAIS COM 20% DE DESCONTO DISPONVEIS
        </p>
      </div>
    </section>
  );
}
