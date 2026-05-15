import { ArrowRight } from 'lucide-react';

interface CTAProps {
  onStart: () => void;
}

export function CTA({ onStart }: CTAProps) {
  return (
    <section className="py-40 px-6 relative">
      <div className="absolute inset-0 dot-grid opacity-30" />
      <div className="relative max-w-3xl mx-auto text-center space-y-8">
        <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl tracking-tighter text-white uppercase leading-[1.1]">
          AUTOMACAO SEM PERDA
          <br />
          DE QUALIDADE.
        </h2>
        <p className="text-sm text-white/30 max-w-md mx-auto">
          Configure seu primeiro agente em minutos e libere sua equipe para as interacoes que realmente exigem intervencao humana.
        </p>
        <button
          onClick={onStart}
          className="group inline-flex items-center gap-2 px-8 py-4 bg-white text-background font-display font-semibold text-sm uppercase tracking-wider rounded hover:bg-accent hover:text-white transition-all duration-300"
        >
          CONFIGURAR MEU PRIMEIRO AGENTE AGORA
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </section>
  );
}
