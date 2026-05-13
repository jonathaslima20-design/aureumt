import { useEffect, useState } from 'react';
import { Loader2, Save, Plus, Trash2, BookOpen, User, Sparkles, MessageSquareQuote, Check } from 'lucide-react';
import { supabase, Instance, AgentPersona, HumanExample, AgentLearning } from '../../lib/supabase';

type Tab = 'persona' | 'examples' | 'learnings';

const REGION_OPTIONS = [
  { v: 'sudeste', l: 'Sudeste' },
  { v: 'sul', l: 'Sul' },
  { v: 'nordeste', l: 'Nordeste' },
  { v: 'norte', l: 'Norte' },
  { v: 'centro-oeste', l: 'Centro-Oeste' },
  { v: 'neutro', l: 'Neutro (sem regionalismo)' },
];

const FORMALITY_OPTIONS = [
  { v: 'adaptive', l: 'Adapta ao cliente (recomendado)' },
  { v: 'formal', l: 'Sempre formal' },
  { v: 'informal', l: 'Sempre informal' },
];

export function AgentTrainingPage({ instances }: { instances: Instance[] }) {
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(instances[0] || null);
  const [tab, setTab] = useState<Tab>('persona');

  if (!selectedInstance) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Treinamento</h1>
          <p className="text-sm text-neutral-500 mt-1">Crie um agente primeiro para treinar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Treinamento do Agente</h1>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed max-w-xl">
            Refine a personalidade e ensine respostas exemplares. Quanto mais voce treina, mais humano fica.
          </p>
        </div>

        {instances.length > 1 && (
          <select
            value={selectedInstance.id}
            onChange={(e) => setSelectedInstance(instances.find((i) => i.id === e.target.value) || null)}
            className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#2a2a2a] outline-none"
          >
            {instances.map((i) => (
              <option key={i.id} value={i.id}>{i.display_name || i.instance_name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1a1a1a]">
        {[
          { k: 'persona' as const, l: 'Persona', icon: User },
          { k: 'examples' as const, l: 'Exemplos', icon: MessageSquareQuote },
          { k: 'learnings' as const, l: 'Aprendizados', icon: Sparkles },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.k;
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`px-4 py-2.5 text-xs font-medium flex items-center gap-2 border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-white text-white'
                  : 'border-transparent text-neutral-500 hover:text-neutral-200'
              }`}
            >
              <Icon size={13} />
              {t.l}
            </button>
          );
        })}
      </div>

      {tab === 'persona' && <PersonaTab instance={selectedInstance} />}
      {tab === 'examples' && <ExamplesTab instance={selectedInstance} />}
      {tab === 'learnings' && <LearningsTab instance={selectedInstance} />}
    </div>
  );
}

// =============================================================================
// PERSONA TAB
// =============================================================================
function PersonaTab({ instance }: { instance: Instance }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [persona, setPersona] = useState<Partial<AgentPersona>>({
    age_range: '25-35',
    region: 'sudeste',
    background_story: '',
    hobbies: '',
    speech_quirks: '',
    favorite_phrases: '',
    formality_level: 'adaptive',
    use_typos: true,
    use_abbreviations: true,
    use_hesitations: true,
    use_regional_slang: false,
    anti_detection_mode: true,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('agent_personas').select('*').eq('instance_id', instance.id).maybeSingle();
      if (data) setPersona(data);
      setLoading(false);
    })();
  }, [instance.id]);

  const save = async () => {
    setSaving(true);
    const payload = { ...persona, instance_id: instance.id, updated_at: new Date().toISOString() };
    const { data: existing } = await supabase.from('agent_personas').select('id').eq('instance_id', instance.id).maybeSingle();
    if (existing) {
      await supabase.from('agent_personas').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('agent_personas').insert(payload);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="py-10 flex justify-center"><Loader2 size={16} className="animate-spin text-neutral-600" /></div>;

  return (
    <div className="space-y-5">
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-white">Identidade Profunda</h2>
          <p className="text-[11px] text-neutral-500 mt-0.5">Quanto mais detalhes, mais o agente parece um humano real.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Faixa Etaria" hint="Ex: 25-35">
            <input
              value={persona.age_range || ''}
              onChange={(e) => setPersona({ ...persona, age_range: e.target.value })}
              className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2a2a2a]"
              placeholder="25-35"
            />
          </Field>

          <Field label="Regiao do Brasil">
            <select
              value={persona.region || 'sudeste'}
              onChange={(e) => setPersona({ ...persona, region: e.target.value })}
              className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2a2a2a]"
            >
              {REGION_OPTIONS.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Historia de Fundo" hint="Profissao previa, formacao, experiencias - cria coerencia ao responder perguntas pessoais">
          <textarea
            value={persona.background_story || ''}
            onChange={(e) => setPersona({ ...persona, background_story: e.target.value })}
            rows={3}
            className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2a2a2a] resize-none"
            placeholder="Ex: Trabalha na empresa ha 3 anos como atendente. Antes era vendedora em uma loja de roupas. Mora em Sao Paulo."
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Hobbies e Interesses">
            <input
              value={persona.hobbies || ''}
              onChange={(e) => setPersona({ ...persona, hobbies: e.target.value })}
              className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2a2a2a]"
              placeholder="Series, viagens, culinaria..."
            />
          </Field>

          <Field label="Maneirismos de Fala" hint="Vicios de linguagem unicos">
            <input
              value={persona.speech_quirks || ''}
              onChange={(e) => setPersona({ ...persona, speech_quirks: e.target.value })}
              className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2a2a2a]"
              placeholder='Ex: usa "tipo assim" muito, fala "ne?" no final'
            />
          </Field>
        </div>

        <Field label="Frases Favoritas" hint="Expressoes que ela usa naturalmente">
          <input
            value={persona.favorite_phrases || ''}
            onChange={(e) => setPersona({ ...persona, favorite_phrases: e.target.value })}
            className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2a2a2a]"
            placeholder='Ex: "imagina!", "que delicia", "nossa que legal"'
          />
        </Field>

        <Field label="Nivel de Formalidade">
          <select
            value={persona.formality_level || 'adaptive'}
            onChange={(e) => setPersona({ ...persona, formality_level: e.target.value })}
            className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2a2a2a]"
          >
            {FORMALITY_OPTIONS.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
          </select>
        </Field>
      </div>

      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 space-y-3">
        <div>
          <h2 className="text-sm font-medium text-white">Humanizacao</h2>
          <p className="text-[11px] text-neutral-500 mt-0.5">Comportamentos que tornam o agente indistinguivel.</p>
        </div>
        <Toggle label="Pequenos erros de digitacao naturais" hint="Raros, com correcao por asterisco" checked={!!persona.use_typos} onChange={(v) => setPersona({ ...persona, use_typos: v })} />
        <Toggle label="Abreviacoes informais" hint="vc, tb, pq, n, q quando o cliente tambem usar" checked={!!persona.use_abbreviations} onChange={(v) => setPersona({ ...persona, use_abbreviations: v })} />
        <Toggle label="Hesitacoes naturais" hint='"humm", "deixa eu ver", "pera ai"' checked={!!persona.use_hesitations} onChange={(v) => setPersona({ ...persona, use_hesitations: v })} />
        <Toggle label="Girias regionais" hint="Pode usar expressoes da regiao configurada" checked={!!persona.use_regional_slang} onChange={(v) => setPersona({ ...persona, use_regional_slang: v })} />
        <Toggle label="Modo Anti-Deteccao IA" hint="Nunca admite ser IA, desvia perguntas-armadilha" checked={!!persona.anti_detection_mode} onChange={(v) => setPersona({ ...persona, anti_detection_mode: v })} />
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="bg-white text-black rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
          {saved ? 'Salvo' : 'Salvar Persona'}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// EXAMPLES TAB
// =============================================================================
function ExamplesTab({ instance }: { instance: Instance }) {
  const [examples, setExamples] = useState<HumanExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<{ trigger_keyword: string; example_question: string; ideal_response: string }>({ trigger_keyword: '', example_question: '', ideal_response: '' });

  const fetchExamples = async () => {
    setLoading(true);
    const { data } = await supabase.from('human_examples').select('*').eq('instance_id', instance.id).order('sort_order', { ascending: true });
    setExamples(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchExamples(); }, [instance.id]);

  const add = async () => {
    if (!draft.example_question.trim() || !draft.ideal_response.trim()) return;
    setSaving(true);
    await supabase.from('human_examples').insert({
      instance_id: instance.id,
      trigger_keyword: draft.trigger_keyword.trim(),
      example_question: draft.example_question.trim(),
      ideal_response: draft.ideal_response.trim(),
      sort_order: examples.length,
    });
    setDraft({ trigger_keyword: '', example_question: '', ideal_response: '' });
    setShowForm(false);
    setSaving(false);
    await fetchExamples();
  };

  const remove = async (id: string) => {
    await supabase.from('human_examples').delete().eq('id', id);
    setExamples((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4">
        <div className="flex items-start gap-3">
          <BookOpen size={18} className="text-neutral-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Crie pares de pergunta-resposta exemplares. O agente aprende a responder no mesmo estilo destes exemplos.
              Ideal para situacoes recorrentes: precos, condicoes, objecoes, tom de voz.
            </p>
          </div>
        </div>
      </div>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border border-dashed border-[#242424] rounded-xl py-4 text-sm text-neutral-500 hover:text-white hover:border-[#2e2e2e] transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={14} /> Adicionar exemplo
        </button>
      )}

      {showForm && (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 space-y-3">
          <Field label="Palavra-chave (opcional)" hint="Ajuda o agente a identificar quando usar este exemplo">
            <input
              value={draft.trigger_keyword}
              onChange={(e) => setDraft({ ...draft, trigger_keyword: e.target.value })}
              className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2a2a2a]"
              placeholder="Ex: preco, valor, quanto custa"
            />
          </Field>
          <Field label="Pergunta do cliente">
            <textarea
              value={draft.example_question}
              onChange={(e) => setDraft({ ...draft, example_question: e.target.value })}
              rows={2}
              className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2a2a2a] resize-none"
              placeholder='Ex: "quanto custa?"'
            />
          </Field>
          <Field label="Resposta ideal">
            <textarea
              value={draft.ideal_response}
              onChange={(e) => setDraft({ ...draft, ideal_response: e.target.value })}
              rows={3}
              className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2a2a2a] resize-none"
              placeholder="Ex: depende do que voce precisa | qual o seu objetivo? assim te passo um valor mais preciso"
            />
          </Field>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setDraft({ trigger_keyword: '', example_question: '', ideal_response: '' }); }} className="border border-[#1a1a1a] text-neutral-400 hover:text-white rounded-lg px-3 py-2 text-xs transition-colors">Cancelar</button>
            <button onClick={add} disabled={saving || !draft.example_question.trim() || !draft.ideal_response.trim()} className="bg-white text-black rounded-lg px-3 py-2 text-xs font-medium hover:bg-neutral-200 disabled:opacity-50 inline-flex items-center gap-1.5">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Adicionar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 size={16} className="animate-spin text-neutral-600" /></div>
      ) : examples.length === 0 ? (
        <div className="text-center py-8 text-xs text-neutral-600">Nenhum exemplo cadastrado ainda.</div>
      ) : (
        <div className="space-y-2">
          {examples.map((e) => (
            <div key={e.id} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  {e.trigger_keyword && (
                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-[#141414] border border-[#1a1a1a] text-neutral-500 uppercase tracking-wide">{e.trigger_keyword}</span>
                  )}
                  <div>
                    <div className="text-[10px] uppercase text-neutral-600 tracking-wider mb-1">Cliente</div>
                    <div className="text-xs text-neutral-300">{e.example_question}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-neutral-600 tracking-wider mb-1">Resposta</div>
                    <div className="text-xs text-white">{e.ideal_response}</div>
                  </div>
                </div>
                <button onClick={() => remove(e.id)} className="text-neutral-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// LEARNINGS TAB - Captured corrections
// =============================================================================
function LearningsTab({ instance }: { instance: Instance }) {
  const [learnings, setLearnings] = useState<AgentLearning[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLearnings = async () => {
    setLoading(true);
    const { data } = await supabase.from('agent_learnings').select('*').eq('instance_id', instance.id).order('created_at', { ascending: false });
    setLearnings(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLearnings(); }, [instance.id]);

  const toggleActive = async (l: AgentLearning) => {
    await supabase.from('agent_learnings').update({ is_active: !l.is_active }).eq('id', l.id);
    setLearnings((prev) => prev.map((x) => x.id === l.id ? { ...x, is_active: !x.is_active } : x));
  };

  const remove = async (id: string) => {
    await supabase.from('agent_learnings').delete().eq('id', id);
    setLearnings((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Sparkles size={18} className="text-neutral-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Correcoes feitas durante atendimento manual viram aprendizados que o agente passa a usar como exemplo.
              Ative ou desative cada um conforme a qualidade.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 size={16} className="animate-spin text-neutral-600" /></div>
      ) : learnings.length === 0 ? (
        <div className="text-center py-12 text-xs text-neutral-600">
          Ainda nao ha aprendizados.<br/>
          Quando voce assumir uma conversa em modo manual, as suas respostas viram aprendizados aqui.
        </div>
      ) : (
        <div className="space-y-2">
          {learnings.map((l) => (
            <div key={l.id} className={`bg-[#0a0a0a] border rounded-xl p-4 group transition-colors ${l.is_active ? 'border-[#1a1a1a]' : 'border-[#1a1a1a] opacity-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-600 uppercase tracking-wider">Cliente</span>
                    {l.customer_number && <span className="text-[10px] text-neutral-700">{l.customer_number}</span>}
                  </div>
                  <div className="text-xs text-neutral-300">{l.user_message}</div>
                  {l.bot_response && (
                    <>
                      <div className="text-[10px] text-red-400/70 uppercase tracking-wider">Resposta do bot (rejeitada)</div>
                      <div className="text-xs text-neutral-500 line-through">{l.bot_response}</div>
                    </>
                  )}
                  <div className="text-[10px] text-emerald-400/80 uppercase tracking-wider">Correcao humana</div>
                  <div className="text-xs text-white">{l.human_correction}</div>
                </div>
                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => toggleActive(l)} className="text-[10px] px-2 py-1 rounded border border-[#1a1a1a] text-neutral-400 hover:text-white hover:border-[#2a2a2a] transition-colors">
                    {l.is_active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button onClick={() => remove(l.id)} className="text-neutral-600 hover:text-red-400 transition-colors p-1">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// HELPERS
// =============================================================================
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[11px] text-neutral-400 font-medium">{label}</label>
        {hint && <span className="text-[10px] text-neutral-600">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 py-2 text-left group"
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs text-neutral-200">{label}</div>
        {hint && <div className="text-[10px] text-neutral-600 mt-0.5">{hint}</div>}
      </div>
      <div className={`shrink-0 w-9 h-5 rounded-full relative transition-colors ${checked ? 'bg-emerald-500/80' : 'bg-[#1a1a1a]'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
      </div>
    </button>
  );
}
