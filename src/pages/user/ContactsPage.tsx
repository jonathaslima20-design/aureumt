import { useEffect, useState, useMemo } from 'react';
import {
  Search, Plus, Download, Upload, Settings2, Users, Check,
  ChevronLeft, ChevronRight, Trash2, ArrowUpDown,
} from 'lucide-react';
import { supabase, Contact, ContactStage, ContactAgent, ContactLabel, Instance } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ContactDetailPanel } from './contacts/ContactDetailPanel';
import { ContactFormModal } from './contacts/ContactFormModal';
import { StageManagerModal } from './contacts/StageManagerModal';
import { ImportCSVModal } from './contacts/ImportCSVModal';
import { exportContactsCSV, ExportRow } from './contacts/csv';

type SortKey = 'name' | 'updated_at' | 'created_at';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 50;

export function ContactsPage({ instances }: { instances: Instance[] }) {
  const { profile } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stages, setStages] = useState<ContactStage[]>([]);
  const [labels, setLabels] = useState<ContactLabel[]>([]);
  const [agentMap, setAgentMap] = useState<Record<string, (ContactAgent & { instance_name: string; color: string })[]>>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [labelFilter, setLabelFilter] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStageManager, setShowStageManager] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    loadData();
  }, [profile?.id]);

  const loadData = async () => {
    if (!profile) return;
    setLoading(true);

    const [contactsRes, stagesRes, agentsRes] = await Promise.all([
      supabase.from('contacts').select('*').eq('user_id', profile.id).order('updated_at', { ascending: false }),
      supabase.from('contact_stages').select('*').eq('user_id', profile.id).order('sort_order'),
      supabase.from('contact_agents').select('*'),
    ]);

    setContacts(contactsRes.data || []);
    setStages(stagesRes.data || []);

    const aMap: Record<string, (ContactAgent & { instance_name: string; color: string })[]> = {};
    (agentsRes.data || []).forEach((a: ContactAgent) => {
      const inst = instances.find((i) => i.id === a.instance_id);
      const entry = { ...a, instance_name: inst?.display_name || inst?.instance_name || 'Agente', color: inst?.color || '#6b7280' };
      if (!aMap[a.contact_id]) aMap[a.contact_id] = [];
      aMap[a.contact_id].push(entry);
    });
    setAgentMap(aMap);

    // Load all labels for these contacts
    const instanceIds = instances.map((i) => i.id);
    if (instanceIds.length > 0) {
      const { data: labelsData } = await supabase
        .from('contact_labels')
        .select('*')
        .in('instance_id', instanceIds);
      setLabels(labelsData || []);
    }

    setLoading(false);
  };

  const labelsForContact = (customerNumber: string) =>
    labels.filter((l) => l.customer_number === customerNumber);

  const uniqueLabels = useMemo(() => {
    const set = new Set<string>();
    labels.forEach((l) => set.add(l.label));
    return Array.from(set);
  }, [labels]);

  const filtered = useMemo(() => {
    let list = [...contacts];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.display_name.toLowerCase().includes(q) ||
        c.customer_number.includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      );
    }

    if (stageFilter !== 'all') {
      if (stageFilter === 'none') {
        list = list.filter((c) => !c.stage_id);
      } else {
        list = list.filter((c) => c.stage_id === stageFilter);
      }
    }

    if (labelFilter) {
      const contactsWithLabel = new Set(
        labels.filter((l) => l.label === labelFilter).map((l) => l.customer_number)
      );
      list = list.filter((c) => contactsWithLabel.has(c.customer_number));
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = (a.display_name || a.customer_number).localeCompare(b.display_name || b.customer_number);
      } else if (sortKey === 'updated_at') {
        cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      } else {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [contacts, search, stageFilter, labelFilter, sortKey, sortDir, labels]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageContacts = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSelectAll = () => {
    if (selected.size === pageContacts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pageContacts.map((c) => c.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    await supabase.from('contacts').delete().in('id', Array.from(selected));
    setContacts((prev) => prev.filter((c) => !selected.has(c.id)));
    setSelected(new Set());
  };

  const handleBulkStage = async (stageId: string) => {
    if (selected.size === 0) return;
    await supabase.from('contacts').update({ stage_id: stageId || null, updated_at: new Date().toISOString() }).in('id', Array.from(selected));
    setContacts((prev) => prev.map((c) => selected.has(c.id) ? { ...c, stage_id: stageId || null } : c));
    setSelected(new Set());
  };

  const handleExport = () => {
    const toExport = selected.size > 0
      ? contacts.filter((c) => selected.has(c.id))
      : filtered;

    const rows: ExportRow[] = toExport.map((c) => ({
      contact: c,
      stage: stages.find((s) => s.id === c.stage_id) || null,
      labels: labelsForContact(c.customer_number),
      agents: (agentMap[c.id] || []).map((a) => ({ instance_name: a.instance_name })),
    }));

    exportContactsCSV(rows);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const formatRelative = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d`;
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent block mb-1">CRM</span>
            <h1 className="font-display font-bold text-xl tracking-tighter text-white uppercase">Contatos</h1>
          </div>
        </header>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-[#0f0f0f] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent block mb-1">CRM</span>
          <h1 className="font-display font-bold text-xl tracking-tighter text-white uppercase">Contatos</h1>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed max-w-xl">
            Gestao centralizada dos seus contatos de todos os agentes. {contacts.length} contatos no total.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-white/[0.08] rounded-lg text-neutral-400 hover:text-white hover:border-white/20 transition-colors"
          >
            <Upload size={12} /> Importar
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-white/[0.08] rounded-lg text-neutral-400 hover:text-white hover:border-white/20 transition-colors"
          >
            <Download size={12} /> Exportar
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
          >
            <Plus size={12} /> Novo Contato
          </button>
        </div>
      </header>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Buscar por nome, numero, empresa ou email..."
            className="w-full bg-[#0f0f0f] border border-white/[0.06] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-white/10 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setStageFilter('all'); setPage(0); }}
            className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap font-medium ${
              stageFilter === 'all' ? 'bg-white/10 border-white/20 text-white' : 'border-[#1c1c1c] text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Todos ({contacts.length})
          </button>
          {stages.sort((a, b) => a.sort_order - b.sort_order).map((s) => {
            const count = contacts.filter((c) => c.stage_id === s.id).length;
            return (
              <button
                key={s.id}
                onClick={() => { setStageFilter(s.id); setPage(0); }}
                className="text-[10px] px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap font-medium"
                style={stageFilter === s.id
                  ? { background: s.color + '22', color: s.color, border: `1px solid ${s.color}55` }
                  : { borderColor: '#1c1c1c', color: '#737373' }
                }
              >
                {s.name} ({count})
              </button>
            );
          })}
          <button
            onClick={() => { setStageFilter('none'); setPage(0); }}
            className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap font-medium ${
              stageFilter === 'none' ? 'bg-white/10 border-white/20 text-white' : 'border-[#1c1c1c] text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Sem estagio
          </button>
          <button
            onClick={() => setShowStageManager(true)}
            className="p-1 rounded text-neutral-600 hover:text-neutral-300 transition-colors"
            title="Gerenciar estagios"
          >
            <Settings2 size={12} />
          </button>

          {uniqueLabels.length > 0 && (
            <>
              <span className="w-px h-4 bg-white/[0.06] mx-1" />
              <select
                value={labelFilter}
                onChange={(e) => { setLabelFilter(e.target.value); setPage(0); }}
                className="text-[10px] bg-[#0f0f0f] border border-[#1c1c1c] rounded px-2 py-1 text-neutral-400 outline-none"
              >
                <option value="">Todas etiquetas</option>
                {uniqueLabels.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-[#0f0f0f] border border-white/[0.06] rounded-lg px-4 py-2.5 animate-fade-in">
          <span className="text-xs text-neutral-300">{selected.size} selecionado(s)</span>
          <span className="w-px h-4 bg-white/[0.06]" />
          <select
            onChange={(e) => { if (e.target.value) handleBulkStage(e.target.value); e.target.value = ''; }}
            className="text-[10px] bg-transparent border border-white/10 rounded px-2 py-1 text-neutral-400 outline-none"
          >
            <option value="">Alterar estagio...</option>
            <option value="__none__">Sem estagio</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            onClick={handleExport}
            className="text-[10px] px-2 py-1 border border-white/10 rounded text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <Download size={10} /> Exportar
          </button>
          <button
            onClick={handleBulkDelete}
            className="text-[10px] px-2 py-1 border border-red-900/30 rounded text-red-400 hover:bg-red-950/30 transition-colors flex items-center gap-1 ml-auto"
          >
            <Trash2 size={10} /> Excluir
          </button>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users size={36} className="mx-auto text-neutral-700 mb-3" />
          <p className="text-sm text-neutral-500 mb-1">
            {contacts.length === 0 ? 'Nenhum contato ainda' : 'Nenhum contato encontrado'}
          </p>
          <p className="text-xs text-neutral-600">
            {contacts.length === 0
              ? 'Seus contatos aparecerao automaticamente quando receberem mensagens, ou importe um CSV.'
              : 'Tente ajustar os filtros ou termo de busca.'}
          </p>
        </div>
      ) : (
        <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[40px_1fr_120px_100px_140px_80px] gap-2 px-4 py-2.5 border-b border-white/[0.06] text-[10px] text-neutral-500 uppercase font-mono tracking-wide items-center">
            <div>
              <button
                onClick={handleSelectAll}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  selected.size === pageContacts.length && pageContacts.length > 0
                    ? 'bg-accent border-accent text-white'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {selected.size === pageContacts.length && pageContacts.length > 0 && <Check size={10} />}
              </button>
            </div>
            <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-white transition-colors text-left">
              Contato <ArrowUpDown size={9} />
            </button>
            <span>Estagio</span>
            <span>Etiquetas</span>
            <span>Agentes</span>
            <button onClick={() => handleSort('updated_at')} className="flex items-center gap-1 hover:text-white transition-colors">
              Atividade <ArrowUpDown size={9} />
            </button>
          </div>

          {/* Rows */}
          {pageContacts.map((c) => {
            const stage = stages.find((s) => s.id === c.stage_id);
            const cLabels = labelsForContact(c.customer_number);
            const cAgents = agentMap[c.id] || [];
            const isSelected = selected.has(c.id);

            return (
              <div
                key={c.id}
                onClick={() => setDetailContact(c)}
                className={`grid grid-cols-[40px_1fr_120px_100px_140px_80px] gap-2 px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors items-center ${
                  isSelected ? 'bg-white/[0.03]' : ''
                }`}
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleToggleSelect(c.id)}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-accent border-accent text-white' : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    {isSelected && <Check size={10} />}
                  </button>
                </div>

                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 text-xs font-medium text-neutral-400">
                    {(c.display_name || c.customer_number).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-white truncate font-medium">
                      {c.display_name || c.customer_number}
                    </p>
                    <p className="text-[10px] text-neutral-600 truncate">
                      {c.display_name ? c.customer_number : ''}{c.company ? ` - ${c.company}` : ''}
                    </p>
                  </div>
                </div>

                <div>
                  {stage ? (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium inline-block"
                      style={{ background: stage.color + '22', color: stage.color, border: `1px solid ${stage.color}44` }}
                    >
                      {stage.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-700">-</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-0.5">
                  {cLabels.slice(0, 2).map((l) => (
                    <span
                      key={l.id}
                      className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{ background: l.color + '18', color: l.color }}
                    >
                      {l.label}
                    </span>
                  ))}
                  {cLabels.length > 2 && (
                    <span className="text-[9px] text-neutral-600">+{cLabels.length - 2}</span>
                  )}
                </div>

                <div className="flex items-center gap-0.5">
                  {cAgents.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-[#0a0a0a]"
                      style={{ backgroundColor: a.color }}
                      title={a.instance_name}
                    >
                      {a.instance_name.slice(0, 1).toUpperCase()}
                    </div>
                  ))}
                  {cAgents.length > 3 && (
                    <span className="text-[9px] text-neutral-600 ml-0.5">+{cAgents.length - 3}</span>
                  )}
                  {cAgents.length === 0 && <span className="text-[9px] text-neutral-700">-</span>}
                </div>

                <div className="text-[10px] text-neutral-500">
                  {formatRelative(c.updated_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-neutral-600">
            {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded border border-white/[0.06] text-neutral-500 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={12} />
            </button>
            <span className="text-[10px] text-neutral-500 px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded border border-white/[0.06] text-neutral-500 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {detailContact && (
        <ContactDetailPanel
          contact={detailContact}
          stages={stages}
          instances={instances}
          onClose={() => setDetailContact(null)}
          onUpdate={() => loadData()}
        />
      )}

      {showCreateModal && (
        <ContactFormModal
          stages={stages}
          onClose={() => setShowCreateModal(false)}
          onSaved={() => loadData()}
        />
      )}

      {showStageManager && (
        <StageManagerModal
          stages={stages}
          onClose={() => setShowStageManager(false)}
          onUpdate={() => loadData()}
        />
      )}

      {showImport && (
        <ImportCSVModal
          stages={stages}
          onClose={() => setShowImport(false)}
          onDone={() => loadData()}
        />
      )}
    </div>
  );
}
