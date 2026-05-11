import { useEffect, useState } from 'react';
import {
  Plus, Pencil, Trash2, Loader2, Check, X, GripVertical,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Eye, EyeOff,
  Sparkles,
} from 'lucide-react';
import { supabase, AgentTemplate } from '../../lib/supabase';

// ─── Palette per template index ───────────────────────────────────────────────

const PALETTES = [
  { glow: 'rgba(16,185,129,0.18)', border: 'rgba(16,185,129,0.35)', ring: '#10b981', badge: 'bg-emerald-950/50 border-emerald-800/50 text-emerald-300' },
  { glow: 'rgba(59,130,246,0.18)', border: 'rgba(59,130,246,0.35)', ring: '#3b82f6', badge: 'bg-blue-950/50 border-blue-800/50 text-blue-300' },
  { glow: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.35)', ring: '#f59e0b', badge: 'bg-amber-950/50 border-amber-800/50 text-amber-300' },
  { glow: 'rgba(236,72,153,0.18)', border: 'rgba(236,72,153,0.35)', ring: '#ec4899', badge: 'bg-pink-950/50 border-pink-800/50 text-pink-300' },
  { glow: 'rgba(20,184,166,0.18)', border: 'rgba(20,184,166,0.35)', ring: '#14b8a6', badge: 'bg-teal-950/50 border-teal-800/50 text-teal-300' },
  { glow: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.22)', ring: '#94a3b8', badge: 'bg-slate-800/50 border-slate-700/50 text-slate-300' },
];

// ─── Custom field editor row ──────────────────────────────────────────────────

type CustomField = AgentTemplate['custom_fields'][number];

