import { memo, useState } from 'react';
import { User, Bot, Check, CheckCheck, Clock, AlertCircle, Copy, CornerUpLeft, GraduationCap } from 'lucide-react';
import { ChatLog } from '../../../lib/supabase';
import { formatTime } from './utils';

type Props = {
  message: ChatLog;
  quoted: ChatLog | null;
  isUnreadDivider: boolean;
  isTrainingExample?: boolean;
  onReply: (m: ChatLog) => void;
  onImage: (url: string) => void;
  onQuoteClick: (id: string) => void;
  onMarkTraining?: (m: ChatLog) => void;
};

function deliveryIcon(status: ChatLog['delivery_status']) {
  switch (status) {
    case 'pending': return <Clock size={10} className="text-neutral-500" aria-label="Enviando" />;
    case 'sent': return <Check size={11} className="text-neutral-500" aria-label="Enviado" />;
    case 'delivered': return <CheckCheck size={11} className="text-neutral-500" aria-label="Entregue" />;
    case 'read': return <CheckCheck size={11} className="text-sky-400" aria-label="Lido" />;
    case 'failed': return <AlertCircle size={11} className="text-red-400" aria-label="Falhou" />;
    default: return null;
  }
}

function MessageBubbleComp({
  message: m,
  quoted,
  isUnreadDivider,
  isTrainingExample,
  onReply,
  onImage,
  onQuoteClick,
  onMarkTraining,
}: Props) {
  const [copied, setCopied] = useState(false);
  const isIn = m.direction === 'in';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(m.message_body || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <>
      {isUnreadDivider && (
        <div className="flex items-center gap-2 my-2 px-1" role="separator">
          <div className="flex-1 h-px bg-amber-700/40" />
          <span className="text-[10px] uppercase tracking-wider text-amber-400 font-medium">
            Não lidas
          </span>
          <div className="flex-1 h-px bg-amber-700/40" />
        </div>
      )}
      <div
        id={`msg-${m.id}`}
        className={`group flex gap-2 ${isIn ? 'justify-start' : 'justify-end'}`}
      >
        {isIn && (
          <div className="w-6 h-6 rounded-full bg-[#141414] border border-[#242424] flex items-center justify-center shrink-0">
            <User size={11} className="text-neutral-500" />
          </div>
        )}

        <div className="flex flex-col max-w-[75%] min-w-0">
          {/* Hover actions */}
          <div
            className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mb-1 ${
              isIn ? 'self-start' : 'self-end'
            }`}
          >
            <button
              onClick={() => onReply(m)}
              className="p-1 rounded bg-[#1a1a1a] border border-[#242424] text-neutral-400 hover:text-white transition-colors"
              title="Responder"
              aria-label="Responder"
            >
              <CornerUpLeft size={11} />
            </button>
            <button
              onClick={handleCopy}
              className="p-1 rounded bg-[#1a1a1a] border border-[#242424] text-neutral-400 hover:text-white transition-colors"
              title={copied ? 'Copiado!' : 'Copiar'}
              aria-label="Copiar"
            >
              <Copy size={11} />
            </button>
            {onMarkTraining && (
              <button
                onClick={() => onMarkTraining(m)}
                className={`p-1 rounded border transition-colors ${
                  isTrainingExample
                    ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-400'
                    : 'bg-[#1a1a1a] border-[#242424] text-neutral-400 hover:text-white'
                }`}
                title={isTrainingExample ? 'Exemplo de treinamento' : 'Marcar como exemplo de treinamento'}
                aria-label="Marcar como exemplo"
              >
                <GraduationCap size={11} />
              </button>
            )}
          </div>

          <div
            className={`rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
              isIn
                ? 'bg-[#1a1a1a] border border-[#242424] text-neutral-200 rounded-tl-sm'
                : 'bg-white text-black rounded-tr-sm'
            } ${isTrainingExample ? 'ring-1 ring-emerald-500/40' : ''}`}
          >
            {quoted && (
              <button
                onClick={() => onQuoteClick(quoted.id)}
                className={`block w-full text-left mb-1.5 px-2 py-1.5 rounded border-l-2 ${
                  isIn
                    ? 'bg-[#0d0d0d] border-neutral-500 text-neutral-400'
                    : 'bg-black/5 border-black/30 text-black/60'
                }`}
              >
                <div className={`text-[10px] font-medium mb-0.5 ${isIn ? 'text-neutral-400' : 'text-black/70'}`}>
                  {quoted.direction === 'in' ? 'Cliente' : 'Você'}
                </div>
                <p className="text-[11px] line-clamp-2">{quoted.message_body || '(mídia)'}</p>
              </button>
            )}

            {m.media_type === 'audio' && m.media_url ? (
              <audio
                controls
                preload="metadata"
                className="max-w-full h-8"
                style={{ minWidth: 200 }}
              >
                <source src={m.media_url} />
              </audio>
            ) : m.media_type === 'image' && m.media_url ? (
              <button onClick={() => onImage(m.media_url!)} className="block">
                <img
                  src={m.media_url}
                  alt="Imagem"
                  loading="lazy"
                  className="max-w-full rounded-lg max-h-64 object-contain cursor-zoom-in"
                />
              </button>
            ) : (
              <p className="whitespace-pre-wrap break-words">{m.message_body}</p>
            )}

            <div className={`flex items-center justify-end gap-1 mt-1 ${isIn ? 'text-neutral-600' : 'text-neutral-500'}`}>
              <span className="text-[9px]">{formatTime(m.created_at)}</span>
              {!isIn && deliveryIcon(m.delivery_status)}
            </div>
          </div>
        </div>

        {!isIn && (
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
            <Bot size={11} className="text-black" />
          </div>
        )}
      </div>
    </>
  );
}

export const MessageBubble = memo(MessageBubbleComp);
