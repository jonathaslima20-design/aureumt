import { useEffect, useState } from 'react';
import { Loader2, Trash2, AlertTriangle, X } from 'lucide-react';
import { Sidebar, PageKey } from '../components/Sidebar';
import { supabase, Instance } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CreateAgentModal } from '../components/CreateAgentModal';
import { PlansModal } from '../components/PlansModal';
import { AgentAvatar } from '../components/AgentAvatar';
import { OverviewPage } from './user/OverviewPage';
import { AgentsPage } from './user/AgentsPage';
import { AgentDetailPage } from './user/AgentDetailPage';
import { ConnectionsPage } from './user/ConnectionsPage';
import { KnowledgePage } from './user/KnowledgePage';
import { ChatPage } from './user/ChatPage';
import { TemplateGalleryPage } from './user/TemplateGalleryPage';
import { AgentTrainingPage } from './user/AgentTrainingPage';
import { ProfilePage } from './user/ProfilePage';
import { HelpCenterPage } from './user/HelpCenterPage';
import { fetchUserPlanLimits, canCreateAgent, PlanLimits } from '../lib/planLimits';

const STORAGE_KEY = 'auratalk:lastPage';

export function Dashboard({ onNavAdmin }: { onNavAdmin: () => void }) {
  const { profile } = useAuth();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Instance | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [linkedBaseCounts, setLinkedBaseCounts] = useState<Record<string, number>>({});
  const [personaMap, setPersonaMap] = useState<Record<string, boolean>>({});
  const [exampleCounts, setExampleCounts] = useState<Record<string, number>>({});
  const [connectionCounts, setConnectionCounts] = useState<Record<string, number>>({});
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);

  const [page, setPage] = useState<PageKey>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as PageKey | null;
    const valid: PageKey[] = ['overview', 'agents', 'connections', 'knowledge', 'training', 'chat', 'help', 'profile'];
    return saved && valid.includes(saved) ? saved : 'overview';
  });

  const [selectedAgent, setSelectedAgent] = useState<Instance | null>(null);
  const [openTestOnLoad, setOpenTestOnLoad] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedChatInstance, setSelectedChatInstance] = useState<Instance | null>(null);

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
      const ids = list.map((i) => i.id);
      const [{ data: links }, { data: personas }, { data: examples }, { data: conns }] = await Promise.all([
        supabase.from('instance_knowledge_bases').select('instance_id').in('instance_id', ids),
        supabase.from('agent_personas').select('instance_id').in('instance_id', ids),
        supabase.from('human_examples').select('instance_id').in('instance_id', ids).eq('is_active', true),
        supabase.from('whatsapp_connections').select('agent_id, status').in('agent_id', ids),
      ]);
      const counts: Record<string, number> = {};
      (links || []).forEach((l: { instance_id: string }) => {
        counts[l.instance_id] = (counts[l.instance_id] || 0) + 1;
      });
      setLinkedBaseCounts(counts);

      const pmap: Record<string, boolean> = {};
      (personas || []).forEach((p: { instance_id: string }) => { pmap[p.instance_id] = true; });
      setPersonaMap(pmap);

      const ecounts: Record<string, number> = {};
      (examples || []).forEach((e: { instance_id: string }) => {
        ecounts[e.instance_id] = (ecounts[e.instance_id] || 0) + 1;
      });
      setExampleCounts(ecounts);

      const ccounts: Record<string, number> = {};
      (conns || []).forEach((c: { agent_id: string | null; status: string | null }) => {
        if (c.agent_id && c.status === 'open') {
          ccounts[c.agent_id] = (ccounts[c.agent_id] || 0) + 1;
        }
      });
      setConnectionCounts(ccounts);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  useEffect(() => {
    if (!profile) return;
    fetchUserPlanLimits(profile.plan_id).then(setPlanLimits);
  }, [profile?.plan_id]);

  const handleCreated = (inst: Instance) => {
    setInstances((prev) => [...prev, inst]);
    setShowCreate(false);
    setSelectedAgent(inst);
    setPage('agents');
  };

  const agentLimitReached = planLimits ? !canCreateAgent(instances.length, planLimits.max_agents) : false;

  const handleCreateAgent = () => {
    if (agentLimitReached) {
      setShowPlans(true);
      return;
    }
    setShowCreate(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await supabase.from('instances').delete().eq('id', confirmDelete.id);
      setInstances((prev) => prev.filter((i) => i.id !== confirmDelete.id));
      if (selectedAgent?.id === confirmDelete.id) setSelectedAgent(null);
      if (selectedChatInstance?.id === confirmDelete.id) setSelectedChatInstance(null);
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handlePageChange = (p: PageKey) => {
    setPage(p);
    setSelectedAgent(null);
    setShowTemplates(false);
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
              onBack={() => { setSelectedAgent(null); setOpenTestOnLoad(false); }}
              onUpdate={fetchInstances}
              onDelete={(inst) => setConfirmDelete(inst)}
              instances={instances}
              readiness={{
                hasKnowledge: (linkedBaseCounts[selectedAgent.id] ?? 0) > 0,
                hasPersona: !!personaMap[selectedAgent.id],
                exampleCount: exampleCounts[selectedAgent.id] ?? 0,
                hasConnection: (connectionCounts[selectedAgent.id] ?? 0) > 0,
              }}
              openTestOnLoad={openTestOnLoad}
            />
          );
        }
        if (showTemplates) {
          return (
            <TemplateGalleryPage
              onBack={() => setShowTemplates(false)}
              onAgentCreated={(inst) => {
                setInstances((prev) => [...prev, inst]);
                setSelectedAgent(inst);
                setShowTemplates(false);
              }}
            />
          );
        }
        return (
          <AgentsPage
            instances={instances}
            onCreateAgent={handleCreateAgent}
            onSelectAgent={(inst) => setSelectedAgent(inst)}
            onTestAgent={(inst) => { setSelectedAgent(inst); setOpenTestOnLoad(true); }}
            onOpenTemplates={() => setShowTemplates(true)}
            onInstanceUpdate={(updated) => setInstances((prev) => prev.map((i) => i.id === updated.id ? updated : i))}
            linkedBaseCounts={linkedBaseCounts}
            personaMap={personaMap}
            exampleCounts={exampleCounts}
            connectionCounts={connectionCounts}
          />
        );

      case 'connections':
        return (
          <ConnectionsPage
            instances={instances}
            onUpdate={fetchInstances}
          />
        );

      case 'knowledge':
        return <KnowledgePage />;

      case 'training':
        return <AgentTrainingPage instances={instances} />;

      case 'chat':
        if (instances.length === 0) return <EmptyAgentsPrompt onCreate={handleCreateAgent} />;
        if (!selectedChatInstance) {
          if (instances.length === 1) {
            return <ChatPage instance={instances[0]} instances={instances} />;
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
        return (
          <ChatPage
            instance={selectedChatInstance}
            instances={instances}
            onBack={instances.length > 1 ? () => setSelectedChatInstance(null) : undefined}
          />
        );

      case 'help':
        return <HelpCenterPage />;

      case 'profile':
        return <ProfilePage onOpenPlans={() => setShowPlans(true)} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <Sidebar current={page} onChange={handlePageChange} onNavAdmin={onNavAdmin} />

      <div className="lg:pl-60">
        <main className="px-4 sm:px-6 lg:px-10 py-6 pt-16 lg:pt-8 max-w-7xl mx-auto">
          {renderPage()}
        </main>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass rounded-2xl p-6 max-w-sm w-full">
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
              será removido permanentemente. As conexões WhatsApp vinculadas serão desvinculadas mas não excluídas.
            </p>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 border border-[#1a1a1a] text-neutral-300 hover:text-white hover:border-[#2e2e2e] rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
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

      {showPlans && <PlansModal onClose={() => setShowPlans(false)} />}
    </div>
  );
}

function EmptyAgentsPrompt({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="glass rounded-2xl border-dashed p-16 text-center">
      <p className="text-sm text-neutral-500 mb-4">Nenhum agente ainda. Crie o primeiro.</p>
      <button
        onClick={onCreate}
        className="bg-accent text-white rounded-lg px-6 py-3 text-sm font-display font-semibold uppercase tracking-wider inline-flex items-center gap-2 shadow-[0_0_20px_rgba(255,59,0,0.25)] hover:shadow-[0_0_30px_rgba(255,59,0,0.4)] transition-all"
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
        <h1 className="font-display font-bold text-xl tracking-tighter text-white uppercase">{title}</h1>
        <p className="text-sm text-neutral-500 mt-1">{description}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {instances.map((inst) => (
          <button
            key={inst.id}
            onClick={() => onSelect(inst)}
            className="text-left glass rounded-2xl p-4 hover:border-white/10 transition-colors flex items-center gap-3"
          >
            <AgentAvatar
              name={inst.display_name || inst.instance_name}
              url={inst.avatar_url || undefined}
              color={inst.color || '#3b82f6'}
              size={36}
              ring
            />
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
