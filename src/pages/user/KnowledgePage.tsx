import { useEffect, useState, useRef } from 'react';
import {
  Database,
  UploadCloud,
  Link,
  Mic,
  MicOff,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  FileText,
  Globe,
  AudioLines,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { supabase, Instance } from '../../lib/supabase';

type KnowledgeSource = {
  id: string;
  instance_id: string;
  type: 'file' | 'url' | 'audio';
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
};

type Tab = 'sources' | 'upload' | 'url' | 'audio';

export function KnowledgePage({ instance }: { instance: Instance }) {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('sources');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const fetchSources = async () => {
    const { data } = await supabase
      .from('knowledge_sources')
      .select('*')
      .eq('instance_id', instance.id)
      .order('created_at', { ascending: false });
    setSources(data || []);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchSources();
  }, [instance.id]);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const toggleSource = async (id: string, currentActive: boolean) => {
    await supabase
      .from('knowledge_sources')
      .update({ is_active: !currentActive })
      .eq('id', id);
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: !currentActive } : s))
    );
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Database size={18} strokeWidth={1.8} />
            Base de Conhecimento
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Treine seu agente com documentos, sites e gravacoes de voz
          </p>
        </div>
        <div className="text-[11px] text-neutral-600">
          {sources.filter((s) => s.is_active).length} fonte(s) ativa(s)
        </div>
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
        ] as { key: Tab; label: string; icon: typeof Database }[]).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                tab === t.key
                  ? 'bg-[#151515] text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
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
          instanceId={instance.id}
          onDone={() => { fetchSources(); setTab('sources'); }}
          onFeedback={showFeedback}
        />
      )}
      {tab === 'url' && (
        <UrlScrape
          instanceId={instance.id}
          onDone={() => { fetchSources(); setTab('sources'); }}
          onFeedback={showFeedback}
        />
      )}
      {tab === 'audio' && (
        <AudioRecorder
          instanceId={instance.id}
          onDone={() => { fetchSources(); setTab('sources'); }}
          onFeedback={showFeedback}
        />
      )}
    </div>
  );
}

function SourcesList({
  sources,
  loading,
  onToggle,
  onDelete,
  typeIcon,
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
          Adicione arquivos, URLs ou gravacoes para treinar seu agente
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
            s.is_active
              ? 'bg-[#0a0a0a] border-[#1a1a1a]'
              : 'bg-[#080808] border-[#141414] opacity-60'
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
  instanceId,
  onDone,
  onFeedback,
}: {
  instanceId: string;
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
      onFeedback('error', 'Formato nao suportado. Use PDF, TXT ou DOCX.');
      return;
    }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('instance_id', instanceId);
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
          dragOver
            ? 'border-blue-500/50 bg-blue-950/10'
            : 'border-[#1a1a1a] hover:border-[#2a2a2a] bg-[#080808]'
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={24} className="animate-spin text-blue-400" />
            <p className="text-sm text-neutral-400">Processando documento...</p>
            <p className="text-xs text-neutral-600">A IA esta extraindo o conteudo</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#111] border border-[#1a1a1a] flex items-center justify-center">
              <UploadCloud size={20} className="text-neutral-400" />
            </div>
            <div>
              <p className="text-sm text-neutral-300">Arraste um arquivo aqui ou clique para selecionar</p>
              <p className="text-xs text-neutral-600 mt-1">PDF, TXT ou DOCX - Ate 5MB</p>
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
  instanceId,
  onDone,
  onFeedback,
}: {
  instanceId: string;
  onDone: () => void;
  onFeedback: (type: 'success' | 'error', msg: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [scraping, setScraping] = useState(false);

  const handleScrape = async () => {
    if (!url.trim()) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      onFeedback('error', 'URL deve comecar com http:// ou https://');
      return;
    }

    setScraping(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/knowledge?action=scrape_url`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instance_id: instanceId, source_url: url, title: title || url }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao extrair conteudo');

      onFeedback('success', 'Conteudo da URL extraido com sucesso');
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
          <label className="block text-xs text-neutral-400 mb-1.5">Titulo (opcional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Pagina Sobre Nos"
            className="w-full bg-[#080808] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#2a2a2a] transition-colors"
          />
        </div>
        <button
          onClick={handleScrape}
          disabled={scraping || !url.trim()}
          className="w-full bg-white text-black rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scraping ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Extraindo conteudo...
            </>
          ) : (
            <>
              <Plus size={14} />
              Adicionar URL
            </>
          )}
        </button>
      </div>
      <p className="text-xs text-neutral-600 px-1">
        O sistema ira extrair o texto principal da pagina. Funciona melhor com paginas de conteudo (sobre, FAQ, blog).
      </p>
    </div>
  );
}

function AudioRecorder({
  instanceId,
  onDone,
  onFeedback,
}: {
  instanceId: string;
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
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorder.current = recorder;
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((p) => p + 1), 1000);
    } catch {
      onFeedback('error', 'Nao foi possivel acessar o microfone');
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
    if (!blob || blob.size < 1000) {
      onFeedback('error', 'Gravacao muito curta');
      return;
    }

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('instance_id', instanceId);
      formData.append('title', title || `Gravacao ${new Date().toLocaleDateString('pt-BR')}`);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/knowledge?action=transcribe_audio`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao transcrever');

      onFeedback('success', 'Audio transcrito e adicionado a base de conhecimento');
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
          <label className="block text-xs text-neutral-400 mb-1.5">Titulo da gravacao (opcional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Explicacao sobre a empresa"
            disabled={recording || processing}
            className="w-full bg-[#080808] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#2a2a2a] transition-colors disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col items-center gap-4 py-4">
          {processing ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={28} className="animate-spin text-amber-400" />
              <p className="text-sm text-neutral-400">Transcrevendo audio...</p>
              <p className="text-xs text-neutral-600">A IA esta ouvindo sua gravacao</p>
            </div>
          ) : recording ? (
            <>
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-pulse">
                  <Mic size={24} className="text-red-400" />
                </div>
              </div>
              <div className="text-lg font-mono text-white">{formatTime(elapsed)}</div>
              <button
                onClick={handleStop}
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <MicOff size={14} />
                Parar gravacao
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-[#111] border border-[#1a1a1a] flex items-center justify-center">
                <Mic size={24} className="text-neutral-500" />
              </div>
              <p className="text-xs text-neutral-500 text-center max-w-xs">
                Grave uma explicacao sobre sua empresa, produtos ou servicos. O audio sera transcrito e usado como contexto pela IA.
              </p>
              <button
                onClick={startRecording}
                className="bg-white text-black rounded-lg px-5 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-neutral-200 transition-colors"
              >
                <Mic size={14} />
                Iniciar gravacao
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
