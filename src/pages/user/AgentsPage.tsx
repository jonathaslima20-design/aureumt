import { Plus, Link2, Wifi, WifiOff, Play, Pause, ChevronRight, Bot, Database } from 'lucide-react';
import { Instance } from '../../lib/supabase';
import { AgentAvatar } from '../../components/AgentAvatar';

type Props = {
  instances: Instance[];
  onCreateAgent: () => void;
  onSelectAgent: (instance: Instance) => void;
  linkedBaseCounts: Record<string, number>;
};

const TONE_LABELS: Record<string, string> = {
  friendly: 'Amigável',
  professional: 'Profissional',
  casual: 'Descontraído',
  technical: 'Técnico',
  warm: 'Acolhedor',
};

export function AgentsPage({ instances, onCreateAgent, onSelectAgent, linkedBaseCounts }: Props) {
  if (instances.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Agentes</h1>
            <p className="text-sm text-neutral-500 mt-1">Crie e gerencie seus agentes de IA.</p>
          </div>
        </div>
        <div className="border border-dashed border-[#252530] rounded-xl p-16 text-center bg-[#0d0d12]">
          <div className="w-14 h-14 rounded-2xl bg-[#141418] border border-[#252530] flex items-center justify-center mx-auto mb-4">
            <Bot size={24} className="text-neutral-600" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-neutral-400 mb-1">Nenhum agente ainda</p>
          <p className="text-xs text-neutral-600 mb-6">Crie seu primeiro agente para começar a automatizar atendimentos.</p>
          <button
            onClick={onCreateAgent}
            className="bg-white text-black rounded-lg px-4 py-2.5 text-sm font-medium inline-flex items-center gap-2 hover:bg-neutral-200 transition-colors"
          >
            <Plus size={14} /> Criar agente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Agentes</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {instances.length} agente{instances.length !== 1 ? 's' : ''} configurado{instances.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <button
          onClick={onCreateAgent}
          className="bg-white text-black rounded-lg px-4 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-neutral-200 transition-colors"
        >
          <Plus size={14} /> Novo agente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {instances.map((inst) => (
          <AgentCard
            key={inst.id}
            instance={inst}
            linkedBases={linkedBaseCounts[inst.id] ?? 0}
            onClick={() => onSelectAgent(inst)}
          />
        ))}
      </div>
    </div>
  );
}

function AgentCard({
  instance,
  linkedBases,
  onClick,
}: {
  instance: Instance;
  linkedBases: number;
  onClick: () => void;
}) {
  const name = instance.display_name || instance.instance_name;
  const isConnected = instance.status === 'open';
  const isActive = instance.flow_status === 'active';

  const color = instance.color || '#3b82f6';
  const glowColor = `${color}22`;
  const glowBorder = `${color}40`;

  return (
    <button
      onClick={onClick}
      className="group text-left bg-[#111116] border border-[#252530] rounded-2xl p-5 transition-all duration-300 flex flex-col gap-4"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 1px ${glowBorder}, 0 0 32px 0 ${glowColor}, 0 8px 40px 0 rgba(0,0,0,0.6)`;
        (e.currentTarget as HTMLButtonElement).style.borderColor = glowBorder;
        (e.currentTarget as HTMLButtonElement).style.background = '#16161e';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
        (e.currentTarget as HTMLButtonElement).style.borderColor = '';
        (e.currentTarget as HTMLButtonElement).style.background = '';
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AgentAvatar name={name} url={instance.avatar_url} color={instance.color} size={48} />
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
        <ChevronRight
          size={14}
          className="text-neutral-600 group-hover:text-neutral-400 transition-colors shrink-0 mt-1"
        />
      </div>

      <div
        className="h-px w-full"
        style={{ background: `linear-gradient(to right, ${instance.color || '#3b82f6'}33, transparent)` }}
      />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <Wifi size={12} className="text-emerald-400" />
          ) : (
            <WifiOff size={12} className="text-neutral-600" />
          )}
          <span className={`text-[11px] ${isConnected ? 'text-emerald-400' : 'text-neutral-600'}`}>
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>

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

        {instance.tone && (
          <span className="text-[11px] text-neutral-500">
            {TONE_LABELS[instance.tone] || instance.tone}
          </span>
        )}
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
