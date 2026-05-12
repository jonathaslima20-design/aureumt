import { useEffect, useState } from 'react';
import { Loader2, Sparkles, X, Check, Bot } from 'lucide-react';
import { supabase, AgentTemplate, Instance, buildSystemPrompt, AGENT_COLORS } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type Props = {
  onAgentCreated: (inst: Instance) => void;
};

export function TemplateGalleryPage({ onAgentCreated }: Props) {
  const { profile } = useAuth();
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AgentTemplate | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('agent_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      setTemplates((data as AgentTemplate[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={20} className="animate-spin text-neutral-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Templates</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Escolha um modelo pronto para criar seu agente rapidamente.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="border border-dashed border-[#242424] rounded-xl py-16 text-center bg-[#0d0d0d]">
          <Sparkles size={24} className="mx-auto text-neutral-700 mb-3" strokeWidth={1.5} />
          <p className="text-sm text-neutral-500 mb-1">Nenhum template disponivel</p>
          <p className="text-xs text-neutral-600">
            Os templates serao adicionados pela equipe em breve.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} onUse={() => setSelected(t)} />
          ))}
        </div>
      )}

      {selected && profile && (
        <UseTemplateModal
          template={selected}
          userId={profile.id}
          onClose={() => setSelected(null)}
          onCreated={onAgentCreated}
        />
      )}
    </div>
  );
}

function TemplateCard({ template, onUse }: { template: AgentTemplate; onUse: () => void }) {
  const settings = template.default_settings;

  return (
    <div className="bg-[#141414] border border-[#242424] rounded-xl overflow-hidden hover:border-[#2e2e2e] transition-all group">
      <div className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          {template.profile_image_url ? (
            <img
              src={template.profile_image_url}
              alt={template.title}
              className="w-12 h-12 rounded-full object-cover shrink-0 border border-[#242424]"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#242424] flex items-center justify-center text-xl shrink-0">
              {template.icon || <Bot size={20} className="text-neutral-500" />}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-white truncate">{template.title}</h3>
            <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2 leading-relaxed">
              {template.description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {settings.tone && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#242424] bg-[#0d0d0d] text-neutral-400">
              {settings.tone}
            </span>
          )}
          {settings.language && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#242424] bg-[#0d0d0d] text-neutral-400">
              {settings.language}
            </span>
          )}
          {settings.emoji_usage && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#242424] bg-[#0d0d0d] text-neutral-400">
              emoji: {settings.emoji_usage}
            </span>
          )}
        </div>
      </div>

      <div className="px-5 pb-4">
        <button
          onClick={onUse}
          className="w-full bg-white text-black rounded-lg py-2 text-xs font-medium hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5"
        >
          <Sparkles size={12} /> Usar este template
        </button>
      </div>
    </div>
  );
}

function UseTemplateModal({
  template,
  userId,
  onClose,
  onCreated,
}: {
  template: AgentTemplate;
  userId: string;
  onClose: () => void;
  onCreated: (inst: Instance) => void;
}) {
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, string>>(() => {
    const vals: Record<string, string> = {};
    template.custom_fields.forEach((f) => { vals[f.key] = ''; });
    return vals;
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const canCreate = displayName.trim().length > 0 &&
    template.custom_fields.filter((f) => f.required).every((f) => customValues[f.key]?.trim());

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    setError('');

    try {
      let prompt = template.base_prompt;
      Object.entries(customValues).forEach(([key, val]) => {
        prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val.trim());
      });

      const systemPrompt = buildSystemPrompt({
        persona_name: displayName.trim(),
        company_name: companyName.trim(),
        tone: template.default_settings.tone,
        language: template.default_settings.language,
        emoji_usage: template.default_settings.emoji_usage,
        base: prompt,
      });

      const color = AGENT_COLORS[Math.floor(Math.random() * AGENT_COLORS.length)];

      const { data, error: dbErr } = await supabase
        .from('instances')
        .insert({
          user_id: userId,
          instance_name: displayName.trim().toLowerCase().replace(/\s+/g, '-'),
          display_name: displayName.trim(),
          company_name: companyName.trim(),
          persona_name: displayName.trim(),
          system_prompt: systemPrompt,
          tone: template.default_settings.tone,
          language: template.default_settings.language,
          emoji_usage: template.default_settings.emoji_usage,
          avatar_url: template.profile_image_url || '',
          color,
        })
        .select()
        .single();

      if (dbErr) throw dbErr;
      onCreated(data as Instance);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar agente');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#141414] border border-[#242424] rounded-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242424]">
          <div className="flex items-center gap-3">
            {template.profile_image_url ? (
              <img src={template.profile_image_url} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#242424] flex items-center justify-center text-sm">
                {template.icon || '🤖'}
              </div>
            )}
            <div>
              <span className="text-sm text-white font-medium">Usar: {template.title}</span>
              <p className="text-[11px] text-neutral-500">Preencha os dados para criar o agente</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">Nome do agente *</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex: Julia Atendente"
              className="w-full bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#363636] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">Empresa</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nome da sua empresa"
              className="w-full bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#363636] outline-none transition-colors"
            />
          </div>

          {template.custom_fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs text-neutral-400 mb-1.5">
                {field.label}{field.required && ' *'}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={customValues[field.key] || ''}
                  onChange={(e) => setCustomValues({ ...customValues, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#363636] outline-none transition-colors resize-none"
                />
              ) : (
                <input
                  type={field.type === 'url' ? 'url' : 'text'}
                  value={customValues[field.key] || ''}
                  onChange={(e) => setCustomValues({ ...customValues, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#363636] outline-none transition-colors"
                />
              )}
            </div>
          ))}

          {error && (
            <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#242424] flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-[#1a1a1a] text-neutral-300 hover:text-white hover:border-[#2e2e2e] rounded-lg py-2.5 text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate || creating}
            className="flex-1 bg-white text-black rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Criar agente
          </button>
        </div>
      </div>
    </div>
  );
}
