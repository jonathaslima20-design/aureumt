import { useEffect, useState, useRef } from 'react';
import {
  Database, UploadCloud, Link, Mic, MicOff, Trash2,
  ToggleLeft, ToggleRight, Loader2, FileText, Globe,
  AudioLines, Plus, X, CheckCircle2, AlertCircle, ArrowLeft,
} from 'lucide-react';
import { supabase, KnowledgeBase, KnowledgeSource } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

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
  const [sourceCounts, setSourceCounts] = useState<Record<string, number>>({});

  const fetchBases = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('knowledge_bases')
      .select('*')
      .order('created_at', { ascending: false });
    const list = data || [];
    setBases(list);

    if (list.length > 0) {
      const { data: counts } = await supabase
        .from('knowledge_sources')
        .select('knowledge_base_id')
        .in('knowledge_base_id', list.map((b) => b.id))
        .eq('is_active', true);
      const map: Record<string, number> = {};
      (counts || []).forEach((r: { knowledge_base_id: string }) => {
        map[r.knowledge_base_id] = (map[r.knowledge_base_id] || 0) + 1;
      });
      setSourceCounts(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBases();
  }, []);

  const createBase = async () => {
    if (!newName.trim() || !profile) return;
    setCreating(true);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Base de Conhecimento</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Organize o conhecimento dos seus negócios em bases independentes.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-white text-black rounded-lg px-4 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-neutral-200 transition-colors"
        >
          <Plus size={14} /> Nova base
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin text-neutral-600" />
        </div>
      ) : bases.length === 0 ? (
        <div className="border border-dashed border-[#1a1a1a] rounded-xl p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0d0d0d] border border-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {bases.map((base) => (
            <button
              key={base.id}
              onClick={() => setSelectedBase(base)}
              className="group text-left bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5 hover:border-[#2a2a2a] hover:bg-[#0d0d0d] transition-all duration-200 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#111] border border-[#1a1a1a] flex items-center justify-center shrink-0">
                  <Database size={15} className="text-neutral-400" />
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteBase(base); }}
                  className="text-neutral-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                  title="Excluir base"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div>
                <div className="text-sm font-medium text-white">{base.name}</div>
                {base.description && (
                  <div className="text-[11px] text-neutral-500 mt-1 line-clamp-2">{base.description}</div>
                )}
              </div>
              <div className="mt-auto flex items-center justify-between text-[11px] text-neutral-600">
                <span>
                  {sourceCounts[base.id] ?? 0} fonte{(sourceCounts[base.id] ?? 0) !== 1 ? 's' : ''} ativa{(sourceCounts[base.id] ?? 0) !== 1 ? 's' : ''}
                </span>
                <span>{new Date(base.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
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
                  className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#2a2a2a] outline-none"
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
                  className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#2a2a2a] outline-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setShowCreate(false); setNewName(''); setNewDesc(''); }}
                  className="flex-1 border border-[#1a1a1a] text-neutral-400 hover:text-white rounded-lg py-2.5 text-sm transition-colors"
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

function KnowledgeBaseDetail({
  base,
  onBack,
  onDelete,
}: {
  base: KnowledgeBase;
  onBack: () => void;
  onDelete: () => void;
}) {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<KBTab>('sources');
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const fetchSources = async () => {
    const { data } = await supabase
      .from('knowledge_sources')
      .select('*')
      .eq('knowledge_base_id', base.id)
      .order('created_at', { ascending: false });
    setSources(data || []);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchSources();
  }, [base.id]);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const toggleSource = async (id: string, currentActive: boolean) => {
    await supabase.from('knowledge_sources').update({ is_active: !currentActive }).eq('id', id);
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: !currentActive } : s)));
  };

  const deleteSource = async (id: string) => {
    await supabase.from('knowledge_sources').delete().eq('id', id);
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'file': return <FileText size={14} className="text-blue-400" />;
      case 'url': return <Globe size={14} className="text-emerald-400" />;
      case 'audio': return <AudioLines size={14} className="text-amber-400" />;
      default: return <Database size={14} className="text-neutral-400" />;
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
          <div className="w-7 h-7 rounded-lg bg-[#111] border border-[#1a1a1a] flex items-center justify-center shrink-0">
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
          className="ml-auto text-neutral-500 hover:text-red-400 border border-[#1a1a1a] hover:border-red-900/60 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
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

      <div className="flex gap-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-1">
        {([
          { key: 'sources', label: 'Fontes', icon: Database },
          { key: 'upload', label: 'Arquivo', icon: UploadCloud },
          { key: 'url', label: 'URL', icon: Link },
          { key: 'audio', label: 'Voz', icon: Mic },
        ] as { key: KBTab; label: string; icon: typeof Database }[]).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                tab === t.key ? 'bg-[#151515] text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'sources' && (
        <SourcesList
          sources={sources}
          loading={loading}
          onToggle={toggleSource}
          onDelete={deleteSource}
          typeIcon={typeIcon}
        />
      )}
      {tab === 'upload' && (
        <FileUpload
          knowledgeBaseId={base.id}
          onDone={() => { fetchSources(); setTab('sources'); }}
          onFeedback={showFeedback}
        />
      )}
      {tab === 'url' && (
        <UrlScrape
          knowledgeBaseId={base.id}
          onDone={() => { fetchSources(); setTab('sources'); }}
          onFeedback={showFeedback}
        />
      )}
      {tab === 'audio' && (
        <AudioRecorder
          knowledgeBaseId={base.id}
          onDone={() => { fetchSources(); setTab('sources'); }}
          onFeedback={showFeedback}
        />
      )}
    </div>
  );
}

