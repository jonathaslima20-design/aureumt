import { Settings, Upload, Link, Zap } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'CONFIGURACAO',
    description: 'Defina o perfil do agente: nome, tom de comunicacao, idioma e parametros de comportamento.',
    icon: Settings,
  },
  {
    number: '02',
    title: 'ALIMENTACAO',
    description: 'Envie os materiais relevantes do seu negocio. Catalogos, FAQs, politicas, tabelas de preco.',
    icon: Upload,
  },
  {
    number: '03',
    title: 'CONEXAO',
    description: 'Vincule um numero de WhatsApp via QR Code. Processo identico ao WhatsApp Web.',
    icon: Link,
  },
  {
    number: '04',
    title: 'OPERACAO',
    description: 'O agente comeca a atender imediatamente com monitoramento disponivel em tempo real.',
    icon: Zap,
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-accent">
            PROCESSO
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tighter text-white uppercase">
            DO ZERO AO PRIMEIRO ATENDIMENTO.
          </h2>
          <p className="text-sm text-white/30 max-w-md mx-auto">
            Quatro etapas para uma operacao automatizada.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="border border-white/5 rounded-3xl p-8 hover:bg-white/[0.03] transition-all duration-300 group"
            >
              <span className="font-display font-bold text-5xl text-accent/40 block mb-6">
                {step.number}
              </span>
              <step.icon
                size={20}
                className="text-white/40 mb-4 group-hover:text-accent transition-colors"
                strokeWidth={1.5}
              />
              <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-white mb-3">
                {step.title}
              </h3>
              <p className="text-xs text-white/30 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
