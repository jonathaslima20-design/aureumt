import { useEffect, useState, useRef } from 'react';
import { Bell, Check, AlertTriangle } from 'lucide-react';
import { supabase, Notification } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function NotificationsDropdown() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications((data as Notification[]) || []);
    const unread = (data || []).filter((n: Notification) => !n.is_read).length;
    setUnreadCount(unread);
  };

  const fetchUnreadCount = async () => {
    if (!profile) return;
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [profile?.id]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = async () => {
    if (!profile) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleOpen = () => {
    setOpen(!open);
    if (!open) fetchNotifications();
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-500 hover:text-neutral-200 hover:bg-[#141414] transition-colors"
      >
        <Bell size={15} strokeWidth={1.8} />
        <span className="font-display font-medium">Notificacoes</span>
        {unreadCount > 0 && (
          <span className="absolute left-7 top-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-[#141414] border border-[#242424] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c1c1c]">
            <span className="text-xs text-white font-display font-medium">Notificacoes</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] text-neutral-500 hover:text-white flex items-center gap-1 transition-colors"
              >
                <Check size={10} /> Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={20} className="mx-auto text-neutral-700 mb-2" />
                <p className="text-xs text-neutral-600">Nenhuma notificacao</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { if (!n.is_read) markRead(n.id); }}
                  className={`w-full text-left px-4 py-3 border-b border-[#1c1c1c] last:border-0 hover:bg-[#1a1a1a] transition-colors ${
                    !n.is_read ? 'bg-[#0d1a0d]' : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      n.type === 'overflow' ? 'bg-amber-950/40 border border-amber-900/40' : 'bg-blue-950/40 border border-blue-900/40'
                    }`}>
                      <AlertTriangle size={10} className={n.type === 'overflow' ? 'text-amber-400' : 'text-blue-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white font-medium truncate">{n.title}</span>
                        {!n.is_read && <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0" />}
                      </div>
                      {n.body && (
                        <p className="text-[11px] text-neutral-500 truncate mt-0.5">{n.body}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {n.customer_number && (
                          <span className="text-[10px] text-neutral-600 font-mono">{n.customer_number}</span>
                        )}
                        <span className="text-[10px] text-neutral-700">{timeAgo(n.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
