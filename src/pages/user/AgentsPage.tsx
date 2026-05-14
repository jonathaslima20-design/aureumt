import { useState } from 'react';
import { Plus, ChevronRight } from 'lucide-react';
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

const MATURITY_RING: Record<Maturity, string> = {
  basic: '#a16207',
  intermediate: '#3b82f6',
  advanced: '#10b981',
};

const MATURITY_LABEL: Record<Maturity, string> = {
  basic: 'Básico',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

export function AgentsPage({ instances, onCreateAgent, onSelectAgent, onInstanceUpdate, linkedBaseCounts, personaMap, exampleCounts, connectionCounts }: Props) {
  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Agentes</h1>
          <p className="text-sm text-neutral-500 mt-2">
            {instances.length === 0
              ? 'Crie seu primeiro agente.'
              : `${instances.length} agente${instances.length !== 1 ? 's' : ''}.`}
          </p>
        </div>
        {instances.length > 0 && (
          <button
            onClick={onCreateAgent}
            className="bg-white text-black rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 hover:bg-neutral-200 transition-colors"
          >
            <Plus size={14} /> Novo agente
          </button>
        )}
      </header>

      {instances.length === 0 ? (
        <div className="rounded-2xl bg-[#0d0d0d] p-16 text-center">
          <p className="text-sm text-white font-medium mb-2">Nenhum agente ainda</p>
          <p className="text-sm text-neutral-500 mb-6">Crie seu primeiro agente em segundos.</p>
          <button
            onClick={onCreateAgent}
            className="bg-white text-black rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2 hover:bg-neutral-200 transition-colors"
          >
            <Plus size={14} /> Criar agente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {instances.map((inst) => (
            <AgentCard
              key={inst.id}
              instance={inst}
              maturity={calcMaturity({
                hasKnowledge: (linkedBaseCounts[inst.id] ?? 0) > 0,
                hasPersona: !!personaMap[inst.id],
                exampleCount: exampleCounts[inst.id] ?? 0,
                hasConnection: (connectionCounts[inst.id] ?? 0) > 0,
              })}
              onClick={() => onSelectAgent(inst)}
              onToggleStatus={onInstanceUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}


function AgentCard({
  instance,
  maturity,
  onClick,
  onToggleStatus,
}: {
  instance: Instance;
  maturity: Maturity;
  onClick: () => void;
  onToggleStatus: (updated: Instance) => void;
}) {
  const [toggling, setToggling] = useState(false);
  const [hover, setHover] = useState(false);
  const name = instance.display_name || instance.instance_name;
  const isActive = instance.flow_status === 'active';
  const ringColor = MATURITY_RING[maturity];

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
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group text-left rounded-2xl p-5 transition-colors flex items-center gap-4 bg-[#0d0d0d] hover:bg-[#141414]"
      title={`Maturidade: ${MATURITY_LABEL[maturity]}`}
    >
      <div className="relative shrink-0">
        <div
          className="rounded-full p-[2px]"
          style={{ background: `conic-gradient(from 0deg, ${ringColor}, ${ringColor}55, ${ringColor})` }}
        >
          <div className="rounded-full bg-[#0d0d0d] p-[2px]">
            <AgentAvatar name={name} url={instance.avatar_url} color={instance.color} size={48} />
          </div>
        </div>
        <span
          aria-label={isActive ? 'Ativo' : 'Pausado'}
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0d0d0d] ${
            isActive ? 'bg-emerald-400' : 'bg-neutral-600'
          }`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{name}</div>
        <div className="text-xs text-neutral-500 truncate mt-1">
          {instance.company_name || (isActive ? 'Ativo' : 'Pausado')}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {hover && (
          <div
            role="button"
            aria-label={isActive ? 'Pausar' : 'Ativar'}
            onClick={handleToggle}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              toggling ? 'opacity-50 pointer-events-none' : ''
            } ${
              isActive
                ? 'text-neutral-400 hover:text-white hover:bg-[#1a1a1a]'
                : 'text-emerald-400 hover:bg-[#1a1a1a]'
            }`}
          >
            {isActive ? 'Pausar' : 'Ativar'}
          </div>
        )}
        <ChevronRight size={14} className="text-neutral-700 group-hover:text-neutral-400 transition-colors" />
      </div>
    </button>
  );
}
