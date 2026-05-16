import { Settings, Upload, Link, Zap } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'CONFIGURACAO',
    description: 'Defina o perfil, tom e comportamento do seu agente.',
    icon: Settings,
  },
  {
    number: '02',
    title: 'ALIMENTACAO',
    description: 'Suba PDFs, URLs e materiais do seu negocio.',
    icon: Upload,
  },
  {
    number: '03',
    title: 'CONEXAO',
    description: 'Vincule o WhatsApp via QR Code em segundos.',
    icon: Link,
  },
  {
    number: '04',
    title: 'OPERACAO',
    description: 'Atendimento autonomo e monitoramento imediato.',
    icon: Zap,
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <span className="font-mono text-[11px] tracking-[0.4em] uppercase text-accent">
            PROCESSO
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tighter text-white uppercase">
            QUATRO ETAPAS PARA A AUTOMACAO TOTAL.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="step-card border border-white/5 rounded-3xl p-8 group"
            >
              <span className="font-mono text-4xl text-accent/80 block mb-6">
                {step.number}
              </span>
              <step.icon
                size={20}
                className="text-gray-500 mb-4 group-hover:text-accent transition-colors"
                strokeWidth={1.5}
              />
              <h3 className="font-display font-semibold text-base uppercase tracking-wider text-white mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
