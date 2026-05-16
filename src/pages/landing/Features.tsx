import { useRef, useCallback } from 'react';
import { Fingerprint, Layers, Database, ArrowRightLeft, BarChart3, Heart } from 'lucide-react';

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
    icon: Fingerprint,
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

  const isPersonality = feature.id === 'personality';

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`spotlight glass rounded-3xl p-6 sm:p-8 ${feature.span} flex flex-col justify-between group hover:border-white/10 transition-all ${isPersonality ? 'personality-card hover:scale-[1.01]' : ''}`}
    >
      <div>
        {isPersonality ? (
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4 icon-glow">
            <feature.icon size={22} className="text-accent" strokeWidth={1.5} />
          </div>
        ) : (
          <feature.icon
            size={20}
            className="text-accent mb-4"
            strokeWidth={1.5}
          />
        )}
        <h3 className="font-display font-semibold text-base sm:text-lg uppercase tracking-wider text-white mb-3">
          {feature.title}
        </h3>
        {isPersonality && (
          <div className="w-10 h-0.5 bg-accent/40 rounded-full mb-3" />
        )}
        <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
          {feature.description}
        </p>
      </div>

      {isPersonality && (
        <div className="mt-5 space-y-3 config-panel">
          {/* Formalidade slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-widest text-gray-500 uppercase">Formalidade</span>
              <span className="font-mono text-[10px] text-accent/70">68%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-accent/60 to-accent slider-fill" style={{ width: '68%' }} />
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-[9px] text-gray-600">Casual</span>
              <span className="font-mono text-[9px] text-gray-600">Formal</span>
            </div>
          </div>

          {/* Tom de voz dropdown */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="font-mono text-[10px] tracking-wider text-gray-500 uppercase">Tom de Voz</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] text-gray-300">Amigavel</span>
              <svg width="10" height="10" viewBox="0 0 10 10" className="text-gray-500"><path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" /></svg>
            </div>
          </div>

          {/* Girias toggle + tags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-wider text-gray-500 uppercase">Girias Regionais</span>
              <div className="w-8 h-[18px] rounded-full bg-accent/20 border border-accent/30 flex items-center px-0.5">
                <div className="w-3.5 h-3.5 rounded-full bg-accent ml-auto shadow-[0_0_6px_rgba(255,59,0,0.4)]" />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['top', 'massa', 'show', 'beleza'].map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-md bg-accent/[0.08] border border-accent/15 font-mono text-[10px] text-accent/80 tracking-wider">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

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
    <section id="features" className="py-10 md:py-32 px-6">
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
