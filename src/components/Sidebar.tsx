import { useState, useEffect } from 'react';
import { LayoutDashboard, Link2, MessagesSquare, LogOut, Shield, Menu, X, Bot, Database, Sparkles, ChevronRight, GraduationCap } from 'lucide-react';
import { Logo } from './Logo';
import { NotificationsDropdown } from './NotificationsDropdown';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export type PageKey = 'overview' | 'agents' | 'templates' | 'connections' | 'knowledge' | 'training' | 'chat';

const ITEMS: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { key: 'chat', label: 'Chat', icon: MessagesSquare },
  { key: 'agents', label: 'Agentes', icon: Bot },
  { key: 'templates', label: 'Templates', icon: Sparkles },
  { key: 'connections', label: 'Conexões', icon: Link2 },
  { key: 'knowledge', label: 'Base de Conhecimento', icon: Database },
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

  const content = (
    <div className="flex flex-col h-full relative">
      {/* Aura light trail emanating from logo area */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 0,
          left: 0,
          right: 0,
          height: 220,
          background:
            'radial-gradient(ellipse 80% 60% at 40% 0%, rgba(255,255,255,0.04) 0%, transparent 70%)',
          zIndex: 0,
        }}
        aria-hidden="true"
      />
      <div className="px-5 py-5 border-b border-[#202020] relative z-10">
        <Logo />
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 relative z-10">
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative ${
                active
                  ? 'bg-[#1a1a1a] text-white'
                  : 'text-neutral-500 hover:text-neutral-200 hover:bg-[#141414]'
              }`}
            >
              {active && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                  style={{
                    background: 'linear-gradient(to bottom, #ffffff, #aaaaaa)',
                    boxShadow: '0 0 6px 1px rgba(255,255,255,0.25)',
                  }}
                />
              )}
              <Icon size={15} strokeWidth={1.8} />
              <span>{it.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-[#202020] p-3 space-y-1">
        <NotificationsDropdown />
        {profile?.role === 'admin' && onNavAdmin && (
          <button
            onClick={onNavAdmin}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-[#141414] transition-colors"
          >
            <Shield size={15} strokeWidth={1.8} />
            Painel Admin
          </button>
        )}

        {/* User card */}
        <button
          onClick={onOpenPlans}
          className="w-full group text-left px-3 py-2.5 rounded-lg hover:bg-[#141414] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            {/* Avatar initials */}
            <div className="w-7 h-7 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center shrink-0">
              <span className="text-[11px] font-semibold text-neutral-300">
                {(profile?.email || 'U').slice(0, 1).toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              {/* Email as name */}
              <div
                className="text-[11px] font-medium text-neutral-200 truncate leading-tight"
                title={profile?.email}
              >
                {profile?.email?.split('@')[0]}
              </div>
              {/* Full email */}
              <div
                className="text-[10px] text-neutral-600 truncate leading-tight mt-0.5"
                title={profile?.email}
              >
                {profile?.email}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {userPlanName ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded border border-emerald-900/40 bg-emerald-950/20 text-emerald-400 uppercase tracking-wider font-medium">
                  {userPlanName}
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-900/40 text-neutral-500 uppercase tracking-wider font-medium">
                  Free
                </span>
              )}
              <ChevronRight size={11} className="text-neutral-700 group-hover:text-neutral-500 transition-colors" />
            </div>
          </div>
        </button>

        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-500 hover:text-white hover:bg-[#141414] transition-colors"
        >
          <LogOut size={15} strokeWidth={1.8} />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      {!openMobile && (
        <button
          onClick={() => setOpenMobile(true)}
          className="lg:hidden fixed top-4 left-4 z-30 bg-[#0a0a0a]/90 backdrop-blur border border-[#1a1a1a] rounded-lg p-2.5 text-white shadow-lg"
        >
          <Menu size={18} />
        </button>
      )}

      <aside className="hidden lg:flex w-60 flex-col bg-[#0d0d0d] border-r border-[#202020] fixed inset-y-0 left-0 z-20 shadow-[4px_0_24px_0_rgba(0,0,0,0.4)]">
        {content}
      </aside>

      {openMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpenMobile(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#0d0d0d] border-r border-[#202020] flex flex-col shadow-[4px_0_24px_0_rgba(0,0,0,0.4)] animate-slide-in-left">
            <button
              onClick={() => setOpenMobile(false)}
              className="absolute top-4 right-4 z-20 text-neutral-400 hover:text-white p-1 rounded-md hover:bg-[#1a1a1a] transition-colors"
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
