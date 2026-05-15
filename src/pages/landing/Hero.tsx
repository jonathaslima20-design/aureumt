import { ArrowRight } from 'lucide-react';

interface HeroProps {
  onStart: () => void;
}

export function Hero({ onStart }: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />

      {/* Decorative rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/[0.03] rounded-full animate-spin-slow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/[0.03] rounded-full animate-reverse-spin" />

      <div className="relative max-w-5xl mx-auto text-center space-y-8">
        {/* Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 bg-white/5 backdrop-blur-md rounded-full">
          <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-accent">
            ENTERPRISE AI INFRASTRUCTURE
          </span>
        </div>

        {/* H1 */}
        <h1 className="font-display font-bold text-5xl md:text-[8rem] tracking-tighter uppercase leading-[0.85]">
          <span className="block text-white">A EVOLUCAO DO</span>
          <span className="block bg-gradient-to-b from-white via-gray-400 to-gray-600 bg-clip-text text-transparent">
            ATENDIMENTO
          </span>
          <span className="block text-accent text-3xl md:text-7xl tracking-wide mt-2">
            CONVERSACIONAL.
          </span>
        </h1>

        {/* Paragraph */}
        <p className="text-gray-400 text-lg md:text-xl italic font-light max-w-2xl mx-auto">
          Agentes inteligentes treinados em sua base de conhecimento para entregas de alta precisao.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={onStart}
            className="group flex items-center gap-2 px-10 py-5 bg-accent text-white font-display font-semibold text-sm uppercase tracking-wider rounded shadow-[0_0_30px_rgba(255,59,0,0.3)] hover:shadow-[0_0_50px_rgba(255,59,0,0.5)] transition-all duration-300"
          >
            CONFIGURAR PRIMEIRO AGENTE
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <a
            href="#pricing"
            className="px-8 py-5 border border-white/20 text-white/80 font-display font-medium text-sm uppercase tracking-wider rounded hover:bg-white/10 transition-all duration-300"
          >
            CONHECER OS PLANOS
          </a>
        </div>
      </div>
    </section>
  );
}
