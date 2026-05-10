import { useState } from 'react';
import { Loader2, Upload, Sparkles, Check, Trash2 } from 'lucide-react';
import {
  supabase,
  Instance,
  AGENT_COLORS,
  TONE_OPTIONS,
  EMOJI_OPTIONS,
  LANGUAGE_OPTIONS,
  buildSystemPrompt,
} from '../../lib/supabase';
import { AgentAvatar } from '../../components/AgentAvatar';

type Props = {
  instance: Instance;
  onUpdate: () => void;
};

export function ProfilePage({ instance, onUpdate }: Props) {
  const [displayName, setDisplayName] = useState(instance.display_name || instance.instance_name);
  const [personaName, setPersonaName] = useState(instance.persona_name || '');
  const [companyName, setCompanyName] = useState(instance.company_name || '');
  const [avatarUrl, setAvatarUrl] = useState(instance.avatar_url || '');
  const [color, setColor] = useState(instance.color || AGENT_COLORS[0]);
  const [tone, setTone] = useState(instance.tone || 'friendly');
  const [language, setLanguage] = useState(instance.language || 'pt-BR');
  const [emojiUsage, setEmojiUsage] = useState(instance.emoji_usage || 'moderate');
  const [signature, setSignature] = useState(instance.signature || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (file: File) => {
    setError('');
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${instance.user_id}/${instance.id}-${Date.now()}.${ext}`;
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

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await supabase
        .from('instances')
        .update({
          display_name: displayName.trim(),
          persona_name: personaName.trim(),
          company_name: companyName.trim(),
          avatar_url: avatarUrl,
          color,
          tone,
          language,
          emoji_usage: emojiUsage,
          signature: signature.trim(),
        })
        .eq('id', instance.id);
      setSaved(true);
      onUpdate();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const regeneratePrompt = async () => {
    const base = instance.system_prompt?.includes('Seu papel')
      ? instance.system_prompt.split('\n\n').find((p) => p.startsWith('Seu papel')) || ''
      : '';
    const prompt = buildSystemPrompt({
      persona_name: personaName || displayName,
      company_name: companyName,
      tone,
      language,
      emoji_usage: emojiUsage,
      base,
      signature,
    });
    await supabase.from('instances').update({ system_prompt: prompt }).eq('id', instance.id);
    setSaved(true);
    onUpdate();
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl text-white font-semibold tracking-tight">Perfil do Agente</h1>
        <p className="text-sm text-neutral-500 mt-1">A identidade e a personalidade que moldam cada conversa.</p>
      </div>

      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6">
        <div className="flex items-center gap-5">
          <AgentAvatar name={displayName} url={avatarUrl} color={color} size={96} />
          <div className="flex-1 space-y-2">
            <div className="text-lg text-white font-medium">{displayName || 'Sem nome'}</div>
            {personaName && personaName !== displayName && (
              <div className="text-xs text-neutral-500">Apresenta-se como {personaName}</div>
            )}
            <div className="flex gap-2">
              <label className="flex items-center gap-2 cursor-pointer border border-[#1a1a1a] hover:border-[#262626] rounded-lg px-3 py-1.5 text-[11px] text-neutral-300 transition-colors w-fit">
                {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
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
                  className="border border-[#1a1a1a] hover:border-red-900/60 hover:text-red-400 rounded-lg px-3 py-1.5 text-[11px] text-neutral-500 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={11} /> Remover
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 space-y-5">
        <div className="text-sm text-white font-medium">Identidade</div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">Nome de exibição</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#2a2a2a] outline-none"
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

      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 space-y-5">
        <div className="text-sm text-white font-medium">Personalidade</div>
        <div>
          <label className="block text-xs text-neutral-400 mb-2">Tom de voz</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">Assinatura (opcional)</label>
          <input
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder='Ex: "— Júlia, equipe Aura"'
            className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#2a2a2a] outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="bg-white text-black rounded-lg px-4 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
          {saved ? 'Salvo' : 'Salvar alterações'}
        </button>
        <button
          onClick={regeneratePrompt}
          className="border border-[#1a1a1a] hover:border-[#262626] text-neutral-300 hover:text-white rounded-lg px-4 py-2.5 text-sm flex items-center gap-2 transition-colors"
          title="Regenerar o prompt do sistema a partir destes campos"
        >
          <Sparkles size={13} /> Regenerar prompt
        </button>
      </div>
    </div>
  );
}
