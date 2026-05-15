import { useRef, useCallback } from 'react';
import { Users, Layers, Database, ArrowRightLeft, BarChart3, Heart } from 'lucide-react';

interface FeatureItem {
  id: string;
  icon: typeof Users;
  title: string;
  description: string;
  span: string;
  extra?: 'knowledge' | 'handoff' | 'retention';
}

const features: FeatureItem[] = [
  {
    id: 'personality',
    icon: Users,
    title: 'AGENTES COM PERSONALIDADE',
    description: 'Defina tom de voz, formalidade, girias regionais e padrao de comunicacao. Cada agente reflete a identidade da sua marca de forma unica.',
    span: 'col-span-1 sm:col-span-2 row-span-2',
  },
  {
    id: 'multimodal',
    icon: Layers,
    title: 'MULTIMODAL',
    description: 'Texto, Audio e Imagem. Seus agentes interpretam qualquer tipo de midia recebida no WhatsApp.',
    span: 'col-span-1',
  },
  {
    id: 'knowledge',
    icon: Database,
    title: 'KNOWLEDGE BASE',
    description: 'Indexacao RAG com chunks contextuais para respostas de alta precisao.',
    span: 'col-span-1',
    extra: 'knowledge',
  },
  {
    id: 'handoff',
    icon: ArrowRightLeft,
    title: 'TRANSBORDO INTELIGENTE',
    description: 'Deteccao automatica de necessidade humana. Escalacao com contexto completo preservado.',
    span: 'col-span-1 sm:col-span-2',
    extra: 'handoff',
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'DASHBOARDS',
    description: 'Monitoramento Real-time. Taxa de resolucao, tempo de resposta, volume e tendencias.',
    span: 'col-span-1',
  },
  {
    id: 'fidelity',
    icon: Heart,
    title: 'FIDELIDADE',
    description: 'Digitacao progressiva e pausas naturais. Comportamento indistinguivel de um humano.',
    span: 'col-span-1',
    extra: 'retention',
  },
];

function SpotlightCard({ feature }: { feature: FeatureItem }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--x', `${x}px`);
    cardRef.current.style.setProperty('--y', `${y}px`);
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`spotlight glass rounded-3xl p-6 sm:p-8 ${feature.span} flex flex-col justify-between group hover:border-white/10 transition-colors`}
    >
      <div>
        <feature.icon
          size={feature.span.includes('row-span-2') ? 28 : 20}
          className="text-accent mb-4"
          strokeWidth={1.5}
        />
        <h3 className="font-display font-semibold text-base sm:text-lg uppercase tracking-wider text-white mb-3">
          {feature.title}
        </h3>
        <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
          {feature.description}
        </p>
      </div>

      {feature.extra === 'knowledge' && (
        <div className="mt-4 space-y-1 font-mono text-[11px] text-gray-600">
          <div>PDF_DOC_INDEXING...</div>
          <div>URL_CONTENT_PARSING...</div>
          <div className="text-accent/60">INDEXACAO RAG ATIVA</div>
        </div>
      )}

      {feature.extra === 'handoff' && (
        <div className="mt-4 font-mono text-xs text-accent/60 animate-blink tracking-widest">
          WAITING_FOR_HUMAN...
        </div>
      )}

      {feature.extra === 'retention' && (
        <div className="mt-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse-fast" />
          <span className="font-mono text-[11px] text-gray-500 tracking-wider">HUMANIZATION ACTIVE</span>
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
          <span className="font-mono text-[11px] tracking-[0.4em] uppercase text-accent">
            MOTOR: GOOGLE GEMINI
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tighter text-white uppercase">
            RECURSOS DE ELITE
          </h2>
          <p className="font-mono text-xs tracking-[0.3em] text-gray-500 uppercase">
            LATENCIA MEDIA: &lt; 1.2S
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 auto-rows-[240px] gap-4">
          {features.map((feature) => (
            <SpotlightCard key={feature.id} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