function FieldRow({
  field,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  field: CustomField;
  index: number;
  total: number;
  onChange: (f: CustomField) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="border border-[#1a1a1a] rounded-lg p-3 bg-[#060606] space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="text-neutral-600 hover:text-neutral-400 disabled:opacity-20 transition-colors"
          >
            <ChevronUp size={12} />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="text-neutral-600 hover:text-neutral-400 disabled:opacity-20 transition-colors"
          >
            <ChevronDown size={12} />
          </button>
        </div>
        <GripVertical size={12} className="text-neutral-700" />
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1 block">
              Chave (variável)
            </label>
            <input
              value={field.key}
              onChange={(e) => onChange({ ...field, key: e.target.value.replace(/\s/g, '_') })}
              placeholder="ex: store_name"
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-neutral-600"
            />
          </div>
          <div>
            <label className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1 block">
              Label para o usuário
            </label>
            <input
              value={field.label}
              onChange={(e) => onChange({ ...field, label: e.target.value })}
              placeholder="ex: Nome da loja"
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-neutral-600"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-neutral-600 hover:text-red-400 transition-colors ml-1"
        >
          <X size={12} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 pl-8">
        <div>
          <label className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1 block">
            Placeholder
          </label>
          <input
            value={field.placeholder}
            onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
            placeholder="ex: Loja da Maria"
            className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-neutral-600"
          />
        </div>
        <div>
          <label className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1 block">
            Tipo
          </label>
          <select
            value={field.type}
            onChange={(e) => onChange({ ...field, type: e.target.value as CustomField['type'] })}
            className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-neutral-600"
          >
            <option value="text">Texto</option>
            <option value="textarea">Área de texto</option>
            <option value="url">URL</option>
          </select>
        </div>
        <div className="flex items-end pb-0.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => onChange({ ...field, required: e.target.checked })}
              className="w-3 h-3 accent-white"
            />
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Obrigatório</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── Template form (create / edit) ──────────────────────────────────────────

const BLANK_TEMPLATE: Omit<AgentTemplate, 'id' | 'created_at' | 'updated_at'> = {
  title: '',
  description: '',
  icon: '',
  base_prompt: '',
  default_settings: { tone: 'friendly', language: 'pt-BR', emoji_usage: 'moderate' },
  custom_fields: [],
  sort_order: 0,
  is_active: true,
};

function TemplateForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Omit<AgentTemplate, 'id' | 'created_at' | 'updated_at'>;
  onSave: (data: Omit<AgentTemplate, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setField = (key: keyof typeof form, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const addCustomField = () => {
    setField('custom_fields', [
      ...form.custom_fields,
      { key: '', label: '', placeholder: '', required: false, type: 'text' as const },
    ]);
  };

  const updateCustomField = (i: number, f: CustomField) => {
    const arr = [...form.custom_fields];
    arr[i] = f;
    setField('custom_fields', arr);
  };

  const removeCustomField = (i: number) => {
    setField('custom_fields', form.custom_fields.filter((_, idx) => idx !== i));
  };

  const moveCustomField = (i: number, dir: -1 | 1) => {
    const arr = [...form.custom_fields];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setField('custom_fields', arr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Título obrigatório'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5 block">
            Ícone (emoji)
          </label>
          <input
            value={form.icon}
            onChange={(e) => setField('icon', e.target.value)}
            placeholder="ex: 💼"
            className="w-full bg-[#060606] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5 block">
            Título *
          </label>
          <input
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="ex: Vendas"
            className="w-full bg-[#060606] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5 block">
          Descrição curta
        </label>
        <input
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="ex: Consultor de vendas que qualifica e converte"
          className="w-full bg-[#060606] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600"
        />
      </div>

      <div>
        <label className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5 block">
          Prompt base
        </label>
        <p className="text-[11px] text-neutral-600 mb-2">
          Use <code className="bg-[#111] px-1 rounded text-neutral-400">{'{{chave}}'}</code> para
          inserir valores dos campos personalizados abaixo.
        </p>
        <textarea
          value={form.base_prompt}
          onChange={(e) => setField('base_prompt', e.target.value)}
          rows={6}
          placeholder="Você é um consultor da {{store_name}}. Seu papel é..."
          className="w-full bg-[#060606] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600 resize-none font-mono leading-relaxed"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
              Campos personalizados
            </div>
            <p className="text-[11px] text-neutral-600 mt-0.5">
              Campos que o usuário preencherá ao criar o agente.
            </p>
          </div>
          <button
            type="button"
            onClick={addCustomField}
            className="text-xs text-neutral-300 border border-[#1a1a1a] hover:border-[#262626] rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-colors"
          >
            <Plus size={11} /> Adicionar campo
          </button>
        </div>

        {form.custom_fields.length === 0 ? (
          <div className="border border-dashed border-[#1a1a1a] rounded-lg py-6 text-center text-xs text-neutral-600">
            Nenhum campo personalizado — o template não pedirá informações adicionais ao usuário.
          </div>
        ) : (
          <div className="space-y-2">
            {form.custom_fields.map((f, i) => (
              <FieldRow
                key={i}
                field={f}
                index={i}
                total={form.custom_fields.length}
                onChange={(upd) => updateCustomField(i, upd)}
                onRemove={() => removeCustomField(i)}
                onMove={(dir) => moveCustomField(i, dir)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5 block">
            Tom padrão
          </label>
          <select
            value={form.default_settings.tone ?? 'friendly'}
            onChange={(e) => setField('default_settings', { ...form.default_settings, tone: e.target.value })}
            className="w-full bg-[#060606] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600"
          >
            <option value="friendly">Amigável</option>
            <option value="professional">Profissional</option>
            <option value="casual">Descontraído</option>
            <option value="technical">Técnico</option>
            <option value="warm">Acolhedor</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5 block">
            Idioma padrão
          </label>
          <select
            value={form.default_settings.language ?? 'pt-BR'}
            onChange={(e) => setField('default_settings', { ...form.default_settings, language: e.target.value })}
            className="w-full bg-[#060606] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600"
          >
            <option value="pt-BR">Português (BR)</option>
            <option value="en-US">English (US)</option>
            <option value="es">Español</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5 block">
            Emojis padrão
          </label>
          <select
            value={form.default_settings.emoji_usage ?? 'moderate'}
            onChange={(e) => setField('default_settings', { ...form.default_settings, emoji_usage: e.target.value })}
            className="w-full bg-[#060606] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600"
          >
            <option value="none">Nenhum</option>
            <option value="moderate">Moderado</option>
            <option value="expressive">Expressivo</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setField('is_active', e.target.checked)}
            className="w-3.5 h-3.5 accent-white"
          />
          <span className="text-xs text-neutral-300">Template ativo (visível para usuários)</span>
        </label>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-neutral-400 hover:text-white px-4 py-2 border border-[#1a1a1a] rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-white text-black rounded-lg px-5 py-2 text-xs font-medium flex items-center gap-1.5 hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Salvar template
        </button>
      </div>
    </form>
  );
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  paletteIndex,
  onEdit,
  onDelete,
  onToggle,
}: {
  template: AgentTemplate;
  paletteIndex: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [hovered, setHovered] = useState(false);
  const palette = PALETTES[paletteIndex % PALETTES.length];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative rounded-2xl overflow-hidden group transition-all duration-300 ${
        template.is_active ? '' : 'opacity-50'
      }`}
      style={{
        background: 'rgba(255,255,255,0.025)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${hovered && template.is_active ? palette.border : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hovered && template.is_active
          ? `0 0 0 1px ${palette.border}, 0 8px 40px ${palette.glow}, 0 2px 12px rgba(0,0,0,0.5)`
          : '0 2px 12px rgba(0,0,0,0.3)',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* Colored top accent stripe */}
      {template.is_active && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${palette.ring}, transparent)` }}
        />
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Circular avatar with colored ring */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: `2px solid ${template.is_active ? palette.ring : 'rgba(255,255,255,0.06)'}`,
                boxShadow: template.is_active ? `0 0 12px ${palette.glow}` : 'none',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
              }}
            >
              {template.icon || '⬜'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white leading-tight">{template.title}</div>
              <div className="text-[11px] text-neutral-400 mt-1 leading-relaxed line-clamp-2">
                {template.description}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0">
            <button
              onClick={onToggle}
              title={template.is_active ? 'Desativar' : 'Ativar'}
              className="text-neutral-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              {template.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            </button>
            <button
              onClick={onEdit}
              className="text-neutral-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Pencil size={13} />
            </button>
            {confirming ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={onDelete}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg border border-red-900/40 bg-red-950/30 transition-colors"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="text-neutral-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="text-neutral-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-white/[0.05] mb-3" />

        {/* Metadata badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider ${
            template.is_active
              ? palette.badge
              : 'border-[#1a1a1a] text-neutral-600'
          }`}>
            {template.is_active && <Sparkles size={8} />}
            {template.is_active ? 'Ativo' : 'Inativo'}
          </span>
          {template.custom_fields.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/[0.07] bg-white/[0.03] text-neutral-400 uppercase tracking-wider">
              {template.custom_fields.length} {template.custom_fields.length === 1 ? 'campo' : 'campos'}
            </span>
          )}
          {template.base_prompt ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/[0.07] bg-white/[0.03] text-neutral-400 uppercase tracking-wider flex items-center gap-1">
              <Eye size={8} /> Com prompt
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/[0.04] text-neutral-600 uppercase tracking-wider flex items-center gap-1">
              <EyeOff size={8} /> Sem prompt
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Mode = 'list' | 'create' | 'edit';

export function TemplatesPage() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<AgentTemplate | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('agent_templates')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    setTemplates((data as AgentTemplate[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (form: Omit<AgentTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase.from('agent_templates').insert(form);
    if (error) throw error;
    await load();
    setMode('list');
  };

  const handleUpdate = async (form: Omit<AgentTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    if (!editing) return;
    const { error } = await supabase
      .from('agent_templates')
      .update(form)
      .eq('id', editing.id);
    if (error) throw error;
    await load();
    setMode('list');
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('agent_templates').delete().eq('id', id);
    await load();
  };

  const handleToggle = async (t: AgentTemplate) => {
    await supabase
      .from('agent_templates')
      .update({ is_active: !t.is_active })
      .eq('id', t.id);
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={16} className="text-neutral-600 animate-spin" />
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMode('list')}
            className="text-neutral-500 hover:text-white transition-colors"
          >
            ← Voltar
          </button>
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-500">Novo template</div>
            <div className="text-base text-white font-medium mt-0.5">Criar template de agente</div>
          </div>
        </div>
        <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] p-6">
          <TemplateForm
            initial={BLANK_TEMPLATE}
            onSave={handleCreate}
            onCancel={() => setMode('list')}
          />
        </div>
      </div>
    );
  }

  if (mode === 'edit' && editing) {
    const { id, created_at, updated_at, ...initial } = editing;
    void id; void created_at; void updated_at;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setMode('list'); setEditing(null); }}
            className="text-neutral-500 hover:text-white transition-colors"
          >
            ← Voltar
          </button>
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-500">Editar template</div>
            <div className="text-base text-white font-medium mt-0.5">{editing.title}</div>
          </div>
        </div>
        <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] p-6">
          <TemplateForm
            initial={initial}
            onSave={handleUpdate}
            onCancel={() => { setMode('list'); setEditing(null); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">Biblioteca</div>
          <div className="text-base text-white font-medium mt-0.5">Templates de Agente</div>
          <p className="text-[11px] text-neutral-600 mt-1">
            {templates.length} {templates.length === 1 ? 'template' : 'templates'} ·{' '}
            {templates.filter((t) => t.is_active).length} ativos
          </p>
        </div>
        <button
          onClick={() => setMode('create')}
          className="bg-white text-black rounded-lg px-4 py-2 text-xs font-medium flex items-center gap-1.5 hover:bg-neutral-200 transition-colors"
        >
          <Plus size={12} /> Novo template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="border border-dashed border-[#1a1a1a] rounded-xl py-16 text-center">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-sm text-neutral-400 mb-1">Nenhum template cadastrado</div>
          <div className="text-xs text-neutral-600">Crie o primeiro template para que usuários possam escolher ao criar agentes.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t, i) => (
            <TemplateCard
              key={t.id}
              template={t}
              paletteIndex={i}
              onEdit={() => { setEditing(t); setMode('edit'); }}
              onDelete={() => handleDelete(t.id)}
              onToggle={() => handleToggle(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
