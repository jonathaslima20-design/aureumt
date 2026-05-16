import { useState } from 'react';
import { Plus, Play, Pause, ChevronRight, Database, Link2, Power, Sparkles } from 'lucide-react';
import { supabase, Instance } from '../../lib/supabase';
import { AgentAvatar } from '../../components/AgentAvatar';

type Props = {
  instances: Instance[];
  onCreateAgent: () => void;
  onSelectAgent: (instance: Instance) => void;
  onInstanceUpdate: (updated: Instance) => void;
  linkedBaseCounts: Record<string, number>;
  personaMap: Record<string, boolean>;
  exampleCounts: Record<string, number>;
  connectionCounts: Record<string, number>;
};

type Maturity = 'basic' | 'intermediate' | 'advanced';

export function calcMaturity(input: {
  hasKnowledge: boolean;
  hasPersona: boolean;
  exampleCount: number;
  hasConnection: boolean;
}): Maturity {
  const score = (input.hasKnowledge ? 1 : 0) + (input.hasPersona ? 1 : 0) + (input.exampleCount >= 3 ? 1 : 0) + (input.hasConnection ? 1 : 0);
  if (score >= 4) return 'advanced';
  if (score >= 2) return 'intermediate';
  return 'basic';
}

const MATURITY_LABEL: Record<Maturity, string> = {
  basic: 'Básico',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

const MATURITY_STYLE: Record<Maturity, string> = {
  basic: 'bg-amber-500/10 text-amber-400 border-amber-900/40',
  intermediate: 'bg-blue-500/10 text-blue-400 border-blue-900/40',
  advanced: 'bg-emerald-500/10 text-emerald-400 border-emerald-900/40',
};

const TONE_LABELS: Record<string, string> = {
  friendly: 'Amigável',
  professional: 'Profissional',
  casual: 'Descontraído',
  technical: 'Técnico',
  warm: 'Acolhedor',
};

export function AgentsPage({ instances, onCreateAgent, onSelectAgent, onInstanceUpdate, linkedBaseCounts, personaMap, exampleCounts, connectionCounts }: Props) {
  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent block mb-1">GESTAO DE AGENTES</span>
          <h1 className="font-display font-bold text-xl tracking-tighter text-white uppercase">Agentes</h1>
          <p className="text-sm text-neutral-500 mt-2">
            {instances.length === 0
              ? 'Crie seu primeiro agente.'
              : `${instances.length} agente${instances.length !== 1 ? 's' : ''} configurado${instances.length !== 1 ? 's' : ''}.`}
          </p>
        </div>
        {instances.length > 0 && (
          <button
            onClick={onCreateAgent}
            className="rounded-lg px-5 py-2.5 text-sm font-display font-semibold uppercase tracking-wider flex items-center gap-2 transition-all bg-accent text-white shadow-[0_0_20px_rgba(255,59,0,0.25)] hover:shadow-[0_0_30px_rgba(255,59,0,0.4)]"
          >
            <Plus size={14} /> Novo agente
          </button>
        )}
      </header>

      {instances.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <p className="text-sm text-white font-medium mb-2">Nenhum agente ainda</p>
          <p className="text-sm text-neutral-500 mb-6">Crie seu primeiro agente em segundos.</p>
          <button
            onClick={onCreateAgent}
            className="bg-accent text-white rounded-lg px-6 py-3 text-sm font-display font-semibold uppercase tracking-wider inline-flex items-center gap-2 shadow-[0_0_20px_rgba(255,59,0,0.25)] hover:shadow-[0_0_30px_rgba(255,59,0,0.4)] transition-all"
          >
            <Plus size={14} /> Criar agente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {instances.map((inst) => {
            const maturity = calcMaturity({
              hasKnowledge: (linkedBaseCounts[inst.id] ?? 0) > 0,
              hasPersona: !!personaMap[inst.id],
              exampleCount: exampleCounts[inst.id] ?? 0,
              hasConnection: (connectionCounts[inst.id] ?? 0) > 0,
            });
            return (
              <AgentCard
                key={inst.id}
                instance={inst}
                linkedBases={linkedBaseCounts[inst.id] ?? 0}
                connections={connectionCounts[inst.id] ?? 0}
                examples={exampleCounts[inst.id] ?? 0}
                maturity={maturity}
                hasPersona={!!personaMap[inst.id]}
                onClick={() => onSelectAgent(inst)}
                onToggleStatus={onInstanceUpdate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}


function AgentCard({
  instance,
  linkedBases,
  connections,
  examples,
  maturity,
  hasPersona,
  onClick,
  onToggleStatus,
}: {
  instance: Instance;
  linkedBases: number;
  connections: number;
  examples: number;
  maturity: Maturity;
  hasPersona: boolean;
  onClick: () => void;
  onToggleStatus: (updated: Instance) => void;
}) {
  const [toggling, setToggling] = useState(false);
  const name = instance.display_name || instance.instance_name;
  const isActive = instance.flow_status === 'active';
  const color = instance.color || '#3b82f6';

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (toggling) return;
    setToggling(true);
    const newStatus = isActive ? 'paused' : 'active';
    const { error } = await supabase
      .from('instances')
      .update({ flow_status: newStatus })
      .eq('id', instance.id);
    if (!error) {
      onToggleStatus({ ...instance, flow_status: newStatus });
    }
    setToggling(false);
  };

  return (
    <button
      onClick={onClick}
      className="group text-left glass rounded-2xl p-6 transition-all duration-300 flex flex-col gap-5"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 32px 0 ${color}15, 0 8px 40px 0 rgba(0,0,0,0.5)`;
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}40`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
        (e.currentTarget as HTMLButtonElement).style.borderColor = '';
      }}
    >
      {/* Header: Avatar + Name + Status */}
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <AgentAvatar name={name} url={instance.avatar_url} color={instance.color} size={56} />
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[2.5px] border-[#0d0d0d] ${
              isActive ? 'bg-emerald-400' : 'bg-neutral-600'
            }`}
          />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white truncate">{name}</h3>
            <ChevronRight size={13} className="text-neutral-700 group-hover:text-neutral-400 transition-colors shrink-0" />
          </div>
          {instance.company_name && (
            <p className="text-xs text-neutral-500 truncate mt-0.5">{instance.company_name}</p>
          )}
          {instance.persona_name && instance.persona_name !== name && (
            <p className="text-xs text-neutral-600 truncate mt-0.5">Persona: {instance.persona_name}</p>
          )}
        </div>
      </div>

      {/* Colored accent line */}
      <div
        className="h-px w-full rounded-full"
        style={{ background: `linear-gradient(to right, ${color}44, transparent 80%)` }}
      />

      {/* Info Row: Maturity + Tone */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border font-medium ${MATURITY_STYLE[maturity]}`}>
          {MATURITY_LABEL[maturity]}
        </span>
        {instance.tone && TONE_LABELS[instance.tone] && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900/50 text-neutral-400 font-medium">
            {TONE_LABELS[instance.tone]}
          </span>
        )}
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 text-xs text-neutral-500">
        <div className="flex items-center gap-1.5" title="Bases de conhecimento vinculadas">
          <Database size={12} className="shrink-0" />
          <span>{linkedBases} base{linkedBases !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5" title="Conexões WhatsApp">
          <Link2 size={12} className="shrink-0" />
          <span>{connections} conexão{connections !== 1 ? 'ões' : ''}</span>
        </div>
        {examples > 0 && (
          <div className="flex items-center gap-1.5" title="Exemplos de treinamento">
            <Sparkles size={12} className="shrink-0" />
            <span>{examples} ex.</span>
          </div>
        )}
      </div>

      {/* Footer: Status + Toggle */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          {isActive ? (
            <Play size={11} className="text-emerald-400" />
          ) : (
            <Pause size={11} className="text-amber-400" />
          )}
          <span className={`text-xs font-medium ${isActive ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isActive ? 'Ativo' : 'Pausado'}
          </span>
        </div>

        <div
          role="switch"
          aria-checked={isActive}
          aria-label={isActive ? 'Desativar agente' : 'Ativar agente'}
          onClick={handleToggle}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all ${
            toggling ? 'opacity-50 pointer-events-none' : ''
          } ${
            isActive
              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-700/50'
          }`}
        >
          <Power size={11} />
          {isActive ? 'Ligado' : 'Desligado'}
        </div>
      </div>
    </button>
  );
}
