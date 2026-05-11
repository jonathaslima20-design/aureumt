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
  TONE_OPTIONS,
  EMOJI_OPTIONS,
  LANGUAGE_OPTIONS,
  buildSystemPrompt,
  mergeTemplatePrompt,
} from '../lib/supabase';
import { AgentAvatar } from './AgentAvatar';

// ─── Specialty badge palette (cycles by sort_order) ──────────────────────────

const BADGE_PALETTES = [
  { bg: 'bg-emerald-950/60', border: 'border-emerald-700/50', text: 'text-emerald-300', glow: '0 0 24px 2px rgba(16,185,129,0.18)' },
  { bg: 'bg-amber-950/60',   border: 'border-amber-700/50',   text: 'text-amber-300',   glow: '0 0 24px 2px rgba(245,158,11,0.18)' },
  { bg: 'bg-sky-950/60',     border: 'border-sky-700/50',     text: 'text-sky-300',     glow: '0 0 24px 2px rgba(14,165,233,0.22)' },
  { bg: 'bg-rose-950/60',    border: 'border-rose-700/50',    text: 'text-rose-300',    glow: '0 0 24px 2px rgba(244,63,94,0.16)' },
  { bg: 'bg-violet-950/60',  border: 'border-violet-700/50',  text: 'text-violet-300',  glow: '0 0 24px 2px rgba(139,92,246,0.18)' },
  { bg: 'bg-teal-950/60',    border: 'border-teal-700/50',    text: 'text-teal-300',    glow: '0 0 24px 2px rgba(20,184,166,0.18)' },
];

// ─── Template Avatar ──────────────────────────────────────────────────────────

