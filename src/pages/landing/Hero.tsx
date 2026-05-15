import { ArrowRight } from 'lucide-react';

interface HeroProps {
  onStart: () => void;
}

export function Hero({ onStart }: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-4xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/10 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-fast" />
          <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-white/50">
            AGENTES OPERANDO 24/7
          </span>
        </div>

        <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tighter text-white leading-[1.1]">
          ATENDIMENTO INTELIGENTE
          <br />
          <span className="text-accent">NO WHATSAPP.</span>
        </h1>

        <p className="max-w-xl mx-auto text-sm sm:text-base text-white/40 font-light leading-relaxed">
          Crie agentes de IA treinados com o conhecimento do seu negocio.
          Configurados em minutos. Funcionando continuamente.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={onStart}
            className="group flex items-center gap-2 px-6 py-3 bg-white text-background font-display font-semibold text-sm uppercase tracking-wider rounded hover:bg-accent hover:text-white transition-all duration-300"
          >
            CONFIGURAR AGENTE
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <a
            href="#como-funciona"
            className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 hover:text-white/70 transition-colors"
          >
            VER COMO FUNCIONA
          </a>
        </div>

        <div className="pt-12 flex items-center justify-center gap-8 text-white/20">
          <div className="text-center">
            <span className="block font-display font-bold text-2xl text-white/80">&lt;1.2s</span>
            <span className="font-mono text-[9px] tracking-[0.3em] uppercase">LATENCIA</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <span className="block font-display font-bold text-2xl text-white/80">24/7</span>
            <span className="font-mono text-[9px] tracking-[0.3em] uppercase">OPERACAO</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <span className="block font-display font-bold text-2xl text-white/80">GEMINI</span>
            <span className="font-mono text-[9px] tracking-[0.3em] uppercase">MOTOR IA</span>
          </div>
        </div>
      </div>
    </section>
  );
}
