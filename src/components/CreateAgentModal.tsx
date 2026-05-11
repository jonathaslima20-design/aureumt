import { useCallback, useEffect, useRef, useState } from 'react';
import {
  X, Loader2, Upload, Check, Sparkles, Plus, Trash2,
  ChevronDown, ChevronUp, GripVertical, ZoomIn, ZoomOut, RotateCcw,
} from 'lucide-react';
import {
  supabase,
  Instance,
  AGENT_COLORS,
  buildSystemPrompt,
} from '../lib/supabase';
import { AgentAvatar } from './AgentAvatar';

// ─── Image crop modal ─────────────────────────────────────────────────────────

function ImageCropModal({
  src,
  onConfirm,
  onCancel,
}: {
  src: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const SIZE = 280;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Draw image centered + offset
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    const x = (SIZE - iw) / 2 + offset.x;
    const y = (SIZE - ih) / 2 + offset.y;
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x, y, iw, ih);
    ctx.restore();

    // Overlay outside circle
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Circle border
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [scale, offset]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Initial scale to fill circle
      const fit = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
      setScale(fit);
      setOffset({ x: 0, y: 0 });
    };
    img.src = src;
  }, [src]);

  useEffect(() => { draw(); }, [draw]);

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.mx),
      y: dragStart.current.oy + (e.clientY - dragStart.current.my),
    });
  };
  const onMouseUp = () => setDragging(false);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setDragging(true);
    dragStart.current = { mx: t.clientX, my: t.clientY, ox: offset.x, oy: offset.y };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const t = e.touches[0];
    setOffset({
      x: dragStart.current.ox + (t.clientX - dragStart.current.mx),
      y: dragStart.current.oy + (t.clientY - dragStart.current.my),
    });
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    // Render clean crop (no overlay) to output canvas
    const out = document.createElement('canvas');
    out.width = SIZE;
    out.height = SIZE;
    const ctx = out.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    const x = (SIZE - iw) / 2 + offset.x;
    const y = (SIZE - ih) / 2 + offset.y;
    ctx.drawImage(img, x, y, iw, ih);
    out.toBlob((blob) => { if (blob) onConfirm(blob); }, 'image/png');
  };

  const resetZoom = () => {
    const img = imgRef.current;
    if (!img) return;
    const fit = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
    setScale(fit);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-white/[0.1] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <div className="text-sm font-semibold text-white">Recortar foto</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">Arraste para posicionar</div>
          </div>
          <button onClick={onCancel} className="text-neutral-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-5 px-5 py-6">
          {/* Canvas */}
          <div className="relative" style={{ width: SIZE, height: SIZE }}>
            <canvas
              ref={canvasRef}
              width={SIZE}
              height={SIZE}
              className={`rounded-full ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={() => setDragging(false)}
            />
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(s - 0.1, 0.3))}
              className="text-neutral-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
            >
              <ZoomOut size={14} />
            </button>
            <input
              type="range"
              min={0.3}
              max={3}
              step={0.01}
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 accent-white h-1 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(s + 0.1, 3))}
              className="text-neutral-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="text-neutral-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
              title="Resetar"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06]">
          <button
            onClick={onCancel}
            className="text-neutral-500 hover:text-white text-xs transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="bg-white text-black rounded-xl px-5 py-2 text-xs font-semibold flex items-center gap-1.5 hover:bg-neutral-200 transition-all"
          >
            <Check size={12} /> Aplicar recorte
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Custom variable row ──────────────────────────────────────────────────────

type CustomVar = { key: string; value: string };

function VarRow({
  v,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  v: CustomVar;
  index: number;
  total: number;
  onChange: (u: CustomVar) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="flex items-center gap-2 group">
      <div className="flex flex-col gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="text-neutral-700 hover:text-neutral-400 disabled:opacity-20 transition-colors"
        >
          <ChevronUp size={10} />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          className="text-neutral-700 hover:text-neutral-400 disabled:opacity-20 transition-colors"
        >
          <ChevronDown size={10} />
        </button>
      </div>
      <GripVertical size={11} className="text-neutral-800 shrink-0" />
      <input
        value={v.key}
        onChange={(e) => onChange({ ...v, key: e.target.value.replace(/\s/g, '_') })}
        placeholder="variavel"
        className="w-28 bg-[#0a0a0a] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-neutral-600 shrink-0"
      />
      <span className="text-neutral-700 text-xs shrink-0">=</span>
      <input
        value={v.value}
        onChange={(e) => onChange({ ...v, value: e.target.value })}
        placeholder="valor"
        className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-neutral-600"
      />
      <button
        type="button"
        onClick={onRemove}
        className="text-neutral-700 hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}

// ─── Chat preview ─────────────────────────────────────────────────────────────

function ChatPreview({
  agentName,
  avatarUrl,
  color,
}: {
  agentName: string;
  avatarUrl: string;
  color: string;
}) {
  const name = agentName.trim() || 'Agente';
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#060606] overflow-hidden">
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-white/[0.05] bg-[#0d0d0d]">
        <AgentAvatar name={name} url={avatarUrl} color={color} size={26} />
        <div>
          <div className="text-[11px] font-semibold text-white leading-tight">{name}</div>
          <div className="text-[9px] text-emerald-400">online</div>
        </div>
      </div>
      <div className="px-3 py-4">
        <div className="flex items-end gap-2">
          <AgentAvatar name={name} url={avatarUrl} color={color} size={20} />
          <div
            className="max-w-[85%] rounded-2xl rounded-bl-none px-3 py-2 text-[11px] text-white leading-relaxed"
            style={{ background: `${color}22`, border: `1px solid ${color}33` }}
          >
            Olá! Eu sou {name}. Como posso te ajudar hoje?
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

type Props = {
  userId: string;
  onClose: () => void;
  onCreated: (inst: Instance) => void;
};

function applyVars(prompt: string, vars: CustomVar[]): string {
  let out = prompt;
  for (const { key, value } of vars) {
    if (key.trim()) out = out.replaceAll(`{{${key.trim()}}}`, value);
  }
  return out;
}

export function CreateAgentModal({ userId, onClose, onCreated }: Props) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [personaName, setPersonaName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [color, setColor] = useState(AGENT_COLORS[0]);
  const [tone, setTone] = useState('friendly');
  const [language, setLanguage] = useState('pt-BR');
  const [emojiUsage, setEmojiUsage] = useState('moderate');
  const [basePrompt, setBasePrompt] = useState('');
  const [customVars, setCustomVars] = useState<CustomVar[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);

  const canCreate = displayName.trim().length >= 2;

  const addVar = () => setCustomVars((v) => [...v, { key: '', value: '' }]);
  const updateVar = (i: number, u: CustomVar) => setCustomVars((v) => v.map((x, idx) => idx === i ? u : x));
  const removeVar = (i: number) => setCustomVars((v) => v.filter((_, idx) => idx !== i));
  const moveVar = (i: number, dir: -1 | 1) => {
    setCustomVars((v) => {
      const arr = [...v];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setCropSrc(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCropSrc(null);
    setError('');
    setUploading(true);
    try {
      const path = `${userId}/${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from('agent-avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/png' });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('agent-avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no upload');
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      const resolvedBase = applyVars(basePrompt, customVars);
      const systemPrompt = buildSystemPrompt({
        persona_name: personaName || displayName,
        company_name: companyName,
        tone,
        language,
        emoji_usage: emojiUsage,
        base: resolvedBase,
      });

      const instance_name = `aura_${Date.now().toString(36)}`;
      const { data, error: insErr } = await supabase
        .from('instances')
        .insert({
          user_id: userId,
          instance_name,
          display_name: displayName.trim(),
          persona_name: personaName.trim() || displayName.trim(),
          company_name: companyName.trim(),
          avatar_url: avatarUrl,
          color,
          tone,
          language,
          emoji_usage: emojiUsage,
          system_prompt: systemPrompt,
          response_delay: 3000,
          overflow_keyword: 'humano',
        })
        .select()
        .maybeSingle();

      if (insErr) throw insErr;
      if (data) onCreated(data as Instance);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar');
    } finally {
      setSaving(false);
    }
  };

  const agentName = personaName || displayName || 'Agente';

  return (
    <>
    {cropSrc && (
      <ImageCropModal
        src={cropSrc}
        onConfirm={handleCropConfirm}
        onCancel={() => setCropSrc(null)}
      />
    )}
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#080808] border border-white/[0.08] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div>
            <div className="text-sm text-white font-semibold tracking-tight">Criar novo agente</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">Configure como desejar.</div>
          </div>
          <button onClick={onClose} className="text-neutral-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Identity */}
          <div className="flex items-center gap-4">
            <div
              className="relative group cursor-pointer shrink-0"
              onClick={() => document.getElementById(`avatar-modal-${userId}`)?.click()}
            >
              <AgentAvatar name={agentName} url={avatarUrl} color={color} size={64} />
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading
                  ? <Loader2 size={14} className="animate-spin text-white" />
                  : <Upload size={14} className="text-white" />}
              </div>
              <input
                id={`avatar-modal-${userId}`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ''; }}
              />
            </div>

            <div className="flex-1 space-y-2.5">
              <div>
                <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">
                  Nome de exibição *
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ex: Júlia - Vendas"
                  className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-white/20 outline-none transition-colors"
                />
              </div>
              <div className="flex gap-2">
                {AGENT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                      color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ background: c, boxShadow: color === c ? `0 0 10px ${c}66` : 'none' }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">
                Nome da persona
              </label>
              <input
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                placeholder="Como ele se apresenta"
                className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-white/20 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">
                Empresa
              </label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nome da empresa"
                className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-white/20 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">
              Prompt / Instruções
            </label>
            <p className="text-[11px] text-neutral-600 mb-2">
              Use <code className="bg-[#111] px-1 rounded text-neutral-400 font-mono">{'{{variavel}}'}</code> para inserir valores das variáveis abaixo.
            </p>
            <textarea
              value={basePrompt}
              onChange={(e) => setBasePrompt(e.target.value)}
              rows={5}
              placeholder="Você é um atendente especializado em... O cardápio está em {{link_cardapio}}."
              className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-white/20 outline-none resize-none transition-colors font-mono leading-relaxed"
            />
          </div>

          {/* Custom variables */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={10} className="text-neutral-600" />
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Variáveis personalizadas</span>
              </div>
              <button
                type="button"
                onClick={addVar}
                className="text-[10px] text-neutral-400 hover:text-white border border-[#1a1a1a] hover:border-[#262626] rounded px-2 py-1 flex items-center gap-1 transition-colors"
              >
                <Plus size={9} /> Adicionar
              </button>
            </div>

            {customVars.length === 0 ? (
              <div className="border border-dashed border-[#1a1a1a] rounded-lg py-4 text-center text-[11px] text-neutral-700">
                Nenhuma variável. Clique em "Adicionar" para criar uma.
              </div>
            ) : (
              <div className="space-y-2">
                {customVars.map((v, i) => (
                  <VarRow
                    key={i}
                    v={v}
                    index={i}
                    total={customVars.length}
                    onChange={(u) => updateVar(i, u)}
                    onRemove={() => removeVar(i)}
                    onMove={(dir) => moveVar(i, dir)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Advanced settings */}
          <div className="border border-[#1a1a1a] rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Configurações avançadas</span>
              {showAdvanced ? <ChevronUp size={12} className="text-neutral-600" /> : <ChevronDown size={12} className="text-neutral-600" />}
            </button>

            {showAdvanced && (
              <div className="px-4 pb-4 space-y-3 border-t border-[#1a1a1a] pt-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">Tom</label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-neutral-600"
                    >
                      <option value="friendly">Amigável</option>
                      <option value="professional">Profissional</option>
                      <option value="casual">Descontraído</option>
                      <option value="technical">Técnico</option>
                      <option value="warm">Acolhedor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">Idioma</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-neutral-600"
                    >
                      <option value="pt-BR">Português (BR)</option>
                      <option value="en-US">English (US)</option>
                      <option value="es">Español</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">Emojis</label>
                    <select
                      value={emojiUsage}
                      onChange={(e) => setEmojiUsage(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-neutral-600"
                    >
                      <option value="none">Nenhum</option>
                      <option value="moderate">Moderado</option>
                      <option value="expressive">Expressivo</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live preview */}
          <div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles size={9} /> Preview
            </div>
            <ChatPreview agentName={agentName} avatarUrl={avatarUrl} color={color} />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-xl px-3 py-2.5">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06] gap-3 shrink-0">
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white text-xs flex items-center gap-1.5 transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !canCreate}
            className="bg-white text-black rounded-xl px-5 py-2 text-xs font-semibold flex items-center gap-1.5 hover:bg-neutral-200 transition-all duration-200 disabled:opacity-30 shadow-[0_0_20px_rgba(255,255,255,0.08)]"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Criar agente
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
