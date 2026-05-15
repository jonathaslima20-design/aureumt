import { useEffect, useState } from 'react';
import { Loader2, Save, Plus, Trash2, BookOpen, User, Sparkles, MessageSquareQuote, Check, Copy, Wand2, Library, X, Bookmark } from 'lucide-react';
import { supabase, Instance, AgentPersona, HumanExample, AgentLearning, PersonaTemplate, SharedExample } from '../../lib/supabase';

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

export function AgentTrainingPage({ instances, embeddedInstance }: { instances: Instance[]; embeddedInstance?: Instance }) {
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(embeddedInstance || instances[0] || null);
  const [tab, setTab] = useState<Tab>('persona');
  const isEmbedded = !!embeddedInstance;

  if (!selectedInstance) {
    return (
      <div className="space-y-4">
        <div>
          <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent block mb-1">AI TRAINING</span>
          <h1 className="font-display font-bold text-xl tracking-tighter text-white uppercase">Treinamento</h1>
          <p className="text-sm text-neutral-500 mt-1">Crie um agente primeiro para treinar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!isEmbedded && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent block mb-1">AI TRAINING</span>
            <h1 className="font-display font-bold text-xl tracking-tighter text-white uppercase">Treinamento do Agente</h1>
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
      )}

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

      {tab === 'persona' && <PersonaTab instance={selectedInstance} otherInstances={instances.filter((i) => i.id !== selectedInstance.id)} />}
      {tab === 'examples' && <ExamplesTab instance={selectedInstance} />}
      {tab === 'learnings' && <LearningsTab instance={selectedInstance} />}
    </div>
  );
}

