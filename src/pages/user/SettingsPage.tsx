import { useEffect, useState } from 'react';
import { Save, Check, Loader2, Pause, Play, Sparkles } from 'lucide-react';
import { supabase, Instance } from '../../lib/supabase';

const TEMPLATES = [
  {
    name: 'Atendimento',
    prompt:
      'Você é um atendente simpático e resolutivo. Cumprimente o cliente, entenda a dúvida em poucas palavras e responda de forma clara. Se precisar de mais detalhes, peça com educação.',
  },
  {
    name: 'Vendas',
    prompt:
      'Você é um consultor de vendas profissional. Qualifique o cliente com perguntas sobre necessidade, orçamento e prazo antes de apresentar soluções. Seja humano, direto e foque em valor.',
  },
  {
    name: 'SDR (Qualificação)',
    prompt:
      'Você é um SDR que qualifica leads. Identifique o segmento, o tamanho do negócio e o problema atual do lead. Se o lead for qualificado, ofereça agendar uma reunião com um especialista.',
  },
  {
    name: 'FAQ',
    prompt:
      'Você responde perguntas frequentes da empresa. Use respostas curtas e objetivas. Se não souber a resposta, peça para o cliente aguardar que um humano irá responder.',
  },
];

export function SettingsPage({
  instance,
  onUpdate,
}: {
  instance: Instance;
  onUpdate: () => void;
}) {
  const [prompt, setPrompt] = useState(instance.system_prompt);
  const [delay, setDelay] = useState(instance.response_delay);
  const [keyword, setKeyword] = useState(instance.overflow_keyword);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrompt(instance.system_prompt);
    setDelay(instance.response_delay);
    setKeyword(instance.overflow_keyword);
  }, [instance.id]);

  const save = async () => {
    setSaving(true);
    await supabase
      .from('instances')
      .update({
        system_prompt: prompt,
        response_delay: delay,
        overflow_keyword: keyword,
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Ajustes do Agente</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Comportamento e tom de voz do agente{' '}
            <span className="text-neutral-300">{instance.instance_name}</span>
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
        <div className="lg:col-span-2 space-y-5 border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] p-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase tracking-wider text-neutral-500">
                Prompt do Sistema
              </label>
              <span className="text-[10px] text-neutral-600 font-mono">{prompt.length} caracteres</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={12}
              placeholder="Descreva como o agente deve se comportar..."
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors resize-none font-mono leading-relaxed"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase tracking-wider text-neutral-500">
                Tempo de Resposta
              </label>
              <span className="text-xs text-white font-mono">{(delay / 1000).toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min={2000}
              max={15000}
              step={500}
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              className="w-full accent-white"
            />
            <div className="flex justify-between text-[10px] text-neutral-600 mt-1">
              <span>2s</span>
              <span>15s</span>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-neutral-500 mb-2 block">
              Palavra-chave de Transbordo
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="ex: humano, atendente, ajuda"
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
            />
            <p className="text-[11px] text-neutral-600 mt-1.5 leading-relaxed">
              Quando o cliente mencionar esta palavra, o fluxo do agente é pausado automaticamente.
            </p>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-white text-black rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : saved ? (
              <>
                <Check size={14} /> Salvo
              </>
            ) : (
              <>
                <Save size={14} /> Salvar alterações
              </>
            )}
          </button>
        </div>

        <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] p-6 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-neutral-400" />
            <div className="text-xs uppercase tracking-wider text-neutral-500">Templates prontos</div>
          </div>
          <div className="space-y-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.name}
                onClick={() => setPrompt(t.prompt)}
                className="w-full text-left border border-[#151515] rounded-lg px-3 py-3 hover:bg-[#0d0d0d] hover:border-[#262626] transition-colors"
              >
                <div className="text-sm text-white font-medium mb-1">{t.name}</div>
                <div className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                  {t.prompt}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
