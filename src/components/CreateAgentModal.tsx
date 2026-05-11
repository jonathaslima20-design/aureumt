import { useEffect, useRef, useState } from 'react';
import {
  X, Loader2, Upload, Check, ArrowRight, ArrowLeft,
  Sparkles, Bot, ChevronRight,
} from 'lucide-react';
import {
  supabase,
  Instance,
  AgentTemplate,
  AGENT_COLORS,
  buildSystemPrompt,
} from '../lib/supabase';
import { AgentAvatar } from './AgentAvatar';

// ─── Specialty badge palette ──────────────────────────────────────────────────

const BADGE_PALETTES = [
  { border: 'border-emerald-700/50', text: 'text-emerald-300', glow: '0 0 32px 4px rgba(16,185,129,0.14)' },
  { border: 'border-amber-700/50',   text: 'text-amber-300',   glow: '0 0 32px 4px rgba(245,158,11,0.14)' },
  { border: 'border-sky-700/50',     text: 'text-sky-300',     glow: '0 0 32px 4px rgba(14,165,233,0.16)' },
  { border: 'border-rose-700/50',    text: 'text-rose-300',    glow: '0 0 32px 4px rgba(244,63,94,0.12)' },
  { border: 'border-teal-700/50',    text: 'text-teal-300',    glow: '0 0 32px 4px rgba(20,184,166,0.14)' },
];

// ─── Template gallery card (large format) ────────────────────────────────────

