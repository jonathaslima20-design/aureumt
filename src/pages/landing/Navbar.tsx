import { useState, useRef, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from '../../components/Logo';

interface NavbarProps {
  onLogin: () => void;
}

export function Navbar({ onLogin }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const navLinks = [
    { label: 'COMO FUNCIONA', href: '#solucao' },
    { label: 'RECURSOS', href: '#features' },
    { label: 'SETUP', href: '#como-funciona' },
    { label: 'PLANOS', href: '#pricing' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-20 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between relative">
        <Logo />

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="font-mono text-[9px] text-green-500 tracking-[0.2em]">PLATFORM ONLINE</span>
          </div>
          <button
            onClick={onLogin}
            className="bg-white text-black px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-accent hover:text-white transition-all duration-300"
          >
            LOGIN
          </button>
        </div>

        <button
          ref={buttonRef}
          className="md:hidden text-white/60"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            className="md:hidden absolute right-6 top-full mt-2 w-48 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-3 flex flex-col gap-1 z-50"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="font-mono text-[10px] tracking-[0.15em] text-gray-400 uppercase hover:text-white hover:bg-white/5 transition-colors px-3 py-2 rounded-lg"
              >
                {link.label}
              </a>
            ))}
            <div className="border-t border-white/5 mt-1 pt-2">
              <button
                onClick={() => { setMenuOpen(false); onLogin(); }}
                className="w-full bg-accent text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-accent/80 transition-colors"
              >
                LOGIN
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
