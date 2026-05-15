import { ArrowRight } from 'lucide-react';

interface CTAProps {
  onStart: () => void;
}

export function CTA({ onStart }: CTAProps) {
  return (
    <section className="py-40 px-6 relative">
      <div className="absolute inset-0 dot-grid opacity-20" />
      <div className="relative max-w-3xl mx-auto text-center space-y-8">
        <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl tracking-tighter uppercase leading-[1.1]">
          <span className="text-white">AUTOMACAO SEM PERDA DE </span>
          <span className="text-accent">QUALIDADE.</span>
        </h2>
        <p className="text-sm sm:text-base text-gray-400 font-light max-w-lg mx-auto leading-relaxed">
          Libere sua equipe para as interacoes que realmente exigem intervencao humana enquanto a IA cuida da escala.
        </p>
        <button
          onClick={onStart}
          className="group inline-flex items-center gap-3 px-12 py-6 bg-white text-black font-display font-semibold text-sm uppercase tracking-wider rounded hover:bg-accent hover:text-white transition-all duration-300"
        >
          CONFIGURAR MEU PRIMEIRO AGENTE AGORA
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </section>
  );
}
