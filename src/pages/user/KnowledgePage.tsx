import { useEffect, useState, useRef } from 'react';
import { Database, UploadCloud, Link, Mic, MicOff, Trash2, Loader2, FileText, Globe, AudioLines, Plus, X, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, Users, Save, File as FileEdit } from 'lucide-react';
import { supabase, KnowledgeBase, KnowledgeSource, KnowledgeSourceHistory } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { fetchUserPlanLimits, canCreateKnowledgeBase } from '../../lib/planLimits';

type FeedbackState = { type: 'success' | 'error'; msg: string } | null;
type KBTab = 'sources' | 'upload' | 'url' | 'audio';

export function KnowledgePage() {
  const { profile } = useAuth();
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBase, setSelectedBase] = useState<KnowledgeBase | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [lastAdded, setLastAdded] = useState<Record<string, string>>({});
  const [agentCounts, setAgentCounts] = useState<Record<string, number>>({});
  const [charCounts, setCharCounts] = useState<Record<string, number>>({});

  const fetchBases = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('knowledge_bases')
      .select('*')
      .order('created_at', { ascending: false });
    const list = data || [];
    setBases(list);

    if (list.length > 0) {
      const ids = list.map((b) => b.id);

      const { data: consolidated } = await supabase
        .from('knowledge_sources')
        .select('knowledge_base_id, metadata, created_at')
        .in('knowledge_base_id', ids)
        .eq('type', 'consolidated');

      const lastMap: Record<string, string> = {};
      const charMap: Record<string, number> = {};
      (consolidated || []).forEach((r: { knowledge_base_id: string; metadata: Record<string, unknown>; created_at: string }) => {
        lastMap[r.knowledge_base_id] = r.created_at;
        charMap[r.knowledge_base_id] = (r.metadata?.char_count as number) || 0;
      });
      setLastAdded(lastMap);
      setCharCounts(charMap);

      const { data: links } = await supabase
        .from('instance_knowledge_bases')
        .select('knowledge_base_id')
        .in('knowledge_base_id', ids);
      const agentMap: Record<string, number> = {};
      (links || []).forEach((r: { knowledge_base_id: string }) => {
        agentMap[r.knowledge_base_id] = (agentMap[r.knowledge_base_id] || 0) + 1;
      });
      setAgentCounts(agentMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBases();
  }, []);

  const [createError, setCreateError] = useState('');

  const createBase = async () => {
    if (!newName.trim() || !profile) return;
    setCreating(true);
    setCreateError('');

    const limits = await fetchUserPlanLimits(profile.plan_id);
    if (!canCreateKnowledgeBase(bases.length, limits.max_knowledge_bases)) {
      setCreateError(`Limite de ${limits.max_knowledge_bases} base(s) atingido no plano ${limits.plan_name}. Faça upgrade.`);
      setCreating(false);
      return;
    }

    const { data } = await supabase
      .from('knowledge_bases')
      .insert({ user_id: profile.id, name: newName.trim(), description: newDesc.trim() })
      .select()
      .maybeSingle();
    if (data) {
      setBases((prev) => [data as KnowledgeBase, ...prev]);
      setSelectedBase(data as KnowledgeBase);
    }
    setNewName('');
    setNewDesc('');
    setShowCreate(false);
    setCreating(false);
  };

  const deleteBase = async (base: KnowledgeBase) => {
    await supabase.from('knowledge_bases').delete().eq('id', base.id);
    setBases((prev) => prev.filter((b) => b.id !== base.id));
    if (selectedBase?.id === base.id) setSelectedBase(null);
  };

  if (selectedBase) {
    return (
      <KnowledgeBaseDetail
        base={selectedBase}
        onBack={() => { setSelectedBase(null); fetchBases(); }}
        onDelete={() => deleteBase(selectedBase)}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Base de Conhecimento</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Organize o conhecimento em bases independentes.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-white text-black rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium flex items-center gap-2 hover:bg-neutral-200 transition-colors"
        >
          <Plus size={14} /> Nova base
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin text-neutral-600" />
        </div>
      ) : bases.length === 0 ? (
        <div className="border border-dashed border-[#242424] rounded-xl p-16 text-center bg-[#0d0d0d]">
          <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-[#242424] flex items-center justify-center mx-auto mb-4">
            <Database size={24} className="text-neutral-600" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-neutral-400 mb-1">Nenhuma base criada ainda</p>
          <p className="text-xs text-neutral-600 mb-6">
            Crie bases separadas para cada negócio e vincule-as a um ou mais agentes.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-white text-black rounded-lg px-4 py-2.5 text-sm font-medium inline-flex items-center gap-2 hover:bg-neutral-200 transition-colors"
          >
            <Plus size={14} /> Nova base
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {bases.map((base) => (
            <button
              key={base.id}
              onClick={() => setSelectedBase(base)}
              className="group text-left bg-[#141414] border border-[#242424] rounded-2xl p-4 sm:p-5 transition-all duration-300 flex flex-col gap-3 aura-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#141414] border border-[#242424] flex items-center justify-center shrink-0">
                  <Database size={15} className="text-neutral-400" />
                </div>
                <div className="flex items-center gap-1.5">
                  {agentCounts[base.id] > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 rounded-full px-2 py-0.5">
                      <Users size={9} />
                      {agentCounts[base.id]}
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteBase(base); }}
                    className="text-neutral-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                    title="Excluir base"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-white">{base.name}</div>
                {base.description && (
                  <div className="text-[11px] text-neutral-500 mt-1 line-clamp-2">{base.description}</div>
                )}
              </div>
              <div className="mt-auto flex items-center justify-between text-[11px] text-neutral-600">
                <span>
                  {charCounts[base.id]
                    ? `${charCounts[base.id].toLocaleString('pt-BR')} caracteres`
                    : 'Sem conteúdo'}
                </span>
                <span>
                  {lastAdded[base.id]
                    ? `Atualizada ${new Date(lastAdded[base.id]).toLocaleDateString('pt-BR')}`
                    : new Date(base.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#242424] rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#242424]">
              <span className="text-sm text-white font-medium">Nova base de conhecimento</span>
              <button
                onClick={() => { setShowCreate(false); setNewName(''); setNewDesc(''); }}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Nome</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Loja Principal, Clínica Norte..."
                  className="w-full bg-[#141414] border border-[#242424] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#363636] outline-none"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') createBase(); }}
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Descrição (opcional)</label>
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Breve descrição do negócio ou contexto"
                  className="w-full bg-[#141414] border border-[#242424] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#363636] outline-none"
                />
              </div>
              {createError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{createError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setShowCreate(false); setNewName(''); setNewDesc(''); setCreateError(''); }}
                  className="flex-1 border border-[#242424] text-neutral-400 hover:text-white rounded-lg py-2.5 text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={createBase}
                  disabled={creating || !newName.trim()}
                  className="flex-1 bg-white text-black rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                  {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Criar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeBaseDetail
// ─────────────────────────────────────────────────────────────────────────────

function KnowledgeBaseDetail({
  base,
  onBack,
  onDelete,
}: {
  base: KnowledgeBase;
  onBack: () => void;
  onDelete: () => void;
}) {
  const [consolidatedSource, setConsolidatedSource] = useState<KnowledgeSource | null>(null);
  const [history, setHistory] = useState<KnowledgeSourceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<KBTab>('sources');
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: sources }, { data: hist }] = await Promise.all([
      supabase
        .from('knowledge_sources')
        .select('*')
        .eq('knowledge_base_id', base.id)
        .eq('type', 'consolidated')
        .maybeSingle(),
      supabase
        .from('knowledge_source_history')
        .select('*')
        .eq('knowledge_base_id', base.id)
        .order('created_at', { ascending: false }),
    ]);
    setConsolidatedSource(sources as KnowledgeSource | null);
    setHistory(hist || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [base.id]);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleDone = () => {
    fetchData();
    showFeedback('success', 'Conteúdo adicionado à Fonte de Conhecimento');
  };

  const updateConsolidatedContent = async (newContent: string) => {
    if (!consolidatedSource) return;
    const { error } = await supabase
      .from('knowledge_sources')
      .update({ content: newContent, metadata: { char_count: newContent.length } })
      .eq('id', consolidatedSource.id);
    if (error) throw new Error(error.message);
    setConsolidatedSource((prev) => prev ? { ...prev, content: newContent, metadata: { char_count: newContent.length } } : prev);
  };

  const removeHistoryEntry = async (entry: KnowledgeSourceHistory) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/knowledge?action=remove_history_entry`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ history_id: entry.id, knowledge_base_id: base.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao remover');
      showFeedback('success', 'Contribuição removida e fonte reconstruída');
      fetchData();
    } catch (e) {
      showFeedback('error', e instanceof Error ? e.message : 'Erro ao remover');
    }
  };

  const reprocessUrl = async (entry: KnowledgeSourceHistory) => {
    const sourceUrl = entry.metadata?.url as string;
    if (!sourceUrl) return;
    showFeedback('success', 'Reprocessando URL...');
    try {
      // Remove old entry first, then re-scrape
      await removeHistoryEntry(entry);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/knowledge?action=scrape_url`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledge_base_id: base.id, source_url: sourceUrl, title: entry.title }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao reprocessar');
      showFeedback('success', 'URL reprocessada com sucesso');
      fetchData();
    } catch (e) {
      showFeedback('error', e instanceof Error ? e.message : 'Erro ao reprocessar');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-neutral-500 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={14} /> Base de Conhecimento
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#242424] flex items-center justify-center shrink-0">
            <Database size={13} className="text-neutral-400" />
          </div>
          <div className="min-w-0">
            <span className="text-white font-medium text-sm">{base.name}</span>
            {base.description && (
              <span className="text-neutral-600 text-xs ml-2">{base.description}</span>
            )}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="ml-auto text-neutral-500 hover:text-red-400 border border-[#242424] hover:border-red-900/60 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
        >
          <Trash2 size={12} /> Excluir base
        </button>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300'
              : 'bg-red-950/30 border-red-900/40 text-red-300'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {feedback.msg}
        </div>
      )}

      <div className="flex gap-1 bg-[#141414] border border-[#242424] rounded-lg p-1 overflow-x-auto scrollbar-thin">
        {([
          { key: 'sources', label: 'Fontes', icon: FileEdit },
          { key: 'upload', label: 'Arquivo', icon: UploadCloud },
          { key: 'url', label: 'URL', icon: Link },
          { key: 'audio', label: 'Voz', icon: Mic },
        ] as { key: KBTab; label: string; icon: typeof Database }[]).map((t) => {
          const Icon = t.icon;
          const histCount = t.key !== 'sources'
            ? history.filter((h) => {
                if (t.key === 'upload') return h.type === 'file';
                return h.type === t.key;
              }).length
            : null;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-md text-xs font-medium transition-colors relative whitespace-nowrap ${
                tab === t.key ? 'bg-[#1e1e1e] text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <Icon size={13} />
              {t.label}
              {histCount !== null && histCount > 0 && (
                <span className="text-[10px] bg-[#2a2a2a] text-neutral-400 rounded-full px-1.5 py-0.5 leading-none">
                  {histCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={18} className="animate-spin text-neutral-600" />
        </div>
      ) : (
        <>
          {tab === 'sources' && (
            <ConsolidatedEditor
              source={consolidatedSource}
              onUpdate={updateConsolidatedContent}
            />
          )}
          {tab === 'upload' && (
            <FileUpload
              knowledgeBaseId={base.id}
              history={history.filter((h) => h.type === 'file')}
              onDone={handleDone}
              onFeedback={showFeedback}
              onRemove={removeHistoryEntry}
            />
          )}
          {tab === 'url' && (
            <UrlScrape
              knowledgeBaseId={base.id}
              history={history.filter((h) => h.type === 'url')}
              onDone={handleDone}
              onFeedback={showFeedback}
              onRemove={removeHistoryEntry}
              onReprocess={reprocessUrl}
            />
          )}
          {tab === 'audio' && (
            <AudioRecorder
              knowledgeBaseId={base.id}
              history={history.filter((h) => h.type === 'audio')}
              onDone={handleDone}
              onFeedback={showFeedback}
              onRemove={removeHistoryEntry}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ConsolidatedEditor — the single editable knowledge source
// ─────────────────────────────────────────────────────────────────────────────

function ConsolidatedEditor({
  source,
  onUpdate,
}: {
  source: KnowledgeSource | null;
  onUpdate: (content: string) => Promise<void>;
}) {
  const [content, setContent] = useState(source?.content || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setContent(source?.content || '');
  }, [source?.id]);

  if (!source) {
    return (
      <div className="border border-dashed border-[#242424] rounded-xl p-12 text-center">
        <FileEdit size={28} className="mx-auto text-neutral-700 mb-3" />
        <p className="text-sm text-neutral-500">Nenhum conteúdo ainda</p>
        <p className="text-xs text-neutral-600 mt-1">
          Use as abas Arquivo, URL ou Voz para adicionar conteúdo a esta base.
        </p>
      </div>
    );
  }

  const charCount = content.length;
  const changed = content !== (source.content || '');

  const handleSave = async () => {
    if (!changed) return;
    setSaving(true);
    setError(null);
    try {
      await onUpdate(content.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileEdit size={14} className="text-neutral-400" />
          <span className="text-sm text-white font-medium">Fonte de Conhecimento</span>
        </div>
        <span className="text-[11px] text-neutral-600">
          {charCount.toLocaleString('pt-BR')} caracteres
        </span>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={12}
        className="w-full bg-[#0d0d0d] border border-[#1c1c1c] rounded-xl px-3 sm:px-4 py-3 text-xs text-neutral-300 placeholder:text-neutral-700 focus:outline-none focus:border-[#363636] transition-colors resize-y leading-relaxed font-mono min-h-[200px] sm:min-h-[400px]"
        placeholder="O conteúdo extraído dos arquivos, URLs e gravações aparecerá aqui. Você pode editar diretamente este texto."
      />

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-950/30 border border-red-900/40 text-red-300 text-xs">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !changed}
          className="bg-white text-black rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? (
            <><Loader2 size={13} className="animate-spin" /> Salvando...</>
          ) : saved ? (
            <><CheckCircle2 size={13} className="text-emerald-600" /> Salvo</>
          ) : (
            <><Save size={13} /> Salvar alterações</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HistoryList — shared component for showing upload history per tab
// ─────────────────────────────────────────────────────────────────────────────

function HistoryList({
  entries,
  typeIcon,
  onRemove,
  onReprocess,
}: {
  entries: KnowledgeSourceHistory[];
  typeIcon: (type: string) => JSX.Element;
  onRemove: (entry: KnowledgeSourceHistory) => void;
  onReprocess?: (entry: KnowledgeSourceHistory) => void;
}) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-600 uppercase tracking-wide">Histórico</p>
      {entries.map((entry) => {
        const charCount = (entry.metadata?.char_count as number) || entry.contributed_content?.length || 0;
        return (
          <div
            key={entry.id}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a]"
          >
            {typeIcon(entry.type)}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-neutral-300 truncate">{entry.title}</div>
              <div className="text-[11px] text-neutral-600 mt-0.5 flex items-center gap-2 flex-wrap">
                {entry.type === 'file' && entry.metadata?.size_bytes && (
                  <span>{((entry.metadata.size_bytes as number) / 1024).toFixed(0)} KB</span>
                )}
                {entry.type === 'url' && entry.metadata?.url && (
                  <span className="truncate max-w-[180px]">{entry.metadata.url as string}</span>
                )}
                {charCount > 0 && (
                  <span>{charCount.toLocaleString('pt-BR')} caracteres</span>
                )}
                <span>{new Date(entry.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onReprocess && entry.type === 'url' && entry.metadata?.url && (
                <button
                  onClick={() => onReprocess(entry)}
                  className="text-neutral-600 hover:text-blue-400 transition-colors p-1"
                  title="Reprocessar URL"
                >
                  <RefreshCw size={13} />
                </button>
              )}
              {deleteConfirm === entry.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { onRemove(entry); setDeleteConfirm(null); }}
                    className="text-[10px] text-red-400 hover:text-red-300 border border-red-900/40 rounded px-1.5 py-0.5 transition-colors"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="text-[10px] text-neutral-500 hover:text-white border border-[#242424] rounded px-1.5 py-0.5 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(entry.id)}
                  className="text-neutral-600 hover:text-red-400 transition-colors p-1"
                  title="Remover contribuição"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FileUpload
// ─────────────────────────────────────────────────────────────────────────────

type UploadStep = 'idle' | 'uploading' | 'extracting' | 'saving' | 'done';

interface QueuedFile {
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error';
  step: UploadStep;
  error?: string;
  charCount?: number;
}

function FileUpload({
  knowledgeBaseId, history, onDone, onFeedback, onRemove,
}: {
  knowledgeBaseId: string;
  history: KnowledgeSourceHistory[];
  onDone: () => void;
  onFeedback: (type: 'success' | 'error', msg: string) => void;
  onRemove: (entry: KnowledgeSourceHistory) => void;
}) {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const STEP_LABELS: Record<UploadStep, string> = {
    idle: '',
    uploading: 'Enviando arquivo...',
    extracting: 'Extraindo texto com IA...',
    saving: 'Salvando na base...',
    done: 'Concluído',
  };

  const validateFile = (file: File): string | null => {
    if (file.size > 15 * 1024 * 1024) return 'Arquivo muito grande. Limite: 15MB';
    const allowed = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const validExt = file.name.endsWith('.txt') || file.name.endsWith('.pdf') || file.name.endsWith('.docx');
    if (!allowed.includes(file.type) && !validExt) return 'Formato não suportado. Use PDF, TXT ou DOCX.';
    return null;
  };

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const newItems: QueuedFile[] = arr.map((file) => {
      const err = validateFile(file);
      return { file, status: err ? 'error' : 'pending', step: 'idle', error: err || undefined };
    });
    setQueue((prev) => [...prev, ...newItems]);
  };

  const updateQueueItem = (index: number, patch: Partial<QueuedFile>) => {
    setQueue((prev) => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const processQueue = async (currentQueue: QueuedFile[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { onFeedback('error', 'Sessão expirada'); return; }

    setProcessing(true);
    let doneCount = 0;

    for (let i = 0; i < currentQueue.length; i++) {
      const item = currentQueue[i];
      if (item.status !== 'pending') continue;

      updateQueueItem(i, { status: 'processing', step: 'uploading' });

      try {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('knowledge_base_id', knowledgeBaseId);
        formData.append('title', item.file.name);

        updateQueueItem(i, { step: 'extracting' });

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/knowledge?action=process_file`;
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        });

        updateQueueItem(i, { step: 'saving' });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Erro ao processar arquivo');

        const charCount = data.history?.metadata?.char_count as number | undefined;
        updateQueueItem(i, { status: 'done', step: 'done', charCount });
        doneCount++;
      } catch (e) {
        updateQueueItem(i, { status: 'error', step: 'idle', error: e instanceof Error ? e.message : 'Erro desconhecido' });
      }
    }

    setProcessing(false);
    if (doneCount > 0) {
      onDone();
      setTimeout(() => setQueue([]), 1500);
    }
  };

  const removeFromQueue = (index: number) => setQueue((prev) => prev.filter((_, i) => i !== index));
  const retryError = (index: number) => {
    setQueue((prev) => prev.map((item, i) =>
      i === index && item.status === 'error' ? { ...item, status: 'pending', step: 'idle', error: undefined } : item
    ));
  };

  const hasFiles = queue.length > 0;
  const pendingCount = queue.filter((q) => q.status === 'pending').length;
  const errorCount = queue.filter((q) => q.status === 'error').length;

  const typeIcon = () => <FileText size={14} className="text-blue-400 shrink-0" />;

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
        onClick={() => !hasFiles && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragOver ? 'border-blue-500/50 bg-blue-950/10' : 'border-[#242424] hover:border-[#2e2e2e] bg-[#080808]'
        } ${hasFiles ? 'cursor-default' : 'cursor-pointer'}`}
      >
        {!hasFiles ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#242424] flex items-center justify-center">
              <UploadCloud size={20} className="text-neutral-400" />
            </div>
            <div>
              <p className="text-sm text-neutral-300">Arraste arquivos aqui ou clique para selecionar</p>
              <p className="text-xs text-neutral-600 mt-1">PDF, TXT ou DOCX — Até 15MB por arquivo — Múltiplos permitidos</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-left">
            {queue.map((item, i) => (
              <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                item.status === 'done' ? 'border-emerald-900/40 bg-emerald-950/20' :
                item.status === 'error' ? 'border-red-900/40 bg-red-950/20' :
                item.status === 'processing' ? 'border-blue-900/40 bg-blue-950/10' :
                'border-[#242424] bg-[#0d0d0d]'
              }`}>
                <FileText size={14} className={
                  item.status === 'done' ? 'text-emerald-400' :
                  item.status === 'error' ? 'text-red-400' :
                  item.status === 'processing' ? 'text-blue-400' :
                  'text-neutral-500'
                } />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white truncate">{item.file.name}</div>
                  <div className="text-[10px] mt-0.5">
                    {item.status === 'error' && <span className="text-red-400">{item.error}</span>}
                    {item.status === 'processing' && (
                      <span className="text-blue-400 flex items-center gap-1">
                        <Loader2 size={9} className="animate-spin" />
                        {STEP_LABELS[item.step]}
                      </span>
                    )}
                    {item.status === 'done' && (
                      <span className="text-emerald-400">
                        Adicionado à Fonte{item.charCount ? ` · ${item.charCount.toLocaleString('pt-BR')} caracteres` : ''}
                      </span>
                    )}
                    {item.status === 'pending' && (
                      <span className="text-neutral-600">{(item.file.size / 1024).toFixed(0)} KB</span>
                    )}
                  </div>
                </div>
                {item.status === 'pending' && (
                  <button onClick={() => removeFromQueue(i)} className="text-neutral-600 hover:text-neutral-300 transition-colors">
                    <X size={13} />
                  </button>
                )}
                {item.status === 'error' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => retryError(i)}
                      className="text-[10px] text-amber-400 hover:text-amber-300 border border-amber-900/40 rounded px-1.5 py-0.5 transition-colors"
                    >
                      Tentar novamente
                    </button>
                    <button onClick={() => removeFromQueue(i)} className="text-neutral-600 hover:text-neutral-300 transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                )}
                {item.status === 'done' && <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />}
              </div>
            ))}
            <button
              onClick={() => inputRef.current?.click()}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1.5 mt-1"
            >
              <Plus size={11} /> Adicionar mais arquivos
            </button>
          </div>
        )}
      </div>

      {hasFiles && errorCount > 0 && pendingCount === 0 && !processing && (
        <button
          onClick={() => setQueue((prev) => prev.map((item) =>
            item.status === 'error' ? { ...item, status: 'pending', step: 'idle', error: undefined } : item
          ))}
          className="w-full border border-amber-900/40 text-amber-400 hover:text-amber-300 rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <RefreshCw size={14} /> Tentar novamente ({errorCount} erro{errorCount !== 1 ? 's' : ''})
        </button>
      )}
      {hasFiles && pendingCount > 0 && (
        <button
          onClick={() => processQueue(queue)}
          disabled={processing}
          className="w-full bg-white text-black rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          {processing ? (
            <><Loader2 size={14} className="animate-spin" /> Processando...</>
          ) : (
            <><UploadCloud size={14} /> Processar {pendingCount} arquivo{pendingCount !== 1 ? 's' : ''}</>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) { addFiles(e.target.files); e.target.value = ''; } }}
      />

      <HistoryList
        entries={history}
        typeIcon={typeIcon}
        onRemove={onRemove}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UrlScrape
// ─────────────────────────────────────────────────────────────────────────────

function UrlScrape({
  knowledgeBaseId, history, onDone, onFeedback, onRemove, onReprocess,
}: {
  knowledgeBaseId: string;
  history: KnowledgeSourceHistory[];
  onDone: () => void;
  onFeedback: (type: 'success' | 'error', msg: string) => void;
  onRemove: (entry: KnowledgeSourceHistory) => void;
  onReprocess: (entry: KnowledgeSourceHistory) => void;
}) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [scraping, setScraping] = useState(false);

  const handleScrape = async () => {
    if (!url.trim()) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      onFeedback('error', 'URL deve começar com http:// ou https://');
      return;
    }
    setScraping(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/knowledge?action=scrape_url`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledge_base_id: knowledgeBaseId, source_url: url, title: title || url }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao extrair conteúdo');

      setUrl('');
      setTitle('');
      onDone();
    } catch (e) {
      onFeedback('error', e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setScraping(false);
    }
  };

  const typeIcon = () => <Globe size={14} className="text-emerald-400 shrink-0" />;

  return (
    <div className="space-y-4">
      <div className="bg-[#141414] border border-[#242424] rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">URL do site</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://suaempresa.com/sobre"
            className="w-full bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#363636] transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">Título (opcional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Página Sobre Nós"
            className="w-full bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#363636] transition-colors"
          />
        </div>
        <button
          onClick={handleScrape}
          disabled={scraping || !url.trim()}
          className="w-full bg-white text-black rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scraping ? (
            <><Loader2 size={14} className="animate-spin" /> Extraindo conteúdo...</>
          ) : (
            <><Plus size={14} /> Adicionar URL</>
          )}
        </button>
      </div>
      <p className="text-xs text-neutral-600 px-1">
        O sistema irá extrair o texto principal da página e adicioná-lo à Fonte de Conhecimento.
      </p>

      <HistoryList
        entries={history}
        typeIcon={typeIcon}
        onRemove={onRemove}
        onReprocess={onReprocess}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AudioRecorder
// ─────────────────────────────────────────────────────────────────────────────

function AudioRecorder({
  knowledgeBaseId, history, onDone, onFeedback, onRemove,
}: {
  knowledgeBaseId: string;
  history: KnowledgeSourceHistory[];
  onDone: () => void;
  onFeedback: (type: 'success' | 'error', msg: string) => void;
  onRemove: (entry: KnowledgeSourceHistory) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [title, setTitle] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<number>(0);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunks.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      recorder.onstop = () => { stream.getTracks().forEach((t) => t.stop()); };
      recorder.start();
      mediaRecorder.current = recorder;
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((p) => p + 1), 1000);
    } catch {
      onFeedback('error', 'Não foi possível acessar o microfone');
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorder.current) return;
    clearInterval(timerRef.current);
    return new Promise<Blob>((resolve) => {
      mediaRecorder.current!.onstop = () => {
        mediaRecorder.current!.stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks.current, { type: 'audio/webm' }));
      };
      mediaRecorder.current!.stop();
      setRecording(false);
    });
  };

  const handleStop = async () => {
    const blob = await stopRecording();
    if (!blob || blob.size < 1000) { onFeedback('error', 'Gravação muito curta'); return; }

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('knowledge_base_id', knowledgeBaseId);
      formData.append('title', title || `Gravação ${new Date().toLocaleDateString('pt-BR')}`);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/knowledge?action=transcribe_audio`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao transcrever');

      setTitle('');
      setElapsed(0);
      onDone();
    } catch (e) {
      onFeedback('error', e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setProcessing(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const typeIcon = () => <AudioLines size={14} className="text-amber-400 shrink-0" />;

  return (
    <div className="space-y-4">
      <div className="bg-[#141414] border border-[#242424] rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">Título da gravação (opcional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Explicação sobre a empresa"
            disabled={recording || processing}
            className="w-full bg-[#0d0d0d] border border-[#1c1c1c] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#363636] transition-colors disabled:opacity-50"
          />
        </div>
        <div className="flex flex-col items-center gap-4 py-4">
          {processing ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={28} className="animate-spin text-amber-400" />
              <p className="text-sm text-neutral-400">Transcrevendo áudio...</p>
              <p className="text-xs text-neutral-600">A IA está ouvindo sua gravação</p>
            </div>
          ) : recording ? (
            <>
              <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-pulse">
                <Mic size={24} className="text-red-400" />
              </div>
              <div className="text-lg font-mono text-white">{formatTime(elapsed)}</div>
              <button
                onClick={handleStop}
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <MicOff size={14} /> Parar gravação
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-[#141414] border border-[#242424] flex items-center justify-center">
                <Mic size={24} className="text-neutral-500" />
              </div>
              <p className="text-xs text-neutral-500 text-center max-w-xs">
                Grave uma explicação sobre sua empresa, produtos ou serviços. O áudio será transcrito e adicionado à Fonte de Conhecimento.
              </p>
              <button
                onClick={startRecording}
                className="bg-white text-black rounded-lg px-5 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-neutral-200 transition-colors"
              >
                <Mic size={14} /> Iniciar gravação
              </button>
            </>
          )}
        </div>
      </div>

      <HistoryList
        entries={history}
        typeIcon={typeIcon}
        onRemove={onRemove}
      />
    </div>
  );
}
