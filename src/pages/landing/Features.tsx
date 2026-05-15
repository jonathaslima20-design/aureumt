import { Users, Layers, Database, ArrowRightLeft, BarChart3, Heart } from 'lucide-react';
import { useRef } from 'react';

const features = [
  {
    id: 'personality',
    icon: Users,
    title: 'AGENTES COM PERSONALIDADE',
    description: 'Defina tom de voz, formalidade, girias regionais e padrao de comunicacao. Cada agente reflete a identidade da sua marca.',
    span: 'col-span-1 sm:col-span-2 row-span-2',
    large: true,
  },
  {
    id: 'multimodal',
    icon: Layers,
    title: 'MULTIMODAL',
    description: 'Texto, audio e imagem. Seus agentes interpretam qualquer tipo de midia recebida.',
    span: 'col-span-1',
    large: false,
  },
  {
    id: 'knowledge',
    icon: Database,
    title: 'KNOWLEDGE BASE',
    description: 'RAG contextual com chunks indexados. PDFs, URLs e transcricoes de audio.',
    span: 'col-span-1',
    large: false,
  },
  {
    id: 'handoff',
    icon: ArrowRightLeft,
    title: 'TRANSBORDO INTELIGENTE',
    description: 'Deteccao automatica de necessidade humana. Escalacao com contexto preservado.',
    span: 'col-span-1 sm:col-span-2',
    large: false,
    hasAnimation: true,
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'DASHBOARDS',
    description: 'Taxa de resolucao, tempo de resposta, volume e tendencias. Dados para decisao.',
    span: 'col-span-1',
    large: false,
  },
  {
    id: 'retention',
    icon: Heart,
    title: 'FIDELIDADE',
    description: 'Agentes que aprendem com feedback e melhoram continuamente a experiencia.',
    span: 'col-span-1',
    large: false,
  },
];

function FeatureCard({ feature }: { feature: typeof features[0] }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    cardRef.current.style.setProperty('--mouse-x', `${x}%`);
    cardRef.current.style.setProperty('--mouse-y', `${y}%`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`spotlight-card glass rounded-3xl p-6 sm:p-8 ${feature.span} flex flex-col justify-between group hover:border-white/10 transition-colors`}
    >
      <div>
        <feature.icon size={feature.large ? 28 : 20} className="text-accent mb-4" strokeWidth={1.5} />
        <h3 className="font-display font-semibold text-sm sm:text-base uppercase tracking-wider text-white mb-2">
          {feature.title}
        </h3>
        <p className="text-xs sm:text-sm text-white/30 leading-relaxed">
          {feature.description}
        </p>
      </div>

      {feature.hasAnimation && (
        <div className="mt-4 font-mono text-[10px] text-accent/60 animate-blink tracking-widest">
          WAITING_FOR_HUMAN...
        </div>
      )}

      {feature.id === 'retention' && (
        <div className="mt-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse-fast" />
          <span className="font-mono text-[9px] text-white/30 tracking-wider">LEARNING ACTIVE</span>
        </div>
      )}
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-accent">
            MOTOR: GOOGLE GEMINI
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tighter text-white uppercase">
            RECURSOS DE ELITE
          </h2>
          <p className="font-mono text-[10px] tracking-[0.3em] text-white/30 uppercase">
            LATENCIA MEDIA: &lt; 1.2s
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 auto-rows-[240px] gap-4">
          {features.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