function TemplateAvatarRing({
  icon,
  index,
  size = 56,
}: {
  icon: string;
  index: number;
  size?: number;
}) {
  const palette = BADGE_PALETTES[index % BADGE_PALETTES.length];
  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 border-2 ${palette.border} bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a]`}
      style={{ width: size, height: size, fontSize: Math.floor(size * 0.46) }}
    >
      {icon || <Bot size={Math.floor(size * 0.46)} className="text-neutral-500" />}
    </div>
  );
}

// ─── Template gallery card ────────────────────────────────────────────────────

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
          ? `border-white/30 bg-white/[0.05]`
          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]'}
      `}
      style={{
        backdropFilter: 'blur(12px)',
        boxShadow: hovered || selected ? palette.glow : 'none',
      }}
    >
      {/* Selected indicator strip */}
      {selected && (
        <div
          className={`absolute inset-x-0 top-0 h-0.5 ${palette.bg} opacity-80`}
          style={{ background: 'linear-gradient(90deg, transparent, currentColor, transparent)' }}
        />
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          <TemplateAvatarRing icon={template.icon} index={index} size={52} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[13px] font-semibold text-white leading-tight truncate">
                {template.title}
              </span>
              {selected && <Check size={11} className="text-white flex-shrink-0" />}
            </div>

            {/* Specialty badge */}
            <span
              className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full border ${palette.bg} ${palette.border} ${palette.text} mb-2`}
            >
              <Sparkles size={7} />
              {template.description.split(' ').slice(0, 4).join(' ')}
            </span>

            <p className="text-[11px] text-neutral-400 leading-relaxed line-clamp-2">
              {template.description}
            </p>
          </div>

          <ChevronRight
            size={14}
            className={`flex-shrink-0 mt-1 transition-all duration-300 ${
              selected ? 'text-white rotate-90' : 'text-neutral-600'
            }`}
          />
        </div>

        {template.custom_fields.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center gap-1.5">
            <span className="text-[10px] text-neutral-600 uppercase tracking-wider">
              {template.custom_fields.length} {template.custom_fields.length === 1 ? 'campo' : 'campos'} personalizáveis
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Real-time chat preview ───────────────────────────────────────────────────

function ChatPreview({
  personaName,
  displayName,
  avatarUrl,
  color,
  templateTitle,
}: {
  personaName: string;
  displayName: string;
  avatarUrl: string;
  color: string;
  templateTitle: string;
}) {
  const name = personaName || displayName || 'Assistente';
  const greeting = `Olá! Eu sou ${name}${templateTitle && templateTitle !== 'Em branco' ? `, especialista em ${templateTitle.toLowerCase()}` : ''}. Como posso te ajudar hoje?`;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#080808] overflow-hidden">
      {/* Fake WA header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-white/[0.05] bg-[#0d0d0d]">
        <AgentAvatar name={name} url={avatarUrl} color={color} size={28} />
        <div>
          <div className="text-[11px] font-semibold text-white leading-tight">{name}</div>
          <div className="text-[9px] text-emerald-400 leading-tight">online</div>
        </div>
      </div>

      {/* Chat body */}
      <div className="px-3 py-4 space-y-2 min-h-[80px]">
        <div className="flex items-end gap-2">
          <AgentAvatar name={name} url={avatarUrl} color={color} size={22} />
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

// ─── Configuration panel (shown after template selection) ─────────────────────

function ConfigPanel({
  template,
  index,
  displayName,
  setDisplayName,
  personaName,
  setPersonaName,
  avatarUrl,
  setAvatarUrl,
  color,
  customFieldValues,
  setCustomFieldValues,
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
  avatarUrl: string;
  setAvatarUrl: (v: string) => void;
  color: string;
  customFieldValues: Record<string, string>;
  setCustomFieldValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  uploading: boolean;
  onUpload: (f: File) => void;
  userId: string;
}) {
  const palette = BADGE_PALETTES[index % BADGE_PALETTES.length];
  const agentName = personaName || displayName || template.title;

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all duration-300"
      style={{ borderColor: 'rgba(255,255,255,0.10)' }}
    >
      {/* Panel header */}
      <div
        className="px-4 py-3 border-b border-white/[0.06]"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        <div className="flex items-center gap-2">
          <TemplateAvatarRing icon={template.icon} index={index} size={32} />
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-widest ${palette.text}`}>
              Ótima escolha!
            </p>
            <p className="text-[12px] text-white font-medium">
              Vamos adaptar o <span className="font-semibold">{template.title}</span> para a sua empresa.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Avatar + name row */}
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer" onClick={() => document.getElementById(`avatar-upload-${userId}`)?.click()}>
            <AgentAvatar name={agentName} url={avatarUrl} color={color} size={60} />
            <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading
                ? <Loader2 size={14} className="animate-spin text-white" />
                : <Upload size={14} className="text-white" />}
            </div>
            <input
              id={`avatar-upload-${userId}`}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
            />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
                Nome de exibição
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex: Júlia - Vendas"
                className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-[#2a2a2a] outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
                Nome da persona (como o agente se apresenta)
              </label>
              <input
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                placeholder="Ex: Marina"
                className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-[#2a2a2a] outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Custom fields */}
        {template.custom_fields.length > 0 && (
          <div className="space-y-3 pt-1">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
              Variáveis do template
            </div>
            {template.custom_fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs text-neutral-300 mb-1.5 font-medium">
                  {f.label}
                  {f.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                {f.type === 'textarea' ? (
                  <textarea
                    value={customFieldValues[f.key] ?? ''}
                    onChange={(e) => setCustomFieldValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    rows={3}
                    className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#2a2a2a] outline-none resize-none transition-colors"
                  />
                ) : (
                  <input
                    type={f.type === 'url' ? 'url' : 'text'}
                    value={customFieldValues[f.key] ?? ''}
                    onChange={(e) => setCustomFieldValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#2a2a2a] outline-none transition-colors"
                  />
                )}
              </div>
            ))}
          </div>
        )}
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

  // Step 1 — Identity
  const [displayName, setDisplayName] = useState('');
  const [personaName, setPersonaName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [color, setColor] = useState(AGENT_COLORS[0]);

  // Step 2 — Personality
  const [tone, setTone] = useState('friendly');
  const [language, setLanguage] = useState('pt-BR');
  const [emojiUsage, setEmojiUsage] = useState('moderate');

  // Step 3 — Template
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;
  const selectedIndex = templates.findIndex((t) => t.id === selectedTemplateId);

  const canNext1 = displayName.trim().length >= 2;
  const customFieldsValid = selectedTemplate
    ? selectedTemplate.custom_fields.every(
        (f) => !f.required || (customFieldValues[f.key] ?? '').trim().length > 0
      )
    : true;
  const canFinish = !!selectedTemplate && customFieldsValid;

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

  // Apply template defaults when selection changes
  useEffect(() => {
    if (!selectedTemplate) return;
    const ds = selectedTemplate.default_settings;
    if (ds.tone) setTone(ds.tone);
    if (ds.language) setLanguage(ds.language);
    if (ds.emoji_usage) setEmojiUsage(ds.emoji_usage);
    setCustomFieldValues({});
    // Scroll config panel into view
    setTimeout(() => {
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, [selectedTemplateId]);

  const mergedBase = selectedTemplate
    ? mergeTemplatePrompt(selectedTemplate.base_prompt, customFieldValues)
    : '';

  const previewPrompt = buildSystemPrompt({
    persona_name: personaName || displayName,
    company_name: companyName,
    tone,
    language,
    emoji_usage: emojiUsage,
    base: mergedBase,
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
          system_prompt: previewPrompt,
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

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#080808] border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <div className="text-sm text-white font-semibold tracking-tight">Criar novo agente</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">Passo {step} de 3</div>
          </div>
          <button onClick={onClose} className="text-neutral-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
            <X size={15} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-3.5 pb-0">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${
                  step > n ? 'bg-white' : step === n ? 'bg-white/70' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 mb-1">
            {['Identidade', 'Personalidade', 'Função'].map((label, i) => (
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

          {/* ── Step 1: Identity ── */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-[15px] text-white font-semibold mb-1">Identidade</h3>
                <p className="text-xs text-neutral-500">Dê um rosto e um nome ao seu agente.</p>
              </div>

              <div className="flex items-center gap-5">
                <div className="relative group cursor-pointer" onClick={() => document.getElementById('main-avatar-upload')?.click()}>
                  <AgentAvatar name={displayName || 'Agente'} url={avatarUrl} color={color} size={72} />
                  <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploading
                      ? <Loader2 size={16} className="animate-spin text-white" />
                      : <Upload size={16} className="text-white" />}
                  </div>
                  <input
                    id="main-avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-neutral-400 mb-1">Clique no avatar para enviar uma foto</p>
                  {avatarUrl && (
                    <button onClick={() => setAvatarUrl('')} className="text-[11px] text-neutral-600 hover:text-red-400 transition-colors">
                      Remover foto
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">Nome de exibição *</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ex: Júlia - Vendas"
                  className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-white/20 outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">Nome da persona</label>
                  <input
                    value={personaName}
                    onChange={(e) => setPersonaName(e.target.value)}
                    placeholder="Como ele se apresenta"
                    className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-white/20 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">Empresa</label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Empresa representada"
                    className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-white/20 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-2">Cor de destaque</label>
                <div className="flex gap-2 flex-wrap">
                  {AGENT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                        color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ background: c, boxShadow: color === c ? `0 0 12px ${c}66` : 'none' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Personality ── */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-[15px] text-white font-semibold mb-1">Personalidade</h3>
                <p className="text-xs text-neutral-500">Como seu agente deve soar nas conversas.</p>
              </div>

              <div>
                <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-2">Tom de voz</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTone(t.value)}
                      className={`px-3 py-2.5 rounded-xl text-xs border transition-all duration-200 ${
                        tone === t.value
                          ? 'bg-white text-black border-white shadow-[0_0_16px_rgba(255,255,255,0.12)]'
                          : 'border-white/[0.07] text-neutral-400 hover:text-white hover:border-white/[0.15] bg-white/[0.02]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-2">Uso de emojis</label>
                <div className="grid grid-cols-3 gap-2">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e.value}
                      onClick={() => setEmojiUsage(e.value)}
                      className={`px-3 py-2.5 rounded-xl text-xs border transition-all duration-200 ${
                        emojiUsage === e.value
                          ? 'bg-white text-black border-white shadow-[0_0_16px_rgba(255,255,255,0.12)]'
                          : 'border-white/[0.07] text-neutral-400 hover:text-white hover:border-white/[0.15] bg-white/[0.02]'
                      }`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-2">Idioma</label>
                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGE_OPTIONS.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => setLanguage(l.value)}
                      className={`px-3 py-2.5 rounded-xl text-xs border transition-all duration-200 ${
                        language === l.value
                          ? 'bg-white text-black border-white shadow-[0_0_16px_rgba(255,255,255,0.12)]'
                          : 'border-white/[0.07] text-neutral-400 hover:text-white hover:border-white/[0.15] bg-white/[0.02]'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Template + Config + Preview ── */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-[15px] text-white font-semibold mb-1">Função</h3>
                <p className="text-xs text-neutral-500">Escolha um especialista e adapte-o para a sua empresa.</p>
              </div>

              {loadingTemplates ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={18} className="text-neutral-600 animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <div className="border border-dashed border-white/[0.07] rounded-2xl py-12 text-center">
                  <p className="text-xs text-neutral-600">Nenhum template disponível no momento.</p>
                </div>
              ) : (
                <>
                  {/* Template gallery */}
                  <div className="grid grid-cols-1 gap-2">
                    {templates.map((t, i) => (
                      <TemplateCard
                        key={t.id}
                        template={t}
                        index={i}
                        selected={selectedTemplateId === t.id}
                        onSelect={() => setSelectedTemplateId(t.id)}
                      />
                    ))}
                  </div>

                  {/* Configuration panel — appears once a template is selected */}
                  {selectedTemplate && (
                    <div className="transition-all duration-300">
                      <ConfigPanel
                        template={selectedTemplate}
                        index={selectedIndex}
                        displayName={displayName}
                        setDisplayName={setDisplayName}
                        personaName={personaName}
                        setPersonaName={setPersonaName}
                        avatarUrl={avatarUrl}
                        setAvatarUrl={setAvatarUrl}
                        color={color}
                        customFieldValues={customFieldValues}
                        setCustomFieldValues={setCustomFieldValues}
                        uploading={uploading}
                        onUpload={handleUpload}
                        userId={userId}
                      />

                      {/* Real-time chat preview */}
                      <div className="mt-4">
                        <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Sparkles size={9} />
                          Preview em tempo real
                        </div>
                        <ChatPreview
                          personaName={personaName}
                          displayName={displayName}
                          avatarUrl={avatarUrl}
                          color={color}
                          templateTitle={selectedTemplate.title}
                        />
                      </div>

                      {/* System prompt preview (collapsed) */}
                      <details className="mt-3 group">
                        <summary className="text-[10px] text-neutral-600 cursor-pointer hover:text-neutral-400 transition-colors list-none flex items-center gap-1.5">
                          <ChevronRight size={10} className="transition-transform group-open:rotate-90" />
                          Ver prompt completo gerado
                        </summary>
                        <div className="mt-2 bg-[#060606] border border-white/[0.05] rounded-lg p-3 text-[11px] text-neutral-500 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto font-mono">
                          {previewPrompt || <span className="italic text-neutral-700">Prompt vazio.</span>}
                        </div>
                      </details>
                    </div>
                  )}
                </>
              )}
            </div>
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

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !canNext1}
              className="bg-white text-black rounded-xl px-5 py-2 text-xs font-semibold flex items-center gap-1.5 hover:bg-neutral-200 transition-all duration-200 disabled:opacity-30 shadow-[0_0_20px_rgba(255,255,255,0.08)]"
            >
              Continuar <ArrowRight size={12} />
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