function SourcesList({
  sources, loading, onToggle, onDelete, typeIcon,
}: {
  sources: KnowledgeSource[];
  loading: boolean;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  typeIcon: (type: string) => JSX.Element;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={18} className="animate-spin text-neutral-600" />
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="border border-dashed border-[#1a1a1a] rounded-xl p-12 text-center">
        <Database size={28} className="mx-auto text-neutral-700 mb-3" />
        <p className="text-sm text-neutral-500">Nenhuma fonte de conhecimento ainda</p>
        <p className="text-xs text-neutral-600 mt-1">
          Adicione arquivos, URLs ou gravações para treinar seu agente
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sources.map((s) => (
        <div
          key={s.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
            s.is_active ? 'bg-[#0a0a0a] border-[#1a1a1a]' : 'bg-[#080808] border-[#141414] opacity-60'
          }`}
        >
          {typeIcon(s.type)}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white truncate">{s.title}</div>
            <div className="text-[11px] text-neutral-600 mt-0.5">
              {s.type === 'file' && `${((s.metadata?.size_bytes as number) / 1024).toFixed(0)} KB`}
              {s.type === 'url' && (s.metadata?.url as string)}
              {s.type === 'audio' && `${((s.metadata?.char_count as number) || 0)} caracteres transcritos`}
              {' · '}
              {new Date(s.created_at).toLocaleDateString('pt-BR')}
            </div>
          </div>
          <button
            onClick={() => onToggle(s.id, s.is_active)}
            className="text-neutral-500 hover:text-white transition-colors"
            title={s.is_active ? 'Desativar' : 'Ativar'}
          >
            {s.is_active ? (
              <ToggleRight size={20} className="text-emerald-400" />
            ) : (
              <ToggleLeft size={20} />
            )}
          </button>
          <button
            onClick={() => onDelete(s.id)}
            className="text-neutral-600 hover:text-red-400 transition-colors"
            title="Excluir"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function FileUpload({
  knowledgeBaseId, onDone, onFeedback,
}: {
  knowledgeBaseId: string;
  onDone: () => void;
  onFeedback: (type: 'success' | 'error', msg: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      onFeedback('error', 'Arquivo muito grande. Limite: 5MB');
      return;
    }
    const allowed = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
      onFeedback('error', 'Formato não suportado. Use PDF, TXT ou DOCX.');
      return;
    }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('knowledge_base_id', knowledgeBaseId);
      formData.append('title', file.name);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/knowledge?action=process_file`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao processar arquivo');

      onFeedback('success', `"${file.name}" processado com sucesso`);
      onDone();
    } catch (e) {
      onFeedback('error', e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-blue-500/50 bg-blue-950/10' : 'border-[#1a1a1a] hover:border-[#2a2a2a] bg-[#080808]'
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={24} className="animate-spin text-blue-400" />
            <p className="text-sm text-neutral-400">Processando documento...</p>
            <p className="text-xs text-neutral-600">A IA está extraindo o conteúdo</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#111] border border-[#1a1a1a] flex items-center justify-center">
              <UploadCloud size={20} className="text-neutral-400" />
            </div>
            <div>
              <p className="text-sm text-neutral-300">Arraste um arquivo aqui ou clique para selecionar</p>
              <p className="text-xs text-neutral-600 mt-1">PDF, TXT ou DOCX - Até 5MB</p>
            </div>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
        }}
      />
    </div>
  );
}

function UrlScrape({
  knowledgeBaseId, onDone, onFeedback,
}: {
  knowledgeBaseId: string;
  onDone: () => void;
  onFeedback: (type: 'success' | 'error', msg: string) => void;
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

      onFeedback('success', 'Conteúdo da URL extraído com sucesso');
      setUrl('');
      setTitle('');
      onDone();
    } catch (e) {
      onFeedback('error', e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">URL do site</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://suaempresa.com/sobre"
            className="w-full bg-[#080808] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#2a2a2a] transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">Título (opcional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Página Sobre Nós"
            className="w-full bg-[#080808] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#2a2a2a] transition-colors"
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
        O sistema irá extrair o texto principal da página. Funciona melhor com páginas de conteúdo (sobre, FAQ, blog).
      </p>
    </div>
  );
}

function AudioRecorder({
  knowledgeBaseId, onDone, onFeedback,
}: {
  knowledgeBaseId: string;
  onDone: () => void;
  onFeedback: (type: 'success' | 'error', msg: string) => void;
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

      onFeedback('success', 'Áudio transcrito e adicionado à base de conhecimento');
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

  return (
    <div className="space-y-4">
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">Título da gravação (opcional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Explicação sobre a empresa"
            disabled={recording || processing}
            className="w-full bg-[#080808] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#2a2a2a] transition-colors disabled:opacity-50"
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
              <div className="w-16 h-16 rounded-full bg-[#111] border border-[#1a1a1a] flex items-center justify-center">
                <Mic size={24} className="text-neutral-500" />
              </div>
              <p className="text-xs text-neutral-500 text-center max-w-xs">
                Grave uma explicação sobre sua empresa, produtos ou serviços. O áudio será transcrito e usado como contexto pela IA.
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
    </div>
  );
}
