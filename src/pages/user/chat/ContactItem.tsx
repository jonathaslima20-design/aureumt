import { memo } from 'react';
import { Pin, Archive, ArchiveRestore } from 'lucide-react';
import { ContactLabel } from '../../../lib/supabase';
import { Avatar } from './Avatar';
import { formatRelativeTime, highlightText } from './utils';

export type ContactSummary = {
  number: string;
  name: string | null;
  lastMessage: string;
  lastAt: string;
  manual: boolean;
  pinned: boolean;
  archived: boolean;
  unread: number;
  labels: ContactLabel[];
};

type Props = {
  contact: ContactSummary;
  active: boolean;
  searchQuery?: string;
  snippet?: string | null;
  onClick: () => void;
  onTogglePin: () => void;
  onToggleArchive: () => void;
};

function HL({ text, query }: { text: string; query?: string }) {
  if (!query) return <>{text}</>;
  const h = highlightText(text, query);
  if (!h) return <>{text}</>;
  return (
    <>
      {h.before}
      <mark className="bg-amber-400/30 text-amber-200 rounded px-0.5">{h.match}</mark>
      {h.after}
    </>
  );
}

function ContactItemComp({
  contact: c,
  active,
  searchQuery,
  snippet,
  onClick,
  onTogglePin,
  onToggleArchive,
}: Props) {
  const hasUnread = c.unread > 0;
  return (
    <button
      onClick={onClick}
      role="option"
      aria-selected={active}
      className={`group w-full text-left px-3 py-3 border-b border-[#1a1a1a] transition-colors relative ${
        active ? 'bg-[#1a1a1a]' : 'hover:bg-[#0d0d0d]'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={c.name} number={c.number} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {c.pinned && <Pin size={10} className="text-neutral-400 shrink-0" />}
              <span className={`text-xs truncate ${hasUnread ? 'text-white font-semibold' : 'text-white font-medium'}`}>
                <HL text={c.name || c.number} query={searchQuery} />
              </span>
            </div>
            <span className={`text-[10px] shrink-0 ${hasUnread ? 'text-emerald-400 font-medium' : 'text-neutral-600'}`}>
              {formatRelativeTime(c.lastAt)}
            </span>
          </div>
          {c.name && (
            <div className="text-[10px] text-neutral-600 font-mono mb-0.5 truncate">
              <HL text={c.number} query={searchQuery} />
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <p className={`text-[11px] truncate flex-1 ${hasUnread ? 'text-neutral-300' : 'text-neutral-500'}`}>
              {snippet ? <HL text={snippet} query={searchQuery} /> : c.lastMessage}
            </p>
            {hasUnread && (
              <span className="text-[10px] bg-emerald-500 text-black font-semibold rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center shrink-0">
                {c.unread > 99 ? '99+' : c.unread}
              </span>
            )}
          </div>
          {(c.manual || c.labels.length > 0) && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {c.manual && (
                <span className="text-[9px] bg-amber-950/40 border border-amber-900/40 text-amber-400 px-1.5 py-0.5 rounded">
                  Manual
                </span>
              )}
              {c.labels.slice(0, 2).map((l) => (
                <span
                  key={l.id}
                  className="text-[9px] px-1.5 py-0.5 rounded"
                  style={{ background: l.color + '22', color: l.color, border: `1px solid ${l.color}44` }}
                >
                  {l.label}
                </span>
              ))}
              {c.labels.length > 2 && (
                <span className="text-[9px] text-neutral-600">+{c.labels.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions on hover */}
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onTogglePin(); } }}
          className={`p-1 rounded transition-colors cursor-pointer ${
            c.pinned
              ? 'text-amber-400 hover:bg-amber-950/40'
              : 'text-neutral-500 hover:text-white hover:bg-[#222]'
          }`}
          title={c.pinned ? 'Desafixar' : 'Fixar'}
        >
          <Pin size={11} />
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onToggleArchive(); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onToggleArchive(); } }}
          className="p-1 rounded text-neutral-500 hover:text-white hover:bg-[#222] transition-colors cursor-pointer"
          title={c.archived ? 'Desarquivar' : 'Arquivar'}
        >
          {c.archived ? <ArchiveRestore size={11} /> : <Archive size={11} />}
        </span>
      </div>
    </button>
  );
}

export const ContactItem = memo(ContactItemComp);
