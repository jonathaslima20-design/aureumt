import { useState } from 'react';
import { Plus } from 'lucide-react';

const faqs = [
  {
    question: 'PRECISO DE CONHECIMENTO TECNICO PARA CONFIGURAR?',
    answer: 'Nao. A plataforma foi projetada para usuarios sem experiencia em programacao. Toda a configuracao e feita por interface visual — se voce sabe usar WhatsApp Web, sabe usar o AuraTalk.',
  },
  {
    question: 'O CLIENTE PERCEBE QUE ESTA FALANDO COM UMA IA?',
    answer: 'O AuraTalk implementa simulacao de comportamento humano — tempo de digitacao variavel, pausas naturais, adaptacao de formalidade e girias regionais. A experiencia e fluida e indistinguivel de um atendimento humano.',
  },
  {
    question: 'MEUS DADOS E CONVERSAS ESTAO SEGUROS?',
    answer: 'Sim. A infraestrutura utiliza criptografia em transito e em repouso, com controle de acesso por Row Level Security no banco de dados. Cada usuario tem acesso exclusivamente aos seus proprios dados e conversas.',
  },
];

export function FAQ() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <section id="faq" className="py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-accent">
            FAQ
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tighter text-white uppercase">
            PERGUNTAS FREQUENTES.
          </h2>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`accordion-item border border-white/5 rounded-2xl overflow-hidden ${
                active === index ? 'active' : ''
              }`}
            >
              <button
                onClick={() => setActive(active === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="font-display font-medium text-xs sm:text-sm uppercase tracking-wider text-white pr-4">
                  {faq.question}
                </span>
                <Plus
                  size={16}
                  className="accordion-icon text-accent shrink-0 transition-transform duration-300"
                />
              </button>
              <div className="accordion-content">
                <p className="px-6 pb-6 text-sm text-gray-400 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
