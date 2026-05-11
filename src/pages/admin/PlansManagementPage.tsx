import { useEffect, useState } from 'react';
import { Plus, Save, Loader2, Check, Trash2, X, Pencil, Star } from 'lucide-react';
import { supabase, Plan } from '../../lib/supabase';

type PlanForm = {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  price_monthly: string;
  price_semiannual: string;
  price_annual: string;
  max_agents: string;
  max_messages_month: string;
  features: string;
  payment_link_monthly: string;
  payment_link_semiannual: string;
  payment_link_annual: string;
  sort_order: string;
  is_active: boolean;
  highlight: boolean;
};

const EMPTY_FORM: PlanForm = {
  id: null,
  name: '',
  slug: '',
  description: '',
  price_monthly: '',
  price_semiannual: '',
  price_annual: '',
  max_agents: '',
  max_messages_month: '',
  features: '',
  payment_link_monthly: '',
  payment_link_semiannual: '',
  payment_link_annual: '',
  sort_order: '0',
  is_active: true,
  highlight: false,
};

export function PlansManagementPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PlanForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('plans')
      .select('*')
      .order('sort_order', { ascending: true });
    setPlans(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => setEditing({ ...EMPTY_FORM });

  const startEdit = (p: Plan) => {
    setEditing({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price_monthly: p.price_monthly.toString(),
      price_semiannual: p.price_semiannual.toString(),
      price_annual: p.price_annual.toString(),
      max_agents: p.max_agents?.toString() ?? '',
      max_messages_month: p.max_messages_month?.toString() ?? '',
      features: (p.features || []).join('\n'),
      payment_link_monthly: p.payment_link_monthly,
      payment_link_semiannual: p.payment_link_semiannual,
      payment_link_annual: p.payment_link_annual,
      sort_order: p.sort_order.toString(),
      is_active: p.is_active,
      highlight: p.highlight,
    });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);

    const payload = {
      name: editing.name.trim(),
      slug: editing.slug.trim().toLowerCase().replace(/\s+/g, '-'),
      description: editing.description.trim(),
      price_monthly: parseFloat(editing.price_monthly) || 0,
      price_semiannual: parseFloat(editing.price_semiannual) || 0,
      price_annual: parseFloat(editing.price_annual) || 0,
      max_agents: editing.max_agents ? parseInt(editing.max_agents, 10) : null,
      max_messages_month: editing.max_messages_month ? parseInt(editing.max_messages_month, 10) : null,
      features: editing.features.split('\n').map((f) => f.trim()).filter(Boolean),
      payment_link_monthly: editing.payment_link_monthly.trim(),
      payment_link_semiannual: editing.payment_link_semiannual.trim(),
      payment_link_annual: editing.payment_link_annual.trim(),
      sort_order: parseInt(editing.sort_order, 10) || 0,
      is_active: editing.is_active,
      highlight: editing.highlight,
    };

    if (editing.id) {
      await supabase.from('plans').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('plans').insert(payload);
    }

    setSaving(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    setDeleting(id);
    await supabase.from('plans').delete().eq('id', id);
    setDeleting(null);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={18} className="text-neutral-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Gestao de Planos</h1>
          <p className="text-sm text-neutral-500 mt-1">Configure planos, precos e links de pagamento.</p>
        </div>
        {!editing && (
          <button
            onClick={startCreate}
            className="flex items-center gap-1.5 bg-white text-black rounded-lg px-4 py-2 text-xs font-medium hover:bg-neutral-200 transition-colors"
          >
            <Plus size={13} /> Novo Plano
          </button>
        )}
      </div>

      {editing && (
        <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">
              {editing.id ? 'Editar Plano' : 'Novo Plano'}
            </h2>
            <button onClick={() => setEditing(null)} className="text-neutral-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 block">Nome</label>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Business"
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 block">Slug</label>
              <input
                type="text"
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                placeholder="business"
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 block">Ordem</label>
              <input
                type="number"
                value={editing.sort_order}
                onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })}
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 block">Descricao</label>
            <input
              type="text"
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="Ideal para..."
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 block">Preco Mensal (R$)</label>
              <input
                type="number"
                step="0.01"
                value={editing.price_monthly}
                onChange={(e) => setEditing({ ...editing, price_monthly: e.target.value })}
                placeholder="197.00"
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 block">Preco Semestral (R$)</label>
              <input
                type="number"
                step="0.01"
                value={editing.price_semiannual}
                onChange={(e) => setEditing({ ...editing, price_semiannual: e.target.value })}
                placeholder="1063.00"
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 block">Preco Anual (R$)</label>
              <input
                type="number"
                step="0.01"
                value={editing.price_annual}
                onChange={(e) => setEditing({ ...editing, price_annual: e.target.value })}
                placeholder="1891.00"
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 block">Max Agentes (vazio = ilimitado)</label>
              <input
                type="number"
                value={editing.max_agents}
                onChange={(e) => setEditing({ ...editing, max_agents: e.target.value })}
                placeholder="5"
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 block">Max Msgs/mes (vazio = ilimitado)</label>
              <input
                type="number"
                value={editing.max_messages_month}
                onChange={(e) => setEditing({ ...editing, max_messages_month: e.target.value })}
                placeholder="10000"
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 block">Recursos (um por linha)</label>
            <textarea
              value={editing.features}
              onChange={(e) => setEditing({ ...editing, features: e.target.value })}
              placeholder={"1 Agente de IA\nAte 2.000 mensagens/mes\n..."}
              rows={4}
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 block">Link Pagamento Mensal</label>
              <input
                type="url"
                value={editing.payment_link_monthly}
                onChange={(e) => setEditing({ ...editing, payment_link_monthly: e.target.value })}
                placeholder="https://..."
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 block">Link Pagamento Semestral</label>
              <input
                type="url"
                value={editing.payment_link_semiannual}
                onChange={(e) => setEditing({ ...editing, payment_link_semiannual: e.target.value })}
                placeholder="https://..."
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 block">Link Pagamento Anual</label>
              <input
                type="url"
                value={editing.payment_link_annual}
                onChange={(e) => setEditing({ ...editing, payment_link_annual: e.target.value })}
                placeholder="https://..."
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                className="rounded border-neutral-600 bg-[#050505] text-white focus:ring-0"
              />
              <span className="text-xs text-neutral-300">Ativo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editing.highlight}
                onChange={(e) => setEditing({ ...editing, highlight: e.target.checked })}
                className="rounded border-neutral-600 bg-[#050505] text-white focus:ring-0"
              />
              <span className="text-xs text-neutral-300">Destacar como recomendado</span>
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={save}
              disabled={saving || !editing.name.trim() || !editing.slug.trim()}
              className="flex items-center gap-1.5 bg-white text-black rounded-lg px-4 py-2 text-xs font-medium hover:bg-neutral-200 transition-colors disabled:opacity-40"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Salvar
            </button>
            <button
              onClick={() => setEditing(null)}
              className="text-xs text-neutral-500 hover:text-white px-3 py-2 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Plans list */}
      <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500 border-b border-[#1a1a1a]">
                <th className="px-5 py-3 font-normal">Plano</th>
                <th className="px-5 py-3 font-normal">Mensal</th>
                <th className="px-5 py-3 font-normal">Semestral</th>
                <th className="px-5 py-3 font-normal">Anual</th>
                <th className="px-5 py-3 font-normal">Limites</th>
                <th className="px-5 py-3 font-normal">Status</th>
                <th className="px-5 py-3 font-normal text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-xs text-neutral-600">
                    Nenhum plano cadastrado
                  </td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p.id} className="border-b border-[#111] hover:bg-[#0d0d0d] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{p.name}</span>
                        {p.highlight && <Star size={11} className="text-amber-400 fill-amber-400" />}
                      </div>
                      <span className="text-[10px] text-neutral-600 font-mono">{p.slug}</span>
                    </td>
                    <td className="px-5 py-3 text-neutral-300 text-xs font-mono">
                      R$ {Number(p.price_monthly).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-neutral-300 text-xs font-mono">
                      R$ {Number(p.price_semiannual).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-neutral-300 text-xs font-mono">
                      R$ {Number(p.price_annual).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-neutral-400 text-xs">
                      {p.max_agents ? `${p.max_agents} agentes` : 'Ilimitado'} / {p.max_messages_month ? `${p.max_messages_month.toLocaleString('pt-BR')} msgs` : 'Ilimitado'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                        p.is_active
                          ? 'border-emerald-900/40 bg-emerald-950/30 text-emerald-400'
                          : 'border-[#1a1a1a] text-neutral-500'
                      }`}>
                        {p.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => startEdit(p)}
                          className="p-1.5 text-neutral-500 hover:text-white transition-colors rounded-md border border-[#1a1a1a] hover:border-[#2a2a2a]"
                          title="Editar"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => remove(p.id)}
                          disabled={deleting === p.id}
                          className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors rounded-md border border-[#1a1a1a] hover:border-red-900/40"
                          title="Excluir"
                        >
                          {deleting === p.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
