import { useEffect, useMemo, useState } from 'react';
import {
  Loader2, Sparkles, Check, Bot, Search, Clock, TrendingUp, Star,
  Zap, ArrowLeft, ArrowRight, MessageSquare, CheckCircle2, Target, Layers,
} from 'lucide-react';
import {
  supabase, AgentTemplate, Instance, buildSystemPrompt, AGENT_COLORS,
  TEMPLATE_CATEGORIES, TONE_OPTIONS,
} from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type Props = {
  onAgentCreated: (inst: Instance) => void;
};

type View = 'gallery' | 'detail' | 'wizard';

export function TemplateGalleryPage({ onAgentCreated }: Props) {
  const { profile } = useAuth();
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('gallery');
  const [selected, setSelected] = useState<AgentTemplate | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('todos');
  const [sort, setSort] = useState<'popular' | 'recent' | 'featured'>('featured');

  useEffect(() => {
    (async () => {
      const [tpls, statRes] = await Promise.all([
        supabase
          .from('agent_templates')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase.rpc('template_usage_counts'),
      ]);
      setTemplates((tpls.data as AgentTemplate[]) || []);
      const c: Record<string, number> = {};
      (statRes.data as Array<{ template_id: string; total: number }> | null)?.forEach((r) => {
        c[r.template_id] = Number(r.total) || 0;
      });
      setCounts(c);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = templates.filter((t) => {
      if (category !== 'todos' && t.category !== category) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [t.title, t.description, t.tagline, ...(t.tags || []), ...(t.capabilities || [])]
          .join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sort === 'popular') {
      list = [...list].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));
    } else if (sort === 'recent') {
      list = [...list].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    } else {
      list = [...list].sort((a, b) => {
        if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
        return a.sort_order - b.sort_order;
      });
    }
    return list;
  }, [templates, category, search, sort, counts]);

  const featured = useMemo(() => templates.filter((t) => t.is_featured).slice(0, 3), [templates]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={20} className="animate-spin text-neutral-600" />
      </div>
    );
  }

  if (view === 'detail' && selected) {
    return (
      <TemplateDetailView
        template={selected}
        usageCount={counts[selected.id] || 0}
        onBack={() => { setView('gallery'); setSelected(null); }}
        onUse={() => setView('wizard')}
      />
    );
  }

  if (view === 'wizard' && selected && profile) {
    return (
      <TemplateWizard
        template={selected}
        userId={profile.id}
        onBack={() => setView('detail')}
        onCreated={(inst) => {
          onAgentCreated(inst);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-[#1f1f1f] bg-gradient-to-br from-[#0f0f0f] via-[#0c0c0c] to-[#0a0a0a] p-6 sm:p-8">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 80% at 80% 0%, rgba(16,185,129,0.10), transparent 60%), radial-gradient(ellipse 60% 80% at 0% 100%, rgba(59,130,246,0.08), transparent 60%)',
          }}
        />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 text-[10px] uppercase tracking-wider font-medium mb-3">
            <Sparkles size={10} /> Marketplace de agentes
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tighter text-white uppercase">
            Coloque um agente no ar em 2 minutos
          </h1>
          <p className="text-sm text-neutral-400 mt-2 max-w-2xl">
            Escolha um modelo pronto, personalize com seus dados e veja funcionando antes de
            conectar ao WhatsApp. Sem prompt do zero, sem complicacao.
          </p>
        </div>
      </div>

      {/* Featured carousel */}
      {featured.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-emerald-500" />
            <h2 className="text-sm font-medium text-white">Recomendados para voce</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {featured.map((t) => (
              <FeaturedCard
                key={t.id}
                template={t}
                usageCount={counts[t.id] || 0}
                onSelect={() => { setSelected(t); setView('detail'); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, tag ou capacidade..."
              className="w-full bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#363636] outline-none transition-colors"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#363636] outline-none transition-colors"
          >
            <option value="featured">Destaques</option>
            <option value="popular">Mais usados</option>
            <option value="recent">Mais recentes</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-1.5 -mx-1 px-1 overflow-x-auto">
          {TEMPLATE_CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                category === c.value
                  ? 'bg-white text-black border-white'
                  : 'bg-[#0d0d0d] text-neutral-400 border-[#1c1c1c] hover:border-[#2a2a2a] hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-[#242424] rounded-xl py-12 sm:py-16 text-center bg-[#0d0d0d] px-4">
          <Sparkles size={24} className="mx-auto text-neutral-700 mb-3" strokeWidth={1.5} />
          <p className="text-sm text-neutral-500 mb-1">Nenhum template encontrado</p>
          <p className="text-xs text-neutral-600">Tente outra busca ou categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              usageCount={counts[t.id] || 0}
              onSelect={() => { setSelected(t); setView('detail'); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Cards ──────────────────────────────────────────────────────────────────

function FeaturedCard({
  template, usageCount, onSelect,
}: { template: AgentTemplate; usageCount: number; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="group relative text-left bg-gradient-to-br from-[#141414] to-[#0d0d0d] border border-[#242424] hover:border-emerald-900/60 rounded-xl p-4 transition-all overflow-hidden"
    >
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-30 group-hover:opacity-60 transition-opacity"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.4), transparent 70%)' }}
      />
      <div className="relative flex items-start gap-3">
        <Avatar template={template} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="text-sm font-medium text-white truncate">{template.title}</h3>
            <Star size={10} className="text-emerald-400 fill-emerald-400 shrink-0" />
          </div>
          <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
            {template.tagline || template.description}
          </p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-neutral-600">
            <span className="flex items-center gap-1"><Clock size={9} /> {template.setup_time_minutes} min</span>
            {usageCount > 0 && (
              <span className="flex items-center gap-1 text-emerald-500">
                <TrendingUp size={9} /> {usageCount} {usageCount === 1 ? 'uso' : 'usos'}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function TemplateCard({
  template, usageCount, onSelect,
}: { template: AgentTemplate; usageCount: number; onSelect: () => void }) {
  const isNew = template.created_at &&
    (Date.now() - new Date(template.created_at).getTime() < 30 * 24 * 60 * 60 * 1000);

  return (
    <button
      onClick={onSelect}
      className="group text-left bg-[#141414] border border-[#242424] hover:border-[#363636] rounded-xl overflow-hidden transition-all hover:shadow-lg hover:shadow-black/40"
    >
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Avatar template={template} size={48} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-medium text-white truncate">{template.title}</h3>
                {template.is_featured && (
                  <Star size={10} className="text-emerald-400 fill-emerald-400 shrink-0" />
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2 leading-relaxed">
                {template.tagline || template.description}
              </p>
            </div>
          </div>
          {isNew && (
            <span className="text-[9px] px-1.5 py-0.5 rounded border border-emerald-900/40 bg-emerald-950/30 text-emerald-400 uppercase tracking-wider font-medium shrink-0">
              Novo
            </span>
          )}
        </div>

        {template.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {template.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full border border-[#242424] bg-[#0d0d0d] text-neutral-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 text-[10px] text-neutral-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Clock size={10} /> {template.setup_time_minutes} min</span>
            {usageCount > 0 && (
              <span className="flex items-center gap-1">
                <TrendingUp size={10} /> {usageCount} {usageCount === 1 ? 'uso' : 'usos'}
              </span>
            )}
          </div>
          <span className="text-neutral-500 group-hover:text-white transition-colors flex items-center gap-1">
            Ver detalhes <ArrowRight size={10} />
          </span>
        </div>
      </div>
    </button>
  );
}

function Avatar({ template, size }: { template: AgentTemplate; size: number }) {
  if (template.profile_image_url) {
    return (
      <img
        src={template.profile_image_url}
        alt={template.title}
        className="rounded-full object-cover shrink-0 border border-[#242424]"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-[#1a1a1a] border border-[#242424] flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {template.icon || <Bot size={size * 0.4} className="text-neutral-500" />}
    </div>
  );
}

// ─── Detail view ────────────────────────────────────────────────────────────

function TemplateDetailView({
  template, usageCount, onBack, onUse,
}: {
  template: AgentTemplate;
  usageCount: number;
  onBack: () => void;
  onUse: () => void;
}) {
  return (
    <div className="space-y-6 max-w-5xl">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors"
      >
        <ArrowLeft size={12} /> Voltar para galeria
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <Avatar template={template} size={64} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-semibold text-white">{template.title}</h1>
                  {template.is_featured && (
                    <span className="text-[10px] px-2 py-0.5 rounded border border-emerald-900/40 bg-emerald-950/30 text-emerald-400 uppercase tracking-wider font-medium flex items-center gap-1">
                      <Star size={9} /> Destaque
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-400 mt-1">
                  {template.tagline || template.description}
                </p>
                <div className="flex items-center gap-4 mt-3 text-[11px] text-neutral-500">
                  <span className="flex items-center gap-1"><Clock size={11} /> Pronto em {template.setup_time_minutes} min</span>
                  {usageCount > 0 && (
                    <span className="flex items-center gap-1 text-emerald-500">
                      <TrendingUp size={11} /> Usado {usageCount} {usageCount === 1 ? 'vez' : 'vezes'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {template.description && (
              <p className="text-sm text-neutral-300 leading-relaxed mt-5 pt-5 border-t border-[#1c1c1c]">
                {template.description}
              </p>
            )}
          </div>

          {template.capabilities?.length > 0 && (
            <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={14} className="text-emerald-500" />
                <h2 className="text-sm font-medium text-white">O que esse agente faz</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {template.capabilities.map((cap, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                    <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span>{cap}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {template.example_conversation?.length > 0 && (
            <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare size={14} className="text-blue-400" />
                <h2 className="text-sm font-medium text-white">Exemplo de conversa</h2>
              </div>
              <div className="space-y-3">
                {template.example_conversation.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#1a1a1a] text-neutral-300 rounded-tl-sm'
                          : 'bg-emerald-950/40 border border-emerald-900/40 text-emerald-100 rounded-tr-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 lg:sticky lg:top-4">
            <button
              onClick={onUse}
              className="w-full bg-accent text-white rounded-lg py-3 text-sm font-display font-semibold uppercase tracking-wider hover:shadow-[0_0_30px_rgba(255,59,0,0.4)] shadow-[0_0_20px_rgba(255,59,0,0.25)] transition-all flex items-center justify-center gap-2 mb-3"
            >
              <Sparkles size={14} /> Usar este template
            </button>
            <p className="text-[11px] text-neutral-600 text-center">
              Setup guiado em {template.setup_time_minutes} minutos
            </p>
          </div>

          {template.ideal_for?.length > 0 && (
            <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target size={12} className="text-neutral-500" />
                <h3 className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium">Ideal para</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {template.ideal_for.map((item) => (
                  <span
                    key={item}
                    className="text-xs px-2 py-1 rounded-md bg-[#141414] border border-[#242424] text-neutral-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {template.recommended_integrations?.length > 0 && (
            <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Layers size={12} className="text-neutral-500" />
                <h3 className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium">Integracoes recomendadas</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {template.recommended_integrations.map((item) => (
                  <span
                    key={item}
                    className="text-xs px-2 py-1 rounded-md bg-[#141414] border border-[#242424] text-neutral-300 capitalize"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {template.tags?.length > 0 && (
            <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5">
              <h3 className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium mb-3">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-[#242424] bg-[#141414] text-neutral-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Wizard ─────────────────────────────────────────────────────────────────

const TONE_PRESETS = [
  { value: 'friendly', label: 'Amigavel', sample: 'Oi! Que bom ter voce por aqui!' },
  { value: 'professional', label: 'Profissional', sample: 'Bom dia. Como posso ajuda-lo hoje?' },
  { value: 'casual', label: 'Descontraido', sample: 'E ai, tudo certo? Bora resolver isso!' },
  { value: 'warm', label: 'Acolhedor', sample: 'Oi querido(a), fico feliz em te atender.' },
  { value: 'technical', label: 'Tecnico', sample: 'Verifiquei o ticket. O log indica timeout na chamada.' },
];

function TemplateWizard({
  template, userId, onBack, onCreated,
}: {
  template: AgentTemplate;
  userId: string;
  onBack: () => void;
  onCreated: (inst: Instance) => void;
}) {
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    template.custom_fields.forEach((f) => { v[f.key] = ''; });
    return v;
  });
  const [tone, setTone] = useState(template.default_settings.tone || 'friendly');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const requiredFilled = template.custom_fields
    .filter((f) => f.required)
    .every((f) => customValues[f.key]?.trim());

  const canAdvance = (() => {
    if (step === 1) return displayName.trim().length > 0;
    if (step === 2) return requiredFilled;
    return true;
  })();

  const finalPrompt = useMemo(() => {
    let p = template.base_prompt;
    Object.entries(customValues).forEach(([k, v]) => {
      p = p.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v.trim() || `{{${k}}}`);
    });
    return buildSystemPrompt({
      persona_name: displayName.trim() || 'Assistente',
      company_name: companyName.trim(),
      tone,
      language: template.default_settings.language || 'pt-BR',
      emoji_usage: template.default_settings.emoji_usage || 'moderate',
      base: p,
    });
  }, [template, customValues, displayName, companyName, tone]);

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      const color = AGENT_COLORS[Math.floor(Math.random() * AGENT_COLORS.length)];
      const { data, error: dbErr } = await supabase
        .from('instances')
        .insert({
          user_id: userId,
          instance_name: displayName.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36),
          display_name: displayName.trim(),
          company_name: companyName.trim(),
          persona_name: displayName.trim(),
          system_prompt: finalPrompt,
          tone,
          language: template.default_settings.language || 'pt-BR',
          emoji_usage: template.default_settings.emoji_usage || 'moderate',
          avatar_url: template.profile_image_url || '',
          color,
        })
        .select()
        .maybeSingle();

      if (dbErr) throw dbErr;
      if (!data) throw new Error('Erro ao criar agente');

      await supabase.from('template_usage_stats').insert({
        template_id: template.id,
        user_id: userId,
      });

      onCreated(data as Instance);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar agente');
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors"
      >
        <ArrowLeft size={12} /> Voltar para detalhes
      </button>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < step ? 'bg-emerald-500' : 'bg-[#1c1c1c]'
              }`}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px] text-neutral-500">
        <span>Passo {step} de {totalSteps}</span>
        <span>
          {step === 1 && 'Identidade do agente'}
          {step === 2 && 'Personalizacao'}
          {step === 3 && 'Tom de voz'}
          {step === 4 && 'Revisao final'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6 min-h-[360px]">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-medium text-white">Como vai chamar seu agente?</h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Esse e o nome que os clientes vao ver na conversa.
                </p>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Nome do agente *</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ex: Julia Atendente"
                  className="w-full bg-[#0a0a0a] border border-[#1c1c1c] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#363636] outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Nome da empresa</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Tech Solutions"
                  className="w-full bg-[#0a0a0a] border border-[#1c1c1c] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#363636] outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-medium text-white">Personalize o agente</h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Esses dados serao usados nas respostas do agente.
                </p>
              </div>
              {template.custom_fields.length === 0 ? (
                <div className="text-sm text-neutral-500 border border-dashed border-[#242424] rounded-lg p-6 text-center">
                  Nenhuma personalizacao necessaria. Pode avancar.
                </div>
              ) : (
                template.custom_fields.map((field) => (
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
                        className="w-full bg-[#0a0a0a] border border-[#1c1c1c] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#363636] outline-none transition-colors resize-none"
                      />
                    ) : (
                      <input
                        type={field.type === 'url' ? 'url' : 'text'}
                        value={customValues[field.key] || ''}
                        onChange={(e) => setCustomValues({ ...customValues, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full bg-[#0a0a0a] border border-[#1c1c1c] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#363636] outline-none transition-colors"
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-medium text-white">Escolha o tom de voz</h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Como seu agente vai falar com os clientes?
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TONE_PRESETS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      tone === t.value
                        ? 'border-emerald-700 bg-emerald-950/20'
                        : 'border-[#1c1c1c] bg-[#0a0a0a] hover:border-[#2a2a2a]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{t.label}</span>
                      {tone === t.value && <Check size={12} className="text-emerald-400" />}
                    </div>
                    <p className="text-xs text-neutral-400 italic leading-relaxed">"{t.sample}"</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-medium text-white">Tudo pronto!</h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Revise os dados e crie seu agente.
                </p>
              </div>
              <div className="space-y-3">
                <ReviewRow label="Nome" value={displayName} />
                <ReviewRow label="Empresa" value={companyName || '—'} />
                <ReviewRow label="Tom de voz" value={TONE_OPTIONS.find((o) => o.value === tone)?.label || tone} />
                <ReviewRow label="Template" value={template.title} />
                {template.custom_fields.map((f) => (
                  <ReviewRow
                    key={f.key}
                    label={f.label}
                    value={customValues[f.key]?.trim() || '—'}
                  />
                ))}
              </div>
              {error && (
                <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-6 mt-6 border-t border-[#1c1c1c]">
            <button
              onClick={() => step === 1 ? onBack() : setStep(step - 1)}
              className="text-sm text-neutral-400 hover:text-white px-3 py-2 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={12} /> {step === 1 ? 'Cancelar' : 'Voltar'}
            </button>
            {step < totalSteps ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canAdvance}
                className="bg-white text-black rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-neutral-200 transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                Continuar <ArrowRight size={12} />
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={creating}
                className="bg-emerald-500 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {creating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Criar agente
              </button>
            )}
          </div>
        </div>

        {/* Live preview sidebar */}
        <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5 lg:sticky lg:top-4 self-start">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-3">
            Preview do agente
          </div>
          <div className="flex items-center gap-3 mb-4">
            <Avatar template={template} size={44} />
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {displayName || 'Seu agente'}
              </div>
              <div className="text-[11px] text-neutral-500 truncate">
                {companyName || template.title}
              </div>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <PreviewBubble side="user" text="Oi, tudo bem?" />
            <PreviewBubble
              side="bot"
              text={TONE_PRESETS.find((t) => t.value === tone)?.sample || ''}
            />
          </div>
          <details className="text-[11px] text-neutral-500">
            <summary className="cursor-pointer hover:text-white transition-colors">
              Ver prompt gerado
            </summary>
            <pre className="text-[10px] text-neutral-400 mt-2 p-2 bg-[#0a0a0a] rounded border border-[#1c1c1c] whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-auto">
              {finalPrompt}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[#1c1c1c]">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="text-sm text-white text-right break-words max-w-[60%]">{value}</span>
    </div>
  );
}

function PreviewBubble({ side, text }: { side: 'user' | 'bot'; text: string }) {
  return (
    <div className={`flex ${side === 'user' ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
          side === 'user'
            ? 'bg-[#1a1a1a] text-neutral-300'
            : 'bg-emerald-950/40 border border-emerald-900/40 text-emerald-100'
        }`}
      >
        {text || '...'}
      </div>
    </div>
  );
}

