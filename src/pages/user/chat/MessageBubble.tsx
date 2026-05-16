import { memo, useState } from 'react';
import {
  User, Bot, Check, CheckCheck, Clock, AlertCircle, Copy, CornerUpLeft,
  GraduationCap, ThumbsUp, ThumbsDown, MessageSquarePlus, X, Loader2,
} from 'lucide-react';
import { ChatLog, supabase } from '../../../lib/supabase';
import { formatTime } from './utils';

type Props = {
  message: ChatLog;
  quoted: ChatLog | null;
  isUnreadDivider: boolean;
  isTrainingExample?: boolean;
  contactPictureUrl?: string | null;
  onReply: (m: ChatLog) => void;
  onImage: (url: string) => void;
  onQuoteClick: (id: string) => void;
  onMarkTraining?: (m: ChatLog) => void;
  onFeedbackChange?: (id: string, patch: Partial<ChatLog>) => void;
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
  contactPictureUrl,
  onReply,
  onImage,
  onQuoteClick,
  onMarkTraining,
  onFeedbackChange,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState(m.feedback_comment || '');
  const [savingFb, setSavingFb] = useState<null | 'up' | 'down' | 'comment'>(null);
  const isIn = m.direction === 'in';
  const quality = m.feedback_quality || '';

  const setQuality = async (next: 'good' | 'bad' | '') => {
    setSavingFb(next === 'bad' ? 'down' : 'up');
    const value = quality === next ? '' : next;
    const { error } = await supabase
      .from('chat_logs')
      .update({ feedback_quality: value })
      .eq('id', m.id);
    setSavingFb(null);
    if (!error) onFeedbackChange?.(m.id, { feedback_quality: value });
  };

  const saveComment = async () => {
    setSavingFb('comment');
    const { error } = await supabase
      .from('chat_logs')
      .update({ feedback_comment: comment.trim() })
      .eq('id', m.id);
    setSavingFb(null);
    if (!error) {
      onFeedbackChange?.(m.id, { feedback_comment: comment.trim() });
      setShowCommentBox(false);
    }
  };

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
        className={`group flex gap-2 items-end ${isIn ? 'justify-start' : 'justify-end'}`}
      >
        {isIn && (
          contactPictureUrl ? (
            <img
              src={contactPictureUrl}
              alt=""
              className="w-7 h-7 rounded-full object-cover shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#141414] border border-[#242424] flex items-center justify-center shrink-0">
              <User size={12} className="text-neutral-500" />
            </div>
          )
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

          {!isIn && (
            <div className="self-end mt-1 flex items-center gap-1">
              <button
                onClick={() => setQuality('good')}
                disabled={savingFb !== null}
                className={`p-1 rounded border transition-colors ${
                  quality === 'good'
                    ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-400'
                    : 'bg-[#1a1a1a] border-[#242424] text-neutral-500 hover:text-white opacity-0 group-hover:opacity-100'
                }`}
                title="Resposta boa"
                aria-label="Marcar como resposta boa"
              >
                {savingFb === 'up' ? <Loader2 size={11} className="animate-spin" /> : <ThumbsUp size={11} />}
              </button>
              <button
                onClick={() => setQuality('bad')}
                disabled={savingFb !== null}
                className={`p-1 rounded border transition-colors ${
                  quality === 'bad'
                    ? 'bg-red-950/40 border-red-900/50 text-red-400'
                    : 'bg-[#1a1a1a] border-[#242424] text-neutral-500 hover:text-white opacity-0 group-hover:opacity-100'
                }`}
                title="Resposta ruim"
                aria-label="Marcar como resposta ruim"
              >
                {savingFb === 'down' ? <Loader2 size={11} className="animate-spin" /> : <ThumbsDown size={11} />}
              </button>
              <button
                onClick={() => { setComment(m.feedback_comment || ''); setShowCommentBox((v) => !v); }}
                className={`p-1 rounded border transition-colors ${
                  m.feedback_comment
                    ? 'bg-sky-950/40 border-sky-900/50 text-sky-400'
                    : 'bg-[#1a1a1a] border-[#242424] text-neutral-500 hover:text-white opacity-0 group-hover:opacity-100'
                }`}
                title={m.feedback_comment ? 'Editar comentário' : 'Comentar'}
                aria-label="Comentar resposta"
              >
                <MessageSquarePlus size={11} />
              </button>
            </div>
          )}

          {!isIn && showCommentBox && (
            <div className="self-end mt-1.5 w-full max-w-md bg-[#0d0d0d] border border-[#242424] rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500">Comentário de treinamento</span>
                <button
                  onClick={() => setShowCommentBox(false)}
                  className="text-neutral-600 hover:text-white"
                  aria-label="Fechar"
                >
                  <X size={11} />
                </button>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="O que poderia ser melhorado nesta resposta?"
                className="w-full bg-[#070707] border border-[#1c1c1c] rounded px-2 py-1.5 text-[12px] text-white placeholder-neutral-700 focus:outline-none focus:border-[#363636] resize-none"
              />
              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  onClick={() => setShowCommentBox(false)}
                  className="text-[11px] text-neutral-500 hover:text-white px-2 py-1 rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveComment}
                  disabled={savingFb === 'comment'}
                  className="text-[11px] bg-white text-black hover:bg-neutral-200 disabled:opacity-50 px-2.5 py-1 rounded font-medium flex items-center gap-1"
                >
                  {savingFb === 'comment' ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                  Salvar
                </button>
              </div>
            </div>
          )}
        </div>

        {!isIn && (
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
            <Bot size={12} className="text-black" />
          </div>
        )}
      </div>
    </>
  );
}

export const MessageBubble = memo(MessageBubbleComp);
