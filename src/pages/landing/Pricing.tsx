interface PricingProps {
  onStart: () => void;
}

const plans = [
  {
    name: 'BUSINESS',
    price: '197',
    annual: '157,58',
    popular: false,
    features: [
      '1 Agente de IA',
      '2.000 mensagens/mes',
      '1 conexao WhatsApp',
      '2 bases de conhecimento',
      'Treinamento por texto',
      'Suporte incluso',
    ],
    cta: 'INICIAR TRIAL',
  },
  {
    name: 'PROFESSIONAL',
    price: '397',
    annual: '317,58',
    popular: true,
    features: [
      'Ate 5 Agentes de IA',
      '10.000 mensagens/mes',
      '3 conexoes WhatsApp',
      '10 bases de conhecimento',
      'Treinamento PDF e arquivos',
      'Metricas avancadas',
    ],
    cta: 'SELECIONAR PRO',
  },
  {
    name: 'ELITE',
    price: '797',
    annual: '637,58',
    popular: false,
    features: [
      'Agentes ilimitados',
      'Mensagens ilimitadas',
      'Conexoes ilimitadas',
      'Bases ilimitadas',
      'Webhooks integracoes',
      'Suporte prioritario',
    ],
    cta: 'FALAR COM CONSULTOR',
  },
];

export function Pricing({ onStart }: PricingProps) {
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
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative border rounded-3xl p-8 flex flex-col ${
                plan.popular
                  ? 'pricing-card-popular border-accent/40'
                  : 'border-white/5'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 right-6 px-3 py-1 bg-accent text-white font-mono text-[11px] tracking-[0.2em] uppercase rounded-full">
                  RECOMENDADO
                </span>
              )}

              <div className="mb-8">
                <span className="font-mono text-xs tracking-[0.4em] uppercase text-gray-500">
                  {plan.name}
                </span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-mono text-xs text-gray-500">R$</span>
                  <span className="font-display font-bold text-4xl text-white">
                    {plan.price}
                  </span>
                  <span className="font-mono text-xs text-gray-500">/MES</span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-gray-600">
                  ANUAL: R${plan.annual}/MES
                </p>
              </div>

              <ul className="space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <span className="w-1 h-1 rounded-full bg-accent shrink-0" />
                    <span className="text-sm text-gray-400">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={onStart}
                className={`mt-8 w-full py-4 rounded-xl font-mono text-xs tracking-[0.2em] uppercase transition-all duration-300 ${
                  plan.popular
                    ? 'bg-accent text-white hover:bg-accent/90 shadow-[0_0_20px_rgba(255,59,0,0.2)]'
                    : 'border border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
