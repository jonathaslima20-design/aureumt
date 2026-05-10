import { useState } from 'react';
import { LayoutDashboard, Link2, MessagesSquare, LogOut, Shield, Menu, X, Bot, Database } from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';

export type PageKey = 'overview' | 'agents' | 'connections' | 'knowledge' | 'chat';

const ITEMS: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { key: 'agents', label: 'Agentes', icon: Bot },
  { key: 'connections', label: 'Conexões', icon: Link2 },
  { key: 'knowledge', label: 'Base de Conhecimento', icon: Database },
  { key: 'chat', label: 'Chat', icon: MessagesSquare },
];

export function Sidebar({
  current,
  onChange,
  onNavAdmin,
}: {
  current: PageKey;
  onChange: (p: PageKey) => void;
  onNavAdmin?: () => void;
}) {
  const { profile, signOut } = useAuth();
  const [openMobile, setOpenMobile] = useState(false);

  const content = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-[#1a1a1a]">
        <Logo />
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
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
                  ? 'bg-[#111] text-white'
                  : 'text-neutral-500 hover:text-white hover:bg-[#0d0d0d]'
              }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-r" />
              )}
              <Icon size={15} strokeWidth={1.8} />
              <span>{it.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-[#1a1a1a] p-3 space-y-1">
        {profile?.role === 'admin' && onNavAdmin && (
          <button
            onClick={onNavAdmin}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-[#0d0d0d] transition-colors"
          >
            <Shield size={15} strokeWidth={1.8} />
            Painel Admin
          </button>
        )}
        <div className="px-3 py-2 text-[11px] text-neutral-600 truncate" title={profile?.email}>
          {profile?.email}
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-500 hover:text-white hover:bg-[#0d0d0d] transition-colors"
        >
          <LogOut size={15} strokeWidth={1.8} />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpenMobile(true)}
        className="lg:hidden fixed top-4 left-4 z-40 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-2 text-white"
      >
        <Menu size={16} />
      </button>

      <aside className="hidden lg:flex w-60 flex-col bg-[#070707] border-r border-[#1a1a1a] fixed inset-y-0 left-0 z-20">
        {content}
      </aside>

      {openMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpenMobile(false)}
          />
          <aside className="relative w-64 bg-[#070707] border-r border-[#1a1a1a] flex flex-col">
            <button
              onClick={() => setOpenMobile(false)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white"
            >
              <X size={16} />
            </button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
