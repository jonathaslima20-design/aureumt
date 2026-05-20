type Props = {
  name: string;
  url?: string;
  color?: string;
  size?: number;
  ring?: boolean;
  className?: string;
};

function initials(name: string): string {
  const clean = (name || '').trim();
  if (!clean) return 'A';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AgentAvatar({ name, url, color = '#3b82f6', size = 32, ring = false, className = '' }: Props) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    background: url ? undefined : `linear-gradient(135deg, ${color}, ${color}cc)`,
    fontSize: Math.max(10, Math.floor(size * 0.38)),
    ...(ring ? {
      boxShadow: '0 0 0 2px rgba(255,59,0,0.4), 0 0 12px 2px rgba(255,59,0,0.1)',
    } : {}),
  };

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-semibold shrink-0 overflow-hidden ${ring ? 'border-0' : 'border border-white/10'} ${className}`}
      style={style}
    >
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="leading-none select-none">{initials(name)}</span>
      )}
    </div>
  );
}
