import { useEffect, useState } from 'react';
import {
  ArrowLeft, Loader2, Upload, Sparkles, Check, Trash2,
  Save, Pause, Play, Database, Link2, X, Plus, Wifi, WifiOff, ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import {
  supabase, Instance, KnowledgeBase, WhatsappConnection,
  AGENT_COLORS, TONE_OPTIONS, EMOJI_OPTIONS, LANGUAGE_OPTIONS,
  buildSystemPrompt,
} from '../../lib/supabase';
import { AgentAvatar } from '../../components/AgentAvatar';

type Tab = 'profile' | 'knowledge' | 'connections' | 'advanced';

type Props = {
  instance: Instance;
  onBack: () => void;
  onUpdate: () => void;
  onDelete: (inst: Instance) => void;
};

export function AgentDetailPage({ instance, onBack, onUpdate, onDelete }: Props) {
  const [tab, setTab] = useState<Tab>('profile');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: 'Perfil' },
    { key: 'knowledge', label: 'Conhecimento' },
    { key: 'connections', label: 'WhatsApp' },
    { key: 'advanced', label: 'Avançado' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-neutral-500 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={14} /> Agentes
        </button>
        <div className="flex items-center gap-3">
          <AgentAvatar
            name={instance.display_name || instance.instance_name}
            url={instance.avatar_url}
            color={instance.color}
            size={32}
          />
          <span className="text-white font-medium text-sm">
            {instance.display_name || instance.instance_name}
          </span>
        </div>
        <button
          onClick={() => onDelete(instance)}
          className="ml-auto text-neutral-500 hover:text-red-400 border border-[#242424] hover:border-red-900/60 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
        >
          <Trash2 size={12} /> Excluir agente
        </button>
      </div>

      <div className="flex gap-1 bg-[#141414] border border-[#242424] rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-[#1e1e1e] text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileTab instance={instance} onUpdate={onUpdate} />}
      {tab === 'knowledge' && <KnowledgeTab instance={instance} onUpdate={onUpdate} />}
      {tab === 'connections' && <ConnectionsTab instance={instance} onNavConnections={onUpdate} />}
      {tab === 'advanced' && <AdvancedTab instance={instance} onUpdate={onUpdate} />}
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ instance, onUpdate }: { instance: Instance; onUpdate: () => void }) {
  const [displayName, setDisplayName] = useState(instance.display_name || instance.instance_name);
  const [personaName, setPersonaName] = useState(instance.persona_name || '');
  const [companyName, setCompanyName] = useState(instance.company_name || '');
  const [avatarUrl, setAvatarUrl] = useState(instance.avatar_url || '');
  const [color, setColor] = useState(instance.color || AGENT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDisplayName(instance.display_name || instance.instance_name);
    setPersonaName(instance.persona_name || '');
    setCompanyName(instance.company_name || '');
    setAvatarUrl(instance.avatar_url || '');
    setColor(instance.color || AGENT_COLORS[0]);
  }, [instance.id]);

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

  return (
    <div className="max-w-2xl space-y-5">
      {/* Avatar card */}
      <div className="bg-[#141414] border border-[#242424] rounded-2xl p-6">
        <div className="flex items-center gap-5">
          <AgentAvatar name={displayName} url={avatarUrl} color={color} size={88} />
          <div className="flex-1 space-y-2">
            <div className="text-lg text-white font-medium">{displayName || 'Sem nome'}</div>
            {personaName && personaName !== displayName && (
              <div className="text-xs text-neutral-500">Apresenta-se como {personaName}</div>
            )}
            <div className="flex gap-2 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer border border-[#242424] hover:border-[#2e2e2e] rounded-lg px-3 py-1.5 text-[11px] text-neutral-300 transition-colors w-fit">
                {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                {avatarUrl ? 'Trocar foto' : 'Enviar foto'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
              </label>
              {avatarUrl && (
                <button
                  onClick={() => setAvatarUrl('')}
                  className="border border-[#242424] hover:border-red-900/60 hover:text-red-400 rounded-lg px-3 py-1.5 text-[11px] text-neutral-500 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={11} /> Remover
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Identity */}
      <div className="bg-[#141414] border border-[#242424] rounded-2xl p-6 space-y-4">
        <div className="text-sm text-white font-medium">Identidade</div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">Nome de exibição</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#363636] outline-none transition-colors"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">Nome da persona</label>
            <input
              value={personaName}
              onChange={(e) => setPersonaName(e.target.value)}
              placeholder="Como ele se apresenta"
              className="w-full bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#363636] outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">Empresa</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Empresa representada"
              className="w-full bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#363636] outline-none transition-colors"
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
                  color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ background: c, boxShadow: color === c ? `0 0 12px ${c}66` : 'none' }}
              />
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="bg-white text-black rounded-lg px-4 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : <Save size={13} />}
        {saved ? 'Salvo' : 'Salvar alterações'}
      </button>
    </div>
  );
}

