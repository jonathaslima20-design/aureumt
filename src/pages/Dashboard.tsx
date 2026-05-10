import { useEffect, useState } from 'react';
import { Loader2, Trash2, AlertTriangle, X } from 'lucide-react';
import { Sidebar, PageKey } from '../components/Sidebar';
import { supabase, Instance } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { evolution } from '../lib/evolution';
import { CreateAgentModal } from '../components/CreateAgentModal';
import { OverviewPage } from './user/OverviewPage';
import { AgentsPage } from './user/AgentsPage';
import { AgentDetailPage } from './user/AgentDetailPage';
import { ConnectionsPage } from './user/ConnectionsPage';
import { KnowledgePage } from './user/KnowledgePage';
import { ChatPage } from './user/ChatPage';

const STORAGE_KEY = 'auratalk:lastPage';

export function Dashboard({ onNavAdmin }: { onNavAdmin: () => void }) {
  const { profile } = useAuth();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Instance | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [linkedBaseCounts, setLinkedBaseCounts] = useState<Record<string, number>>({});

  const [page, setPage] = useState<PageKey>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as PageKey | null;
    const valid: PageKey[] = ['overview', 'agents', 'connections', 'knowledge', 'chat'];
    return saved && valid.includes(saved) ? saved : 'overview';
  });

  const [selectedAgent, setSelectedAgent] = useState<Instance | null>(null);
  const [selectedChatInstance, setSelectedChatInstance] = useState<Instance | null>(null);
  const [selectedConnectionInstance, setSelectedConnectionInstance] = useState<Instance | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, page);
  }, [page]);

  const fetchInstances = async () => {
    const { data } = await supabase
      .from('instances')
      .select('*')
      .order('created_at', { ascending: true });
    const list = data || [];
    setInstances(list);

    if (list.length > 0) {
      const { data: links } = await supabase
        .from('instance_knowledge_bases')
        .select('instance_id')
        .in('instance_id', list.map((i) => i.id));
      const counts: Record<string, number> = {};
      (links || []).forEach((l: { instance_id: string }) => {
        counts[l.instance_id] = (counts[l.instance_id] || 0) + 1;
      });
      setLinkedBaseCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  const handleCreated = (inst: Instance) => {
    setInstances((prev) => [...prev, inst]);
    setShowCreate(false);
    setSelectedAgent(inst);
    setPage('agents');
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      try { await evolution.deleteInstance(confirmDelete.id); } catch { /* ignore */ }
      await supabase.from('instances').delete().eq('id', confirmDelete.id);
      setInstances((prev) => prev.filter((i) => i.id !== confirmDelete.id));
      if (selectedAgent?.id === confirmDelete.id) setSelectedAgent(null);
      if (selectedChatInstance?.id === confirmDelete.id) setSelectedChatInstance(null);
      if (selectedConnectionInstance?.id === confirmDelete.id) setSelectedConnectionInstance(null);
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handlePageChange = (p: PageKey) => {
    setPage(p);
    setSelectedAgent(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <Loader2 size={20} className="text-neutral-600 animate-spin" />
      </div>
    );
  }

  const renderPage = () => {
    switch (page) {
      case 'overview':
        return <OverviewPage instance={instances[0] || null} />;

      case 'agents':
        if (selectedAgent) {
          return (
            <AgentDetailPage
              instance={selectedAgent}
              onBack={() => setSelectedAgent(null)}
              onUpdate={fetchInstances}
              onDelete={(inst) => setConfirmDelete(inst)}
            />
          );
        }
        return (
          <AgentsPage
            instances={instances}
            onCreateAgent={() => setShowCreate(true)}
            onSelectAgent={(inst) => setSelectedAgent(inst)}
            linkedBaseCounts={linkedBaseCounts}
          />
        );

      case 'connections':
        if (instances.length === 0) return <EmptyAgentsPrompt onCreate={() => setShowCreate(true)} />;
        if (!selectedConnectionInstance && instances.length > 0) {
          if (instances.length === 1) {
            return (
              <ConnectionsPage
                instance={instances[0]}
                onUpdate={fetchInstances}
              />
            );
          }
          return (
            <InstancePicker
              instances={instances}
              title="Conexões"
              description="Selecione um agente para gerenciar a conexão WhatsApp."
              onSelect={(inst) => setSelectedConnectionInstance(inst)}
            />
          );
        }
        return (
          <ConnectionsPage
            instance={selectedConnectionInstance || instances[0]}
            onUpdate={fetchInstances}
          />
        );

      case 'knowledge':
        return <KnowledgePage />;

      case 'chat':
        if (instances.length === 0) return <EmptyAgentsPrompt onCreate={() => setShowCreate(true)} />;
        if (!selectedChatInstance) {
          if (instances.length === 1) {
            return <ChatPage instance={instances[0]} />;
          }
          return (
            <InstancePicker
              instances={instances}
              title="Chat"
              description="Selecione um agente para ver as conversas."
              onSelect={(inst) => setSelectedChatInstance(inst)}
            />
          );
        }
        return <ChatPage instance={selectedChatInstance} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <Sidebar current={page} onChange={handlePageChange} onNavAdmin={onNavAdmin} />

      <div className="lg:pl-60">
        <main className="px-6 lg:px-10 py-8 max-w-7xl">
          {renderPage()}
        </main>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#111116] border border-[#252530] rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-950/40 border border-red-900/40 flex items-center justify-center">
                  <AlertTriangle size={16} className="text-red-400" />
                </div>
                <div>
                  <div className="text-sm text-white font-medium">Excluir agente</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Esta ação não pode ser desfeita</div>
                </div>
              </div>
              <button
                onClick={() => setConfirmDelete(null)}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-neutral-300 leading-relaxed">
              O agente{' '}
              <span className="text-white font-medium">
                {confirmDelete.display_name || confirmDelete.instance_name}
              </span>{' '}
              será removido permanentemente, junto com suas conexões e histórico de conversas.
            </p>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 border border-[#1a1a1a] text-neutral-300 hover:text-white hover:border-[#32323e] rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirmed}
                disabled={deleting}
                className="flex-1 bg-red-500/90 hover:bg-red-500 text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && profile && (
        <CreateAgentModal
          userId={profile.id}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

function EmptyAgentsPrompt({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="border border-dashed border-[#252530] rounded-xl p-16 text-center bg-[#0d0d12]">
      <p className="text-sm text-neutral-500 mb-4">Nenhum agente ainda. Crie o primeiro.</p>
      <button
        onClick={onCreate}
        className="bg-white text-black rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2 hover:bg-neutral-200 transition-colors"
      >
        Criar agente
      </button>
    </div>
  );
}

function InstancePicker({
  instances,
  title,
  description,
  onSelect,
}: {
  instances: Instance[];
  title: string;
  description: string;
  onSelect: (inst: Instance) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">{title}</h1>
        <p className="text-sm text-neutral-500 mt-1">{description}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {instances.map((inst) => (
          <button
            key={inst.id}
            onClick={() => onSelect(inst)}
            className="text-left bg-[#111116] border border-[#252530] rounded-xl p-4 hover:border-[#32323e] hover:bg-[#16161e] transition-colors flex items-center gap-3"
          >
            <div
              className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-semibold"
              style={{ background: inst.color || '#3b82f6' }}
            >
              {(inst.display_name || inst.instance_name).slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm text-white font-medium truncate">
                {inst.display_name || inst.instance_name}
              </div>
              {inst.company_name && (
                <div className="text-[11px] text-neutral-600 truncate">{inst.company_name}</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
