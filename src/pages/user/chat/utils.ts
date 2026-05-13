const AVATAR_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316',
  '#84cc16', '#0ea5e9', '#22c55e', '#eab308',
];

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

export function avatarInitial(name: string | null, number: string): string {
  const src = (name || number || '?').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] || '?';
  if (parts.length > 1) return (first + (parts[1][0] || '')).toUpperCase();
  return first.toUpperCase();
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return formatTime(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  const diff = now.getTime() - d.getTime();
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return d.toLocaleDateString('pt-BR', { weekday: 'short' });
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function dateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return 'Hoje';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function timeBucket(iso: string): 'today' | 'yesterday' | 'week' | 'older' {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'yesterday';
  if (now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000) return 'week';
  return 'older';
}

export function bucketLabel(b: 'today' | 'yesterday' | 'week' | 'older'): string {
  switch (b) {
    case 'today': return 'Hoje';
    case 'yesterday': return 'Ontem';
    case 'week': return 'Esta semana';
    case 'older': return 'Anteriores';
  }
}

export function highlightText(text: string, query: string): { before: string; match: string; after: string } | null {
  if (!query) return null;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return null;
  return {
    before: text.slice(0, idx),
    match: text.slice(idx, idx + query.length),
    after: text.slice(idx + query.length),
  };
}