// ─── Advanced Tab ─────────────────────────────────────────────────────────────

function AdvancedTab({ instance, onUpdate }: { instance: Instance; onUpdate: () => void }) {
  const [prompt, setPrompt] = useState(instance.system_prompt);
  const [delay, setDelay] = useState(instance.response_delay);
  const [keyword, setKeyword] = useState(instance.overflow_keyword);
  const [tone, setTone] = useState(instance.tone || 'friendly');
  const [language, setLanguage] = useState(instance.language || 'pt-BR');
  const [emojiUsage, setEmojiUsage] = useState(instance.emoji_usage || 'moderate');
  const [signature, setSignature] = useState(instance.signature || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setPrompt(instance.system_prompt);
    setDelay(instance.response_delay);
    setKeyword(instance.overflow_keyword);
    setTone(instance.tone || 'friendly');
    setLanguage(instance.language || 'pt-BR');
    setEmojiUsage(instance.emoji_usage || 'moderate');
    setSignature(instance.signature || '');
  }, [instance.id]);

  const save = async () => {
    setSaving(true);
    await supabase
      .from('instances')
      .update({
        system_prompt: prompt,
        response_delay: delay,
        overflow_keyword: keyword,
        tone,
        language,
        emoji_usage: emojiUsage,
        signature: signature.trim(),
      })
      .eq('id', instance.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onUpdate();
  };

  const toggleFlow = async () => {
    const next = instance.flow_status === 'active' ? 'paused' : 'active';
    await supabase.from('instances').update({ flow_status: next }).eq('id', instance.id);
    onUpdate();
  };

  const regeneratePrompt = async () => {
    const base = instance.system_prompt?.includes('Seu papel')
      ? instance.system_prompt.split('\n\n').find((p) => p.startsWith('Seu papel')) || ''
      : '';
    const rebuilt = buildSystemPrompt({
      persona_name: instance.persona_name || instance.display_name || '',
      company_name: instance.company_name || '',
      tone,
      language,
      emoji_usage: emojiUsage,
      base,
      signature,
    });
    setPrompt(rebuilt);
  };

  // Warning gate
  if (!confirmed) {
    return (
      <div className="max-w-lg">
        <div className="border border-amber-900/40 bg-amber-950/20 rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-950/60 border border-amber-800/50 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert size={16} className="text-amber-400" />
            </div>
            <div>
              <div className="text-sm text-white font-semibold mb-1">Configurações Avançadas</div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Esta área contém configurações técnicas que afetam diretamente o comportamento do agente,
                incluindo o prompt do sistema, tom de voz, idioma e parâmetros de resposta.
              </p>
              <p className="text-xs text-amber-400/80 mt-2 leading-relaxed">
                Recomendado apenas para usuários experientes. Alterações incorretas podem prejudicar o funcionamento do agente.
              </p>
            </div>
          </div>
          <button
            onClick={() => setConfirmed(true)}
            className="w-full border border-amber-800/50 hover:border-amber-700/70 text-amber-300 hover:text-amber-200 rounded-lg py-2.5 text-xs font-medium transition-colors"
          >
            Entendo, quero continuar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Flow toggle */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-white font-medium">Comportamento e fluxo</div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Agente <span className="text-neutral-300">{instance.display_name || instance.instance_name}</span>
          </p>
        </div>
        <button
          onClick={toggleFlow}
          className={`text-xs px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
            instance.flow_status === 'active'
              ? 'border-emerald-900/40 bg-emerald-950/30 text-emerald-400'
              : 'border-amber-900/40 bg-amber-950/30 text-amber-400'
          }`}
        >
          {instance.flow_status === 'active' ? <Play size={12} /> : <Pause size={12} />}
          {instance.flow_status === 'active' ? 'Fluxo ativo' : 'Fluxo pausado'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5 border border-[#242424] rounded-xl bg-[#141414] p-6">

          {/* System prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase tracking-wider text-neutral-500">Prompt do Sistema</label>
              <span className="text-[10px] text-neutral-600 font-mono">{prompt.length} chars</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={10}
              placeholder="Descreva como o agente deve se comportar..."
              className="w-full bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#363636] transition-colors resize-none font-mono leading-relaxed"
            />
            <button
              onClick={regeneratePrompt}
              className="mt-2 flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-white transition-colors"
            >
              <Sparkles size={10} /> Regenerar a partir das configurações abaixo
            </button>
          </div>

          {/* Personality */}
          <div className="space-y-4 pt-2 border-t border-[#1a1a1a]">
            <div className="text-xs uppercase tracking-wider text-neutral-500 pt-2">Personalidade</div>
            <div>
              <label className="block text-xs text-neutral-400 mb-2">Tom de voz</label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`px-3 py-2 rounded-lg text-xs border transition-colors ${
                      tone === t.value
                        ? 'bg-white text-black border-white'
                        : 'border-[#242424] text-neutral-400 hover:text-white hover:border-[#2e2e2e]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-2">Emojis</label>
                <div className="grid grid-cols-3 gap-2">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e.value}
                      onClick={() => setEmojiUsage(e.value)}
                      className={`px-3 py-2 rounded-lg text-xs border transition-colors ${
                        emojiUsage === e.value
                          ? 'bg-white text-black border-white'
                          : 'border-[#242424] text-neutral-400 hover:text-white hover:border-[#2e2e2e]'
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
                      className={`px-3 py-2 rounded-lg text-xs border transition-colors ${
                        language === l.value
                          ? 'bg-white text-black border-white'
                          : 'border-[#242424] text-neutral-400 hover:text-white hover:border-[#2e2e2e]'
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
                className="w-full bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#363636] outline-none transition-colors"
              />
            </div>
          </div>

          {/* Behavior */}
          <div className="space-y-4 pt-2 border-t border-[#1a1a1a]">
            <div className="text-xs uppercase tracking-wider text-neutral-500 pt-2">Comportamento</div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-neutral-400">Tempo de resposta</label>
                <span className="text-xs text-white font-mono">{(delay / 1000).toFixed(1)}s</span>
              </div>
              <input
                type="range" min={2000} max={15000} step={500} value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
                className="w-full accent-white"
              />
              <div className="flex justify-between text-[10px] text-neutral-600 mt-1">
                <span>2s</span><span>15s</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">Palavra-chave de transbordo</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="ex: humano, atendente"
                className="w-full bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#363636] transition-colors"
              />
              <p className="text-[11px] text-neutral-600 mt-1.5 leading-relaxed">
                Quando o cliente mencionar esta palavra, o fluxo é pausado automaticamente.
              </p>
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-white text-black rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <><Check size={14} /> Salvo</> : <><Save size={14} /> Salvar alterações</>}
          </button>
        </div>

        {/* Quick prompts sidebar */}
        <div className="border border-[#242424] rounded-xl bg-[#141414] p-5 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={13} className="text-neutral-400" />
            <div className="text-xs uppercase tracking-wider text-neutral-500">Prompts rápidos</div>
          </div>
          <div className="space-y-2">
            {QUICK_PROMPTS.map((t) => (
              <button
                key={t.name}
                onClick={() => setPrompt(t.prompt)}
                className="w-full text-left border border-[#1c1c1c] rounded-lg px-3 py-3 hover:bg-[#1a1a1a] hover:border-[#2e2e2e] transition-colors"
              >
                <div className="text-xs text-white font-medium mb-1">{t.name}</div>
                <div className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">{t.prompt}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const QUICK_PROMPTS = [
  {
    name: 'Atendimento',
    prompt: 'Você é um atendente simpático e resolutivo. Cumprimente o cliente, entenda a dúvida em poucas palavras e responda de forma clara. Se precisar de mais detalhes, peça com educação.',
  },
  {
    name: 'Vendas',
    prompt: 'Você é um consultor de vendas profissional. Qualifique o cliente com perguntas sobre necessidade, orçamento e prazo antes de apresentar soluções. Seja humano, direto e foque em valor.',
  },
  {
    name: 'SDR (Qualificação)',
    prompt: 'Você é um SDR que qualifica leads. Identifique o segmento, o tamanho do negócio e o problema atual do lead. Se o lead for qualificado, ofereça agendar uma reunião com um especialista.',
  },
  {
    name: 'FAQ',
    prompt: 'Você responde perguntas frequentes da empresa. Use respostas curtas e objetivas. Se não souber a resposta, peça para o cliente aguardar que um humano irá responder.',
  },
];

// ─── Knowledge Tab ────────────────────────────────────────────────────────────

function KnowledgeTab({ instance, onUpdate }: { instance: Instance; onUpdate: () => void }) {
  const [linkedBases, setLinkedBases] = useState<KnowledgeBase[]>([]);
  const [allBases, setAllBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: links }, { data: bases }] = await Promise.all([
      supabase
        .from('instance_knowledge_bases')
        .select('knowledge_base_id, knowledge_bases(*)')
        .eq('instance_id', instance.id),
      supabase
        .from('knowledge_bases')
        .select('*')
        .order('created_at', { ascending: false }),
    ]);
    const linked = (links || []).map((l: { knowledge_bases: KnowledgeBase }) => l.knowledge_bases).filter(Boolean);
    setLinkedBases(linked as KnowledgeBase[]);
    setAllBases(bases || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [instance.id]);

  const linkBase = async (baseId: string) => {
    setLinking(baseId);
    await supabase.from('instance_knowledge_bases').insert({ instance_id: instance.id, knowledge_base_id: baseId });
    await fetchData();
    setLinking(null);
    setShowPicker(false);
    onUpdate();
  };

  const unlinkBase = async (baseId: string) => {
    setUnlinking(baseId);
    await supabase.from('instance_knowledge_bases').delete().eq('instance_id', instance.id).eq('knowledge_base_id', baseId);
    await fetchData();
    setUnlinking(null);
    onUpdate();
  };

  const linkedIds = new Set(linkedBases.map((b) => b.id));
  const availableBases = allBases.filter((b) => !linkedIds.has(b.id));

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 size={18} className="animate-spin text-neutral-600" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">Bases de conhecimento que este agente pode consultar.</p>
        {availableBases.length > 0 && (
          <button
            onClick={() => setShowPicker(true)}
            className="bg-white text-black rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-neutral-200 transition-colors"
          >
            <Link2 size={12} /> Vincular base
          </button>
        )}
      </div>

      {linkedBases.length === 0 ? (
        <div className="border border-dashed border-[#242424] rounded-xl p-10 text-center bg-[#0d0d0d]">
          <Database size={24} className="mx-auto text-neutral-700 mb-3" strokeWidth={1.5} />
          <p className="text-sm text-neutral-500 mb-1">Nenhuma base vinculada</p>
          <p className="text-xs text-neutral-600 mb-4">Vincule uma base para que o agente possa consultá-la durante conversas.</p>
          {availableBases.length > 0 ? (
            <button
              onClick={() => setShowPicker(true)}
              className="bg-white text-black rounded-lg px-4 py-2 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-neutral-200 transition-colors"
            >
              <Link2 size={12} /> Vincular base
            </button>
          ) : allBases.length === 0 ? (
            <p className="text-xs text-neutral-600">Crie uma base em "Conhecimento" antes de vincular.</p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          {linkedBases.map((base) => (
            <div key={base.id} className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#141414] border border-[#242424]">
              <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#242424] flex items-center justify-center shrink-0">
                <Database size={14} className="text-neutral-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium truncate">{base.name}</div>
                {base.description && <div className="text-[11px] text-neutral-600 truncate mt-0.5">{base.description}</div>}
              </div>
              <button
                onClick={() => unlinkBase(base.id)}
                disabled={unlinking === base.id}
                className="text-neutral-600 hover:text-red-400 transition-colors shrink-0"
              >
                {unlinking === base.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {showPicker && availableBases.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#242424] rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#242424]">
              <span className="text-sm text-white font-medium">Vincular base de conhecimento</span>
              <button onClick={() => setShowPicker(false)} className="text-neutral-500 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
              {availableBases.map((base) => (
                <button
                  key={base.id}
                  onClick={() => linkBase(base.id)}
                  disabled={linking === base.id}
                  className="w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg border border-[#242424] hover:border-[#2e2e2e] hover:bg-[#1a1a1a] transition-colors"
                >
                  <div className="w-7 h-7 rounded-md bg-[#141414] border border-[#242424] flex items-center justify-center shrink-0">
                    {linking === base.id ? <Loader2 size={12} className="animate-spin text-neutral-400" /> : <Database size={12} className="text-neutral-400" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{base.name}</div>
                    {base.description && <div className="text-[11px] text-neutral-600 truncate">{base.description}</div>}
                  </div>
                  <Plus size={12} className="text-neutral-600 shrink-0 ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Connections Tab ──────────────────────────────────────────────────────────

function ConnectionsTab({ instance, onNavConnections }: { instance: Instance; onNavConnections: () => void }) {
  const [connections, setConnections] = useState<WhatsappConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  const fetchConnections = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('agent_id', instance.id)
      .order('created_at', { ascending: true });
    setConnections(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchConnections(); }, [instance.id]);

  const handleUnlink = async (connId: string) => {
    setUnlinking(connId);
    await supabase.from('whatsapp_connections').update({ agent_id: null }).eq('id', connId);
    setConnections((prev) => prev.filter((c) => c.id !== connId));
    onNavConnections();
    setUnlinking(null);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 size={18} className="animate-spin text-neutral-600" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-white font-medium">Conexões vinculadas</div>
          <div className="text-xs text-neutral-500 mt-0.5">Números de WhatsApp que usam este agente.</div>
        </div>
        <button
          onClick={onNavConnections}
          className="text-xs text-neutral-400 hover:text-white border border-[#242424] hover:border-[#2e2e2e] rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-colors shrink-0"
        >
          <ExternalLink size={11} /> Gerenciar conexões
        </button>
      </div>

      {connections.length === 0 ? (
        <div className="border border-dashed border-[#242424] rounded-xl py-10 text-center bg-[#0d0d0d]">
          <Wifi size={20} className="text-neutral-700 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-xs text-neutral-500 mb-1">Nenhuma conexão vinculada</p>
          <p className="text-[11px] text-neutral-700">Acesse Conexões WhatsApp para criar e vincular um número a este agente.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {connections.map((conn) => {
            const isConnected = conn.status === 'open';
            return (
              <div key={conn.id} className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#141414] border border-[#242424]">
                <div className="shrink-0">
                  {isConnected ? <Wifi size={16} className="text-emerald-400" /> : <WifiOff size={16} className="text-neutral-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">{conn.display_name}</div>
                  <div className={`text-[11px] mt-0.5 ${isConnected ? 'text-emerald-400' : 'text-neutral-600'}`}>
                    {isConnected ? 'Conectado' : 'Desconectado'}
                  </div>
                </div>
                <button
                  onClick={() => handleUnlink(conn.id)}
                  disabled={unlinking === conn.id}
                  className="text-neutral-600 hover:text-red-400 transition-colors shrink-0"
                >
                  {unlinking === conn.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
