import { useEffect, useState } from 'react';
import { Plus, Loader2, Trash2, AlertTriangle, X } from 'lucide-react';
import { Sidebar, PageKey } from '../components/Sidebar';
import { supabase, Instance } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { evolution } from '../lib/evolution';
import { AgentAvatar } from '../components/AgentAvatar';
import { CreateAgentModal } from '../components/CreateAgentModal';
import { OverviewPage } from './user/OverviewPage';
import { ConnectionsPage } from './user/ConnectionsPage';
import { SettingsPage } from './user/SettingsPage';
import { KnowledgePage } from './user/KnowledgePage';
import { MonitorPage } from './user/MonitorPage';
import { ConversationsPage } from './user/ConversationsPage';
import { ProfilePage } from './user/ProfilePage';

const STORAGE_KEY = 'auratalk:lastPage';
const STORAGE_INSTANCE = 'auratalk:lastInstance';

export function Dashboard({ onNavAdmin }: { onNavAdmin: () => void }) {
  const { profile } = useAuth();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Instance | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState<PageKey>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as PageKey | null;
    return saved || 'overview';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, page);
  }, [page]);

  useEffect(() => {
    if (selectedId) localStorage.setItem(STORAGE_INSTANCE, selectedId);
  }, [selectedId]);

  const fetchInstances = async () => {
    const { data } = await supabase
      .from('instances')
      .select('*')
      .order('created_at', { ascending: true });
    const list = data || [];
    setInstances(list);
    if (!selectedId && list.length > 0) {
      const saved = localStorage.getItem(STORAGE_INSTANCE);
      const match = list.find((i) => i.id === saved);
      setSelectedId(match ? match.id : list[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  const handleCreated = (inst: Instance) => {
    setInstances((prev) => [...prev, inst]);
    setSelectedId(inst.id);
    setShowCreate(false);
  };

  const deleteInstance = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      try {
        await evolution.deleteInstance(confirmDelete.id);
      } catch {
        /* evolution pode falhar se nunca criada; seguir com remoção local */
      }
      await supabase.from('instances').delete().eq('id', confirmDelete.id);
      const remaining = instances.filter((i) => i.id !== confirmDelete.id);
      setInstances(remaining);
      if (selectedId === confirmDelete.id) {
        setSelectedId(remaining[0]?.id || null);
      }
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const selected = instances.find((i) => i.id === selectedId) || null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <Loader2 size={20} className="text-neutral-600 animate-spin" />
      </div>
    );
  }

  const renderPage = () => {
    if (!selected) return null;
    switch (page) {
      case 'overview':
        return <OverviewPage instance={selected} />;
      case 'profile':
        return <ProfilePage instance={selected} onUpdate={fetchInstances} />;
      case 'connections':
        return <ConnectionsPage instance={selected} onUpdate={fetchInstances} />;
      case 'settings':
        return <SettingsPage instance={selected} onUpdate={fetchInstances} />;
      case 'knowledge':
        return <KnowledgePage instance={selected} />;
      case 'monitor':
        return <MonitorPage instance={selected} />;
      case 'conversations':
        return <ConversationsPage instance={selected} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <Sidebar current={page} onChange={setPage} onNavAdmin={onNavAdmin} />

      <div className="lg:pl-60">
        {instances.length > 0 && (
          <div className="sticky top-0 z-10 bg-[#050505]/90 backdrop-blur-xl border-b border-[#1a1a1a]">
            <div className="px-6 lg:px-10 py-3 flex items-center gap-3 justify-end lg:justify-between">
              <div className="hidden lg:flex items-center gap-2 overflow-x-auto scrollbar-thin">
                {instances.map((inst) => (
                  <button
                    key={inst.id}
                    onClick={() => setSelectedId(inst.id)}
                    className={`pl-1 pr-3 py-1 rounded-full text-xs whitespace-nowrap border flex items-center gap-2 transition-colors ${
                      selectedId === inst.id
                        ? 'bg-white text-black border-white'
                        : 'border-[#1a1a1a] text-neutral-400 hover:text-white hover:border-[#262626]'
                    }`}
                  >
                    <AgentAvatar
                      name={inst.display_name || inst.instance_name}
                      url={inst.avatar_url}
                      color={inst.color}
                      size={22}
                    />
                    {inst.display_name || inst.instance_name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selected && (
                  <button
                    onClick={() => setConfirmDelete(selected)}
                    className="text-neutral-500 hover:text-red-400 border border-[#1a1a1a] hover:border-red-900/60 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
                    title="Excluir agente selecionado"
                  >
                    <Trash2 size={12} />
                    Excluir
                  </button>
                )}
                <button
                  onClick={() => setShowCreate(true)}
                  className="bg-white text-black rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-2 hover:bg-neutral-200 transition-colors"
                >
                  <Plus size={12} />
                  Novo agente
                </button>
              </div>
            </div>
            <div className="lg:hidden px-6 pb-3 flex gap-2 overflow-x-auto scrollbar-thin items-center">
              {instances.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => setSelectedId(inst.id)}
                  className={`pl-1 pr-3 py-1 rounded-full text-xs whitespace-nowrap border flex items-center gap-2 transition-colors ${
                    selectedId === inst.id
                      ? 'bg-white text-black border-white'
                      : 'border-[#1a1a1a] text-neutral-400 hover:text-white hover:border-[#262626]'
                  }`}
                >
                  <AgentAvatar
                    name={inst.display_name || inst.instance_name}
                    url={inst.avatar_url}
                    color={inst.color}
                    size={20}
                  />
                  {inst.display_name || inst.instance_name}
                </button>
              ))}
              {selected && (
                <button
                  onClick={() => setConfirmDelete(selected)}
                  className="shrink-0 text-neutral-500 hover:text-red-400 border border-[#1a1a1a] hover:border-red-900/60 rounded-md p-1.5 transition-colors"
                  title="Excluir agente selecionado"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        <main className="px-6 lg:px-10 py-8 max-w-7xl">
          {instances.length === 0 ? (
            <div className="border border-dashed border-[#1a1a1a] rounded-xl p-16 text-center">
              <p className="text-sm text-neutral-500 mb-4">Nenhum agente ainda. Crie o primeiro.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="bg-white text-black rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2 hover:bg-neutral-200 transition-colors"
              >
                <Plus size={14} /> Criar agente
              </button>
            </div>
          ) : (
            renderPage()
          )}
        </main>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full">
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
              O agente <span className="text-white font-medium">{confirmDelete.display_name || confirmDelete.instance_name}</span> será removido permanentemente, junto com suas conexões e histórico de conversas.
            </p>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 border border-[#1a1a1a] text-neutral-300 hover:text-white hover:border-[#262626] rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={deleteInstance}
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