// =============================================================================
// PERSONA TAB
// =============================================================================
function PersonaTab({ instance, otherInstances }: { instance: Instance; otherInstances: Instance[] }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);
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

  const applyTemplate = (t: PersonaTemplate) => {
    setPersona((p) => ({
      ...p,
      age_range: t.age_range,
      region: t.region,
      background_story: t.background_story,
      hobbies: t.hobbies,
      speech_quirks: t.speech_quirks,
      favorite_phrases: t.favorite_phrases,
      formality_level: t.formality_level,
      use_typos: t.use_typos,
      use_abbreviations: t.use_abbreviations,
      use_hesitations: t.use_hesitations,
      use_regional_slang: t.use_regional_slang,
      anti_detection_mode: t.anti_detection_mode,
    }));
    setShowTemplates(false);
  };

  const duplicateFrom = async (sourceInstance: Instance) => {
    const { data } = await supabase.from('agent_personas').select('*').eq('instance_id', sourceInstance.id).maybeSingle();
    if (!data) return;
    setPersona((p) => ({
      ...p,
      age_range: data.age_range,
      region: data.region,
      background_story: data.background_story,
      hobbies: data.hobbies,
      speech_quirks: data.speech_quirks,
      favorite_phrases: data.favorite_phrases,
      formality_level: data.formality_level,
      use_typos: data.use_typos,
      use_abbreviations: data.use_abbreviations,
      use_hesitations: data.use_hesitations,
      use_regional_slang: data.use_regional_slang,
      anti_detection_mode: data.anti_detection_mode,
    }));
    setShowDuplicate(false);
  };

  if (loading) return <div className="py-10 flex justify-center"><Loader2 size={16} className="animate-spin text-neutral-600" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowTemplates(true)}
          className="text-xs text-neutral-300 hover:text-white border border-[#1a1a1a] hover:border-[#2a2a2a] rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-colors bg-[#0d0d0d]"
        >
          <Wand2 size={12} /> Aplicar template
        </button>
        {otherInstances.length > 0 && (
          <button
            onClick={() => setShowDuplicate(true)}
            className="text-xs text-neutral-300 hover:text-white border border-[#1a1a1a] hover:border-[#2a2a2a] rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-colors bg-[#0d0d0d]"
          >
            <Copy size={12} /> Duplicar de outro agente
          </button>
        )}
        <span className="text-[10px] text-neutral-600 ml-auto">As escolhas substituem campos abaixo. Salve para confirmar.</span>
      </div>

      {showTemplates && <TemplatePickerModal onPick={applyTemplate} onClose={() => setShowTemplates(false)} />}
      {showDuplicate && <DuplicatePersonaModal otherInstances={otherInstances} onPick={duplicateFrom} onClose={() => setShowDuplicate(false)} />}

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
            rows={6}
            className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-3 text-sm text-white outline-none focus:border-[#2a2a2a] resize-y leading-relaxed min-h-[120px]"
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
  const [showLibrary, setShowLibrary] = useState(false);
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

  const saveToLibrary = async (e: HumanExample) => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;
    const { data: created } = await supabase.from('shared_examples').insert({
      user_id: userRes.user.id,
      label: e.trigger_keyword || e.example_question.slice(0, 40),
      trigger_keyword: e.trigger_keyword,
      example_question: e.example_question,
      ideal_response: e.ideal_response,
    }).select().maybeSingle();
    if (created) {
      await supabase.from('human_examples').update({ source_shared_id: created.id }).eq('id', e.id);
      setExamples((prev) => prev.map((x) => x.id === e.id ? { ...x, source_shared_id: created.id } : x));
    }
  };

  const importFromShared = async (shared: SharedExample[]) => {
    if (shared.length === 0) return;
    const rows = shared.map((s, idx) => ({
      instance_id: instance.id,
      trigger_keyword: s.trigger_keyword,
      example_question: s.example_question,
      ideal_response: s.ideal_response,
      sort_order: examples.length + idx,
      source_shared_id: s.id,
    }));
    await supabase.from('human_examples').insert(rows);
    setShowLibrary(false);
    await fetchExamples();
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="border border-dashed border-[#242424] rounded-xl py-4 text-sm text-neutral-500 hover:text-white hover:border-[#2e2e2e] transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Adicionar exemplo
          </button>
          <button
            onClick={() => setShowLibrary(true)}
            className="border border-dashed border-[#242424] rounded-xl py-4 text-sm text-neutral-500 hover:text-white hover:border-[#2e2e2e] transition-colors flex items-center justify-center gap-2"
          >
            <Library size={14} /> Importar da biblioteca
          </button>
        </div>
      )}

      {showLibrary && <SharedLibraryModal onImport={importFromShared} onClose={() => setShowLibrary(false)} />}

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
                <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!e.source_shared_id && (
                    <button onClick={() => saveToLibrary(e)} className="text-neutral-600 hover:text-amber-400 transition-colors p-1" title="Salvar na biblioteca">
                      <Bookmark size={13} />
                    </button>
                  )}
                  {e.source_shared_id && (
                    <span className="text-amber-500/80 p-1" title="Vindo da biblioteca">
                      <Bookmark size={13} fill="currentColor" />
                    </span>
                  )}
                  <button onClick={() => remove(e.id)} className="text-neutral-600 hover:text-red-400 transition-colors p-1">
                    <Trash2 size={13} />
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
              Correcoes e feedbacks negativos no chat (correcao manual ou comentario com avaliacao "ruim") viram aprendizados aqui.
              O agente usa cada item ativo como exemplo few-shot nas proximas respostas.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 size={16} className="animate-spin text-neutral-600" /></div>
      ) : learnings.length === 0 ? (
        <div className="text-center py-12 text-xs text-neutral-600">
          Ainda nao ha aprendizados.<br/>
          Use os botoes de feedback (positivo/negativo/comentar) nas respostas do agente no chat para gerar aprendizados.
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

function TemplatePickerModal({ onPick, onClose }: { onPick: (t: PersonaTemplate) => void; onClose: () => void }) {
  const [templates, setTemplates] = useState<PersonaTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('persona_templates').select('*').order('is_official', { ascending: false }).order('name', { ascending: true });
      setTemplates(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-5 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Wand2 size={14} /> Templates de Persona</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">Escolha um preset pronto. Voce ainda pode editar tudo depois.</p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white"><X size={16} /></button>
        </div>
        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 size={16} className="animate-spin text-neutral-600" /></div>
        ) : templates.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-600">Nenhum template disponivel.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => onPick(t)}
                className="text-left bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-[#141414] rounded-xl p-3 transition-colors space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white">{t.name}</span>
                  {t.is_official && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-blue-900/40 bg-blue-500/10 text-blue-400">Oficial</span>}
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">{t.description}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="text-[9px] text-neutral-600 px-1.5 py-0.5 rounded bg-[#141414] border border-[#1a1a1a]">{t.age_range} anos</span>
                  <span className="text-[9px] text-neutral-600 px-1.5 py-0.5 rounded bg-[#141414] border border-[#1a1a1a]">{t.region}</span>
                  <span className="text-[9px] text-neutral-600 px-1.5 py-0.5 rounded bg-[#141414] border border-[#1a1a1a]">{t.formality_level}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DuplicatePersonaModal({ otherInstances, onPick, onClose }: { otherInstances: Instance[]; onPick: (i: Instance) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-5 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Copy size={14} /> Duplicar persona</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">Escolha de qual agente copiar a configuracao.</p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="space-y-2">
          {otherInstances.map((i) => (
            <button
              key={i.id}
              onClick={() => onPick(i)}
              className="w-full text-left bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-[#141414] rounded-xl p-3 transition-colors"
            >
              <div className="text-xs font-medium text-white">{i.display_name || i.instance_name}</div>
              {i.persona_name && <div className="text-[10px] text-neutral-500 mt-0.5">Persona: {i.persona_name}</div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SharedLibraryModal({ onImport, onClose }: { onImport: (items: SharedExample[]) => void; onClose: () => void }) {
  const [items, setItems] = useState<SharedExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ label: '', trigger_keyword: '', example_question: '', ideal_response: '' });

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.from('shared_examples').select('*').order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addToLibrary = async () => {
    if (!draft.example_question.trim() || !draft.ideal_response.trim()) return;
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;
    await supabase.from('shared_examples').insert({
      user_id: userRes.user.id,
      label: draft.label || draft.example_question.slice(0, 40),
      trigger_keyword: draft.trigger_keyword,
      example_question: draft.example_question,
      ideal_response: draft.ideal_response,
    });
    setDraft({ label: '', trigger_keyword: '', example_question: '', ideal_response: '' });
    setAdding(false);
    await fetchItems();
  };

  const removeShared = async (id: string) => {
    await supabase.from('shared_examples').delete().eq('id', id);
    setItems((prev) => prev.filter((x) => x.id !== id));
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  const doImport = () => {
    onImport(items.filter((i) => selected.has(i.id)));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-5 w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Library size={14} /> Biblioteca de exemplos</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">Exemplos salvos sao reutilizaveis em qualquer agente seu.</p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white"><X size={16} /></button>
        </div>

        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="w-full border border-dashed border-[#242424] rounded-xl py-2.5 text-xs text-neutral-500 hover:text-white hover:border-[#2e2e2e] transition-colors flex items-center justify-center gap-2 mb-3 shrink-0"
          >
            <Plus size={12} /> Criar novo exemplo na biblioteca
          </button>
        )}

        {adding && (
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3 space-y-2 mb-3 shrink-0">
            <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Rotulo (opcional)" className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#2a2a2a]" />
            <input value={draft.trigger_keyword} onChange={(e) => setDraft({ ...draft, trigger_keyword: e.target.value })} placeholder="Palavra-chave (opcional)" className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#2a2a2a]" />
            <textarea value={draft.example_question} onChange={(e) => setDraft({ ...draft, example_question: e.target.value })} rows={2} placeholder="Pergunta do cliente" className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#2a2a2a] resize-none" />
            <textarea value={draft.ideal_response} onChange={(e) => setDraft({ ...draft, ideal_response: e.target.value })} rows={3} placeholder="Resposta ideal" className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#2a2a2a] resize-none" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setAdding(false); setDraft({ label: '', trigger_keyword: '', example_question: '', ideal_response: '' }); }} className="border border-[#1a1a1a] text-neutral-400 hover:text-white rounded-lg px-3 py-1.5 text-xs transition-colors">Cancelar</button>
              <button onClick={addToLibrary} disabled={!draft.example_question.trim() || !draft.ideal_response.trim()} className="bg-white text-black rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-neutral-200 disabled:opacity-50">Salvar</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 size={16} className="animate-spin text-neutral-600" /></div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-600">Biblioteca vazia. Salve exemplos do agente clicando no icone de bookmark.</div>
          ) : items.map((s) => {
            const isSel = selected.has(s.id);
            return (
              <div key={s.id} className={`bg-[#0a0a0a] border rounded-xl p-3 transition-colors ${isSel ? 'border-emerald-700/50' : 'border-[#1a1a1a]'}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggle(s.id)} className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center ${isSel ? 'bg-emerald-500/20 border-emerald-500/40' : 'border-[#2a2a2a]'}`}>
                    {isSel && <Check size={9} className="text-emerald-400" />}
                  </button>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {(s.label || s.trigger_keyword) && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {s.label && <span className="text-[10px] text-amber-400">{s.label}</span>}
                        {s.trigger_keyword && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#141414] border border-[#1a1a1a] text-neutral-500 uppercase tracking-wide">{s.trigger_keyword}</span>}
                      </div>
                    )}
                    <div className="text-[11px] text-neutral-400 line-clamp-2">{s.example_question}</div>
                    <div className="text-[11px] text-white line-clamp-2">{s.ideal_response}</div>
                  </div>
                  <button onClick={() => removeShared(s.id)} className="text-neutral-600 hover:text-red-400 transition-colors p-1">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-[#1a1a1a] mt-3 shrink-0">
          <span className="text-[11px] text-neutral-500">{selected.size} selecionado(s)</span>
          <button
            onClick={doImport}
            disabled={selected.size === 0}
            className="bg-white text-black rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-neutral-200 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Plus size={12} /> Importar selecionados
          </button>
        </div>
      </div>
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
