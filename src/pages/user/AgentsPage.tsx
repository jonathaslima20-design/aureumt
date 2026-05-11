import { useEffect, useState } from 'react';
import { Plus, Link2, Play, Pause, ChevronRight, Bot, Database, Sparkles } from 'lucide-react';
import { Instance, AgentTemplate, supabase } from '../../lib/supabase';
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
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingTemplates(true);
      const { data } = await supabase
        .from('agent_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      setTemplates((data as AgentTemplate[]) || []);
      setLoadingTemplates(false);
    })();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Agentes</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {instances.length === 0
              ? 'Crie e gerencie seus agentes de IA.'
              : `${instances.length} agente${instances.length !== 1 ? 's' : ''} configurado${instances.length !== 1 ? 's' : ''}.`}
          </p>
        </div>
        <button
          onClick={onCreateAgent}
          className="bg-white text-black rounded-lg px-4 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-neutral-200 transition-colors"
        >
          <Plus size={14} /> {instances.length === 0 ? 'Criar agente' : 'Novo agente'}
        </button>
      </div>

      {/* Existing agents */}
      {instances.length > 0 && (
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
      )}

      {/* Templates section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={13} className="text-neutral-500" />
          <span className="text-xs uppercase tracking-wider text-neutral-500">Templates disponíveis</span>
        </div>

        {loadingTemplates ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-5 animate-pulse h-32" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="border border-dashed border-[#242424] rounded-xl p-10 text-center bg-[#0d0d0d]">
            <Bot size={20} className="text-neutral-700 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-xs text-neutral-600">Nenhum template disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.map((t) => (
              <TemplateCard key={t.id} template={t} onUse={onCreateAgent} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ template, onUse }: { template: AgentTemplate; onUse: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onUse}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group text-left bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-5 transition-all duration-300 flex flex-col gap-4 hover:bg-[#141414]"
      style={{
        borderColor: hovered ? 'rgba(255,255,255,0.12)' : undefined,
        boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.4)' : undefined,
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-2xl flex-shrink-0 transition-transform duration-300 group-hover:scale-105"
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1.5px solid rgba(255,255,255,0.08)',
          }}
        >
          {template.profile_image_url ? (
            <img
              src={template.profile_image_url}
              alt={template.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{template.icon || '🤖'}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white leading-snug">{template.title}</div>
          {template.description && (
            <div className="text-[11px] text-neutral-500 mt-1 leading-relaxed line-clamp-2">
              {template.description}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          {template.default_settings?.tone && (
            <span className="text-[10px] text-neutral-500 border border-[#1a1a1a] rounded-md px-2 py-0.5">
              {TONE_LABELS[template.default_settings.tone] || template.default_settings.tone}
            </span>
          )}
        </div>
        <span className="text-[11px] text-neutral-600 group-hover:text-neutral-400 transition-colors flex items-center gap-1">
          Usar <ChevronRight size={11} />
        </span>
      </div>
    </button>
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
  const isActive = instance.flow_status === 'active';

  const color = instance.color || '#3b82f6';
  const glowColor = `${color}22`;
  const glowBorder = `${color}40`;

  return (
    <button
      onClick={onClick}
      className="group text-left bg-[#141414] border border-[#242424] rounded-2xl p-5 transition-all duration-300 flex flex-col gap-4"
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
