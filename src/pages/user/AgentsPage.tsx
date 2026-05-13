import { useState } from 'react';
import { Plus, Link2, Play, Pause, ChevronRight, Database, Power } from 'lucide-react';
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Agentes</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            {instances.length === 0
              ? 'Crie e gerencie seus agentes de IA.'
              : `${instances.length} agente${instances.length !== 1 ? 's' : ''} configurado${instances.length !== 1 ? 's' : ''}.`}
          </p>
        </div>
        <button
          onClick={onCreateAgent}
          className="bg-white text-black rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium flex items-center gap-2 hover:bg-neutral-200 transition-colors"
        >
          <Plus size={14} /> {instances.length === 0 ? 'Criar agente' : 'Novo agente'}
        </button>
      </div>

      {instances.length === 0 ? (
        <div className="border border-dashed border-[#242424] rounded-2xl p-10 sm:p-16 text-center bg-[#0d0d0d]">
          <div className="text-4xl mb-4">🤖</div>
          <p className="text-sm text-white font-medium mb-1">Nenhum agente ainda</p>
          <p className="text-xs text-neutral-600 mb-5">Crie seu primeiro agente e configure-o.</p>
          <button
            onClick={onCreateAgent}
            className="bg-white text-black rounded-lg px-4 py-2.5 text-sm font-medium inline-flex items-center gap-2 hover:bg-neutral-200 transition-colors"
          >
            <Plus size={14} /> Criar agente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {instances.map((inst) => (
            <AgentCard
              key={inst.id}
              instance={inst}
              linkedBases={linkedBaseCounts[inst.id] ?? 0}
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
  linkedBases,
  maturity,
  onClick,
  onToggleStatus,
}: {
  instance: Instance;
  linkedBases: number;
  maturity: Maturity;
  onClick: () => void;
  onToggleStatus: (updated: Instance) => void;
}) {
  const [toggling, setToggling] = useState(false);
  const name = instance.display_name || instance.instance_name;
  const isActive = instance.flow_status === 'active';

  const color = instance.color || '#3b82f6';
  const glowColor = `${color}22`;
  const glowBorder = `${color}40`;

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
      className="group text-left bg-[#141414] border border-[#242424] rounded-2xl p-4 sm:p-5 transition-all duration-300 flex flex-col gap-3 sm:gap-4"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 1px ${glowBorder}, 0 0 32px 0 ${glowColor}, 0 8px 40px 0 rgba(0,0,0,0.6)`;
        (e.currentTarget as HTMLButtonElement).style.borderColor = glowBorder;
        (e.currentTarget as HTMLButtonElement).style.background = '#1a1a1a';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
        (e.currentTarget as HTMLButtonElement).style.borderColor = '';
        (e.currentTarget as HTMLButtonElement).style.background = '';
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AgentAvatar name={name} url={instance.avatar_url} color={instance.color} size={56} />
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">{name}</div>
            {instance.persona_name && instance.persona_name !== name && (
              <div className="text-[11px] text-neutral-500 truncate mt-0.5">
                Persona: {instance.persona_name}
              </div>
            )}
            {instance.company_name && (
              <div className="text-[11px] text-neutral-500 truncate">
                {instance.company_name}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-medium ${MATURITY_STYLE[maturity]}`}
            title="Maturidade do agente: baseada em conhecimento, persona, exemplos e conexão WhatsApp"
          >
            {MATURITY_LABEL[maturity]}
          </span>
          <ChevronRight
            size={14}
            className="text-neutral-600 group-hover:text-neutral-400 transition-colors mt-1"
          />
        </div>
      </div>

      <div
        className="h-px w-full"
        style={{ background: `linear-gradient(to right, ${instance.color || '#3b82f6'}33, transparent)` }}
      />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {isActive ? (
            <Play size={11} className="text-blue-400" />
          ) : (
            <Pause size={11} className="text-amber-400" />
          )}
          <span className={`text-[11px] ${isActive ? 'text-blue-400' : 'text-amber-400'}`}>
            {isActive ? 'Ativo' : 'Pausado'}
          </span>
        </div>

        <div
          role="switch"
          aria-checked={isActive}
          aria-label={isActive ? 'Desativar agente' : 'Ativar agente'}
          onClick={handleToggle}
          className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all ${
            toggling ? 'opacity-50 pointer-events-none' : ''
          } ${
            isActive
              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-neutral-700/30 text-neutral-400 hover:bg-neutral-700/50'
          }`}
        >
          <Power size={11} />
          {isActive ? 'Ligado' : 'Desligado'}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-auto pt-1">
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-600">
          <Database size={11} />
          <span>
            {linkedBases === 0
              ? 'Sem bases vinculadas'
              : `${linkedBases} base${linkedBases !== 1 ? 's' : ''} vinculada${linkedBases !== 1 ? 's' : ''}`}
          </span>
        </div>
        {linkedBases > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-600">
            <Link2 size={11} />
          </div>
        )}
      </div>
    </button>
  );
}
