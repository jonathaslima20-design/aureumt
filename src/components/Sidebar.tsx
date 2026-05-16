import { useState, useEffect } from 'react';
import { LayoutDashboard, Link2, MessagesSquare, LogOut, Shield, Menu, X, Bot, Database, Sparkles, GraduationCap, Eye, EyeOff } from 'lucide-react';
import { Logo } from './Logo';
import { NotificationsDropdown } from './NotificationsDropdown';
import { useAuth } from '../context/AuthContext';
import { useUIPreferences } from '../context/UIPreferencesContext';
import { supabase } from '../lib/supabase';

export type PageKey = 'overview' | 'agents' | 'templates' | 'connections' | 'knowledge' | 'training' | 'chat';

const ITEMS: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { key: 'chat', label: 'Chat', icon: MessagesSquare },
  { key: 'agents', label: 'Agentes', icon: Bot },
  { key: 'templates', label: 'Templates', icon: Sparkles },
  { key: 'connections', label: 'Conexões', icon: Link2 },
  { key: 'knowledge', label: 'Conhecimento', icon: Database },
  { key: 'training', label: 'Treinamento', icon: GraduationCap },
];

export function Sidebar({
  current,
  onChange,
  onNavAdmin,
  onOpenPlans,
}: {
  current: PageKey;
  onChange: (p: PageKey) => void;
  onNavAdmin?: () => void;
  onOpenPlans?: () => void;
}) {
  const { profile, signOut } = useAuth();
  const { focusMode, setFocusMode } = useUIPreferences();
  const [openMobile, setOpenMobile] = useState(false);
  const [userPlanName, setUserPlanName] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.plan_id) return;
    (async () => {
      const { data } = await supabase
        .from('plans')
        .select('name')
        .eq('id', profile.plan_id)
        .maybeSingle();
      if (data) setUserPlanName(data.name);
    })();
  }, [profile?.plan_id]);

  const initial = (profile?.email || 'U').slice(0, 1).toUpperCase();
  const handle = profile?.email?.split('@')[0] || 'Usuário';

  const content = (
    <div className="flex flex-col h-full relative">
      <div
        className="absolute pointer-events-none"
        style={{
          top: 0,
          left: 0,
          right: 0,
          height: 220,
          background: 'radial-gradient(ellipse 80% 60% at 40% 0%, rgba(255,255,255,0.04) 0%, transparent 70%)',
          zIndex: 0,
        }}
        aria-hidden="true"
      />

      <div className="px-5 pt-5 pb-4 relative z-10">
        <Logo size="md" />
      </div>

      <nav className="flex-1 py-1 px-3 space-y-0.5 relative z-10">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const active = current === it.key;
          return (
            <button
              key={it.key}
              onClick={() => {
                onChange(it.key);
                setOpenMobile(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                active
                  ? 'bg-white/[0.08] text-white border border-white/[0.08]'
                  : 'text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <Icon size={15} strokeWidth={1.6} className={active ? 'text-accent' : ''} />
              <span className="font-medium">{it.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 relative z-10 space-y-1">
        <div className="flex items-center gap-1 px-2">
          <NotificationsDropdown />
          <button
            onClick={() => setFocusMode(!focusMode)}
            className="p-1.5 rounded-md text-neutral-500 hover:text-white hover:bg-white/[0.08] transition-colors"
            title={focusMode ? 'Sair do modo focado' : 'Modo focado'}
          >
            {focusMode ? <Eye size={13} strokeWidth={1.6} /> : <EyeOff size={13} strokeWidth={1.6} />}
          </button>
          {profile?.role === 'admin' && onNavAdmin && (
            <button
              onClick={onNavAdmin}
              className="p-1.5 rounded-md text-neutral-500 hover:text-white hover:bg-white/[0.08] transition-colors"
              title="Painel Admin"
            >
              <Shield size={13} strokeWidth={1.6} />
            </button>
          )}
          <button
            onClick={signOut}
            className="p-1.5 rounded-md text-neutral-500 hover:text-white hover:bg-white/[0.08] transition-colors ml-auto"
            title="Sair"
          >
            <LogOut size={13} strokeWidth={1.6} />
          </button>
        </div>

        <div className="h-px bg-white/[0.06] mx-1" />

        <button
          onClick={() => onOpenPlans?.()}
          className="w-full flex items-center gap-2.5 px-2 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
            <span className="text-xs font-medium text-neutral-300">{initial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-neutral-200 truncate font-medium">{handle}</div>
            <div className="text-[10px] text-neutral-500 truncate font-mono">{profile?.email}</div>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] font-semibold px-1.5 py-0.5 rounded bg-white/[0.06] text-accent border border-white/[0.08] shrink-0">
            {userPlanName || 'Free'}
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {!openMobile && (
        <button
          onClick={() => setOpenMobile(true)}
          className="lg:hidden fixed top-4 left-4 z-30 glass rounded-lg p-2.5 text-white shadow-lg"
        >
          <Menu size={18} />
        </button>
      )}

      <aside className="hidden lg:flex w-60 flex-col fixed inset-y-0 left-0 z-20 bg-[#0a0a0a]/80 backdrop-blur-xl border-r border-white/[0.06]">
        {content}
      </aside>

      {openMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpenMobile(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#0a0a0a]/90 backdrop-blur-xl border-r border-white/[0.06] flex flex-col animate-slide-in-left">
            <button
              onClick={() => setOpenMobile(false)}
              className="absolute top-4 right-4 z-20 text-neutral-400 hover:text-white p-1 rounded-md hover:bg-white/[0.08] transition-colors"
            >
              <X size={18} />
            </button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