function TemplateCard({
  template,
  index,
  selected,
  onSelect,
}: {
  template: AgentTemplate;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const palette = BADGE_PALETTES[index % BADGE_PALETTES.length];
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        relative w-full text-left rounded-2xl border transition-all duration-300 overflow-hidden
        ${selected
          ? `border-white/25 bg-white/[0.04]`
          : 'border-white/[0.06] bg-[#0a0a0a] hover:bg-white/[0.03] hover:border-white/[0.12]'}
      `}
      style={{ boxShadow: (hovered || selected) ? palette.glow : 'none' }}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white flex items-center justify-center">
          <Check size={11} className="text-black" />
        </div>
      )}

      <div className="p-5 flex items-center gap-4">
        {/* Avatar */}
        <div
          className={`w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-3xl shrink-0 border-2 ${palette.border} transition-transform duration-300`}
          style={{ transform: (hovered || selected) ? 'scale(1.06)' : 'scale(1)', background: 'rgba(0,0,0,0.5)' }}
        >
          {template.profile_image_url ? (
            <img src={template.profile_image_url} alt={template.title} className="w-full h-full object-cover" />
          ) : (
            <span>{template.icon || '🤖'}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-white leading-snug mb-0.5">{template.title}</div>
          <p className={`text-[11px] font-medium mb-1.5 ${palette.text}`}>
            {template.description.split(' ').slice(0, 5).join(' ')}
          </p>
          <p className="text-[11px] text-neutral-500 leading-relaxed line-clamp-2">{template.description}</p>
        </div>

        <ChevronRight
          size={14}
          className={`shrink-0 transition-all duration-300 ${selected ? 'text-white rotate-90' : 'text-neutral-700'}`}
        />
      </div>
    </button>
  );
}

// ─── Chat preview ─────────────────────────────────────────────────────────────

function ChatPreview({
  agentName,
  avatarUrl,
  color,
  templateTitle,
}: {
  agentName: string;
  avatarUrl: string;
  color: string;
  templateTitle: string;
}) {
  const greeting = `Olá! Eu sou ${agentName}${templateTitle ? `, especialista em ${templateTitle.toLowerCase()}` : ''}. Como posso te ajudar?`;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#060606] overflow-hidden">
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-white/[0.05] bg-[#0d0d0d]">
        <AgentAvatar name={agentName} url={avatarUrl} color={color} size={26} />
        <div>
          <div className="text-[11px] font-semibold text-white leading-tight">{agentName}</div>
          <div className="text-[9px] text-emerald-400">online</div>
        </div>
      </div>
      <div className="px-3 py-4">
        <div className="flex items-end gap-2">
          <AgentAvatar name={agentName} url={avatarUrl} color={color} size={20} />
          <div
            className="max-w-[85%] rounded-2xl rounded-bl-none px-3 py-2 text-[11px] text-white leading-relaxed"
            style={{ background: `${color}22`, border: `1px solid ${color}33` }}
          >
            {greeting}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1 — Template gallery ────────────────────────────────────────────────

function StepTemplate({
  templates,
  loading,
  selectedId,
  onSelect,
}: {
  templates: AgentTemplate[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h3 className="text-[15px] text-white font-semibold mb-1">Escolha o especialista</h3>
        <p className="text-xs text-neutral-500">Selecione o perfil mais adequado ao seu negócio.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={18} className="text-neutral-600 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="border border-dashed border-white/[0.07] rounded-2xl py-14 text-center">
          <Bot size={20} className="mx-auto text-neutral-700 mb-2" strokeWidth={1.5} />
          <p className="text-xs text-neutral-600">Nenhum template disponível no momento.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {templates.map((t, i) => (
            <TemplateCard
              key={t.id}
              template={t}
              index={i}
              selected={selectedId === t.id}
              onSelect={() => onSelect(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step 2 — Customize ───────────────────────────────────────────────────────

function StepCustomize({
  template,
  index,
  displayName,
  setDisplayName,
  personaName,
  setPersonaName,
  companyName,
  setCompanyName,
  avatarUrl,
  setAvatarUrl,
  color,
  setColor,
  uploading,
  onUpload,
  userId,
}: {
  template: AgentTemplate;
  index: number;
  displayName: string;
  setDisplayName: (v: string) => void;
  personaName: string;
  setPersonaName: (v: string) => void;
  companyName: string;
  setCompanyName: (v: string) => void;
  avatarUrl: string;
  setAvatarUrl: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  uploading: boolean;
  onUpload: (f: File) => void;
  userId: string;
}) {
  const palette = BADGE_PALETTES[index % BADGE_PALETTES.length];
  const agentName = personaName || displayName || template.title;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Template context header */}
      <div className="flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.07] bg-white/[0.02]">
        <div
          className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-xl shrink-0 border ${palette.border}`}
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          {template.profile_image_url ? (
            <img src={template.profile_image_url} alt={template.title} className="w-full h-full object-cover" />
          ) : (
            <span>{template.icon || '🤖'}</span>
          )}
        </div>
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${palette.text}`}>Template selecionado</p>
          <p className="text-[13px] text-white font-medium">{template.title}</p>
        </div>
      </div>

      {/* Agent identity */}
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div
            className="relative group cursor-pointer shrink-0"
            onClick={() => document.getElementById(`avatar-step2-${userId}`)?.click()}
          >
            <AgentAvatar name={agentName} url={avatarUrl} color={color} size={64} />
            <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading
                ? <Loader2 size={14} className="animate-spin text-white" />
                : <Upload size={14} className="text-white" />}
            </div>
            <input
              id={`avatar-step2-${userId}`}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
            />
          </div>
          <div className="flex-1 space-y-2.5">
            <div>
              <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">
                Nome de exibição *
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex: Júlia - Vendas"
                className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-white/20 outline-none transition-colors"
              />
            </div>
            <div className="flex gap-2">
              {AGENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                    color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ background: c, boxShadow: color === c ? `0 0 10px ${c}66` : 'none' }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">
              Nome da persona
            </label>
            <input
              value={personaName}
              onChange={(e) => setPersonaName(e.target.value)}
              placeholder="Como ele se apresenta"
              className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-white/20 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">
              Empresa
            </label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nome da empresa"
              className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-white/20 outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div>
        <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles size={9} /> Preview
        </div>
        <ChatPreview
          agentName={agentName}
          avatarUrl={avatarUrl}
          color={color}
          templateTitle={template.title}
        />
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

type Props = {
  userId: string;
  onClose: () => void;
  onCreated: (inst: Instance) => void;
};

export function CreateAgentModal({ userId, onClose, onCreated }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Template selection (step 1)
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Customization (step 2)
  const [displayName, setDisplayName] = useState('');
  const [personaName, setPersonaName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [color, setColor] = useState(AGENT_COLORS[0]);

  // Inherited from template (not shown in UI)
  const [tone, setTone] = useState('friendly');
  const [language, setLanguage] = useState('pt-BR');
  const [emojiUsage, setEmojiUsage] = useState('moderate');

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;
  const selectedIndex = templates.findIndex((t) => t.id === selectedTemplateId);

  const canNext1 = !!selectedTemplate;
  const canFinish = displayName.trim().length >= 2;

  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      setLoadingTemplates(true);
      const { data } = await supabase
        .from('agent_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      const list = (data as AgentTemplate[]) || [];
      setTemplates(list);
      if (list.length > 0) setSelectedTemplateId(list[0].id);
      setLoadingTemplates(false);
    })();
  }, []);

  // Inherit template defaults silently
  useEffect(() => {
    if (!selectedTemplate) return;
    const ds = selectedTemplate.default_settings;
    if (ds.tone) setTone(ds.tone);
    if (ds.language) setLanguage(ds.language);
    if (ds.emoji_usage) setEmojiUsage(ds.emoji_usage);
  }, [selectedTemplateId]);

  const builtPrompt = buildSystemPrompt({
    persona_name: personaName || displayName,
    company_name: companyName,
    tone,
    language,
    emoji_usage: emojiUsage,
    base: selectedTemplate?.base_prompt ?? '',
  });

  const handleUpload = async (file: File) => {
    setError('');
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('agent-avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('agent-avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no upload');
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      const instance_name = `aura_${Date.now().toString(36)}`;
      const { data, error: insErr } = await supabase
        .from('instances')
        .insert({
          user_id: userId,
          instance_name,
          display_name: displayName.trim(),
          persona_name: personaName.trim() || displayName.trim(),
          company_name: companyName.trim(),
          avatar_url: avatarUrl,
          color,
          tone,
          language,
          emoji_usage: emojiUsage,
          system_prompt: builtPrompt,
          response_delay: 3000,
          overflow_keyword: 'humano',
        })
        .select()
        .maybeSingle();

      if (insErr) throw insErr;
      if (data) onCreated(data as Instance);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar');
    } finally {
      setSaving(false);
    }
  };

  const STEP_LABELS = ['Especialista', 'Personalizar'];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#080808] border border-white/[0.08] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <div className="text-sm text-white font-semibold tracking-tight">Criar novo agente</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">Passo {step} de 2</div>
          </div>
          <button onClick={onClose} className="text-neutral-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
            <X size={15} />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 pt-3.5 pb-0">
          <div className="flex gap-1.5">
            {[1, 2].map((n) => (
              <div
                key={n}
                className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${
                  step > n ? 'bg-white' : step === n ? 'bg-white/70' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 mb-1">
            {STEP_LABELS.map((label, i) => (
              <span
                key={label}
                className={`text-[10px] uppercase tracking-wider transition-colors duration-300 ${
                  step === i + 1 ? 'text-white' : step > i + 1 ? 'text-neutral-500' : 'text-neutral-700'
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <StepTemplate
              templates={templates}
              loading={loadingTemplates}
              selectedId={selectedTemplateId}
              onSelect={(id) => setSelectedTemplateId(id)}
            />
          )}

          {step === 2 && selectedTemplate && (
            <StepCustomize
              template={selectedTemplate}
              index={selectedIndex}
              displayName={displayName}
              setDisplayName={setDisplayName}
              personaName={personaName}
              setPersonaName={setPersonaName}
              companyName={companyName}
              setCompanyName={setCompanyName}
              avatarUrl={avatarUrl}
              setAvatarUrl={setAvatarUrl}
              color={color}
              setColor={setColor}
              uploading={uploading}
              onUpload={handleUpload}
              userId={userId}
            />
          )}

          {error && (
            <div className="mt-4 text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-xl px-3 py-2.5">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06] gap-3">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            className="text-neutral-500 hover:text-white text-xs flex items-center gap-1.5 transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
          >
            <ArrowLeft size={12} /> {step > 1 ? 'Voltar' : 'Cancelar'}
          </button>

          {step < 2 ? (
            <button
              onClick={() => setStep(2)}
              disabled={!canNext1}
              className="bg-white text-black rounded-xl px-5 py-2 text-xs font-semibold flex items-center gap-1.5 hover:bg-neutral-200 transition-all duration-200 disabled:opacity-30 shadow-[0_0_20px_rgba(255,255,255,0.08)]"
            >
              Personalizar <ArrowRight size={12} />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={saving || !canFinish}
              className="bg-white text-black rounded-xl px-5 py-2 text-xs font-semibold flex items-center gap-1.5 hover:bg-neutral-200 transition-all duration-200 disabled:opacity-30 shadow-[0_0_20px_rgba(255,255,255,0.08)]"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Criar agente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
