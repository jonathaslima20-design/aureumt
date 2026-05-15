import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from '../../components/Logo';

interface NavbarProps {
  onLogin: () => void;
}

export function Navbar({ onLogin }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { label: 'O QUE E', href: '#solucao' },
    { label: 'RECURSOS', href: '#features' },
    { label: 'SETUP', href: '#como-funciona' },
    { label: 'PLANOS', href: '#pricing' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-20 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
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
          className="md:hidden text-white/60"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-20 bg-background/95 backdrop-blur-2xl z-40 flex flex-col items-center justify-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-3xl font-display font-bold text-white/80 hover:text-accent transition-colors uppercase tracking-tight"
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={() => { setMenuOpen(false); onLogin(); }}
            className="mt-4 bg-accent text-white px-8 py-3 text-sm font-bold uppercase tracking-widest rounded"
          >
            LOGIN
          </button>
        </div>
      )}
    </nav>
  );
}
