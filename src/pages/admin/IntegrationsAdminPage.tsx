import { useEffect, useState } from 'react';
import {
  Plus, Loader2, Pencil, Trash2, Puzzle, X, Save, Users,
  ToggleLeft, ToggleRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Integration = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_url: string | null;
  category: string;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
};

const CATEGORY_OPTIONS = ['ERP', 'Marketplace', 'E-commerce', 'CRM', 'Logistica', 'Financeiro', 'Marketing', 'Outros'];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function IntegrationsAdminPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Integration | null>(null);

  const fetchData = async () => {
    const [intRes, ucRes] = await Promise.all([
      supabase.from('integrations').select('*').order('sort_order'),
      supabase.from('user_integrations').select('integration_id'),
    ]);
    setIntegrations(intRes.data || []);
    const counts: Record<string, number> = {};
    (ucRes.data || []).forEach((r: { integration_id: string }) => {
      counts[r.integration_id] = (counts[r.integration_id] || 0) + 1;
    });
    setUserCounts(counts);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggle = async (integration: Integration) => {
    await supabase
      .from('integrations')
      .update({ is_enabled: !integration.is_enabled, updated_at: new Date().toISOString() })
      .eq('id', integration.id);
    fetchData();
  };

  const handleDelete = async (integration: Integration) => {
    if (!confirm(`Excluir a integracao "${integration.name}"? Esta acao e irreversivel.`)) return;
    await supabase.from('integrations').delete().eq('id', integration.id);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={20} className="animate-spin text-neutral-600" />
      </div>
    );
  }

  const enabledCount = integrations.filter((i) => i.is_enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent block mb-1">CONFIGURACAO</span>
        <h1 className="font-display font-bold text-xl tracking-tighter text-white uppercase">Integracoes</h1>
        <p className="text-sm text-neutral-500 mt-1">Controle quais integracoes ficam visiveis para os usuarios.</p>
      </header>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="glass rounded-xl px-4 py-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Total</div>
          <div className="text-lg font-display font-bold text-white">{integrations.length}</div>
        </div>
        <div className="glass rounded-xl px-4 py-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Ativas</div>
          <div className="text-lg font-display font-bold text-emerald-400">{enabledCount}</div>
        </div>
        <div className="glass rounded-xl px-4 py-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Inativas</div>
          <div className="text-lg font-display font-bold text-neutral-500">{integrations.length - enabledCount}</div>
        </div>
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-accent text-white rounded-lg px-4 py-2 text-xs font-display font-semibold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(255,59,0,0.25)] hover:shadow-[0_0_30px_rgba(255,59,0,0.4)] transition-all"
        >
          <Plus size={13} /> Nova integracao
        </button>
      </div>

      {/* Integrations list */}
      {integrations.length === 0 ? (
        <div className="border border-dashed border-[#242424] rounded-xl p-12 text-center bg-[#0d0d0d]">
          <p className="text-sm text-neutral-400">Nenhuma integracao cadastrada</p>
          <p className="text-xs text-neutral-600 mt-1">Adicione integracoes para que os usuarios possam ve-las.</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-neutral-500">Integracao</th>
                <th className="text-center px-3 py-3 text-[10px] font-mono uppercase tracking-wider text-neutral-500">Categoria</th>
                <th className="text-center px-3 py-3 text-[10px] font-mono uppercase tracking-wider text-neutral-500">Usuarios</th>
                <th className="text-center px-3 py-3 text-[10px] font-mono uppercase tracking-wider text-neutral-500">Status</th>
                <th className="text-right px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-neutral-500">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((integration) => (
                <tr key={integration.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#242424] flex items-center justify-center overflow-hidden">
                        {integration.icon_url ? (
                          <img src={integration.icon_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Puzzle size={14} className="text-neutral-600" />
                        )}
                      </div>
                      <div>
                        <div className="text-white font-medium text-xs">{integration.name}</div>
                        <div className="text-neutral-600 text-[10px] font-mono">{integration.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                      {integration.category}
                    </span>
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className="flex items-center justify-center gap-1 text-xs text-neutral-400">
                      <Users size={10} /> {userCounts[integration.id] || 0}
                    </span>
                  </td>
                  <td className="text-center px-3 py-3">
                    <button
                      onClick={() => handleToggle(integration)}
                      className="inline-flex items-center gap-1.5 transition-colors"
                      title={integration.is_enabled ? 'Desativar' : 'Ativar'}
                    >
                      {integration.is_enabled ? (
                        <ToggleRight size={20} className="text-emerald-400" />
                      ) : (
                        <ToggleLeft size={20} className="text-neutral-600" />
                      )}
                      <span className={`text-[9px] uppercase tracking-wider font-mono ${
                        integration.is_enabled ? 'text-emerald-400' : 'text-neutral-600'
                      }`}>
                        {integration.is_enabled ? 'Ativa' : 'Inativa'}
                      </span>
                    </button>
                  </td>
                  <td className="text-right px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => { setEditing(integration); setShowForm(true); }}
                        className="p-1.5 text-neutral-600 hover:text-white transition-colors"
                        title="Editar"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(integration)}
                        className="p-1.5 text-neutral-600 hover:text-red-400 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <IntegrationFormModal
          integration={editing}
          nextOrder={integrations.length}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}

/* ─── Form Modal ─── */
function IntegrationFormModal({
  integration,
  nextOrder,
  onClose,
  onSaved,
}: {
  integration: Integration | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(integration?.name || '');
  const [slug, setSlug] = useState(integration?.slug || '');
  const [description, setDescription] = useState(integration?.description || '');
  const [iconUrl, setIconUrl] = useState(integration?.icon_url || '');
  const [category, setCategory] = useState(integration?.category || 'Outros');
  const [isEnabled, setIsEnabled] = useState(integration?.is_enabled || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const data = {
      name: name.trim(),
      slug: slug.trim() || slugify(name),
      description: description.trim(),
      icon_url: iconUrl.trim() || null,
      category,
      is_enabled: isEnabled,
      updated_at: new Date().toISOString(),
    };

    if (integration) {
      await supabase.from('integrations').update(data).eq('id', integration.id);
    } else {
      await supabase.from('integrations').insert({ ...data, sort_order: nextOrder });
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="glass rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-display font-bold text-white uppercase">
            {integration ? 'Editar Integracao' : 'Nova Integracao'}
          </h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Nome</label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); if (!integration) setSlug(slugify(e.target.value)); }}
              className="w-full px-3 py-2.5 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] text-sm text-white focus:outline-none focus:border-accent/40"
              placeholder="Ex: Bling"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] text-sm text-neutral-400 font-mono focus:outline-none focus:border-accent/40"
              placeholder="bling"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Descricao</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] text-sm text-white focus:outline-none focus:border-accent/40 resize-none"
              placeholder="Breve descricao sobre a integracao..."
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">URL do Icone/Logo</label>
            <input
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] text-sm text-white focus:outline-none focus:border-accent/40"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] text-sm text-white focus:outline-none"
            >
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="accent-accent w-3.5 h-3.5"
            />
            <span className="text-xs text-neutral-300">Ativar para usuarios</span>
          </label>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 border border-[#1e1e1e] text-neutral-300 hover:text-white rounded-lg py-2.5 text-sm transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 bg-accent text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
