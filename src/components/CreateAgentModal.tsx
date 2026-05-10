import { useState } from 'react';
import { X, Loader2, Upload, Check, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import {
  supabase,
  Instance,
  AGENT_COLORS,
  TONE_OPTIONS,
  EMOJI_OPTIONS,
  LANGUAGE_OPTIONS,
  AGENT_TEMPLATES,
  buildSystemPrompt,
} from '../lib/supabase';
import { AgentAvatar } from './AgentAvatar';

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

  const [displayName, setDisplayName] = useState('');
  const [personaName, setPersonaName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [color, setColor] = useState(AGENT_COLORS[0]);

  const [tone, setTone] = useState('friendly');
  const [language, setLanguage] = useState('pt-BR');
  const [emojiUsage, setEmojiUsage] = useState('moderate');

  const [templateKey, setTemplateKey] = useState('sales');

  const canNext1 = displayName.trim().length >= 2;
  const template = AGENT_TEMPLATES.find((t) => t.key === templateKey) || AGENT_TEMPLATES[0];

  const previewPrompt = buildSystemPrompt({
    persona_name: personaName || displayName,
    company_name: companyName,
    tone,
    language,
    emoji_usage: emojiUsage,
    base: template.base,
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
          <div>
            <div className="text-sm text-white font-medium">Criar novo agente</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">Passo {step} de 3</div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pt-3">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  step >= n ? 'bg-white' : 'bg-[#1a1a1a]'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base text-white font-medium mb-1">Identidade</h3>
                <p className="text-xs text-neutral-500">Dê um rosto e um nome ao seu agente.</p>
              </div>

              <div className="flex items-center gap-4">
                <AgentAvatar name={displayName || 'Agente'} url={avatarUrl} color={color} size={72} />
                <div className="flex-1 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer border border-[#1a1a1a] hover:border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-300 transition-colors w-fit">
                    {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {avatarUrl ? 'Trocar foto' : 'Enviar foto'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(f);
                      }}
                    />
                  </label>
                  {avatarUrl && (
                    <button
                      onClick={() => setAvatarUrl('')}
                      className="text-[11px] text-neutral-500 hover:text-red-400 transition-colors"
                    >
                      Remover foto
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Nome de exibição</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ex: Júlia - Vendas"
                  className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#2a2a2a] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">Nome da persona</label>
                  <input
                    value={personaName}
                    onChange={(e) => setPersonaName(e.target.value)}
                    placeholder="Como ele se apresenta"
                    className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#2a2a2a] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">Empresa</label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Empresa representada"
                    className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#2a2a2a] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-2">Cor de destaque</label>
                <div className="flex gap-2 flex-wrap">
                  {AGENT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        color === c ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base text-white font-medium mb-1">Personalidade</h3>
                <p className="text-xs text-neutral-500">Como seu agente deve soar nas conversas.</p>
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-2">Tom de voz</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTone(t.value)}
                      className={`px-3 py-2.5 rounded-lg text-xs border transition-colors ${
                        tone === t.value
                          ? 'bg-white text-black border-white'
                          : 'border-[#1a1a1a] text-neutral-400 hover:text-white hover:border-[#262626]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-2">Uso de emojis</label>
                <div className="grid grid-cols-3 gap-2">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e.value}
                      onClick={() => setEmojiUsage(e.value)}
                      className={`px-3 py-2.5 rounded-lg text-xs border transition-colors ${
                        emojiUsage === e.value
                          ? 'bg-white text-black border-white'
                          : 'border-[#1a1a1a] text-neutral-400 hover:text-white hover:border-[#262626]'
                      }`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-2">Idioma</label>
                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGE_OPTIONS.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => setLanguage(l.value)}
                      className={`px-3 py-2.5 rounded-lg text-xs border transition-colors ${
                        language === l.value
                          ? 'bg-white text-black border-white'
                          : 'border-[#1a1a1a] text-neutral-400 hover:text-white hover:border-[#262626]'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base text-white font-medium mb-1">Função</h3>
                <p className="text-xs text-neutral-500">Escolha um ponto de partida para o comportamento.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {AGENT_TEMPLATES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTemplateKey(t.key)}
                    className={`text-left px-3 py-3 rounded-lg border transition-colors ${
                      templateKey === t.key
                        ? 'border-white bg-[#111]'
                        : 'border-[#1a1a1a] hover:border-[#262626]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-white font-medium">{t.title}</div>
                      {templateKey === t.key && <Check size={12} className="text-white" />}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-1">{t.description}</div>
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-2 flex items-center gap-1.5">
                  <Sparkles size={11} /> Prévia do prompt gerado
                </label>
                <div className="bg-[#060606] border border-[#1a1a1a] rounded-lg p-3 text-[11px] text-neutral-400 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                  {previewPrompt}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1a1a1a] gap-2">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            className="text-neutral-400 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={12} /> {step > 1 ? 'Voltar' : 'Cancelar'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !canNext1}
              className="bg-white text-black rounded-lg px-4 py-2 text-xs font-medium flex items-center gap-1.5 hover:bg-neutral-200 transition-colors disabled:opacity-40"
            >
              Continuar <ArrowRight size={12} />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={saving}
              className="bg-white text-black rounded-lg px-4 py-2 text-xs font-medium flex items-center gap-1.5 hover:bg-neutral-200 transition-colors disabled:opacity-40"
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
