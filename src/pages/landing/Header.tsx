import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  onLogin: () => void;
}

export function Header({ onLogin }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'AGENTES', href: '#agents' },
    { label: 'RECURSOS', href: '#features' },
    { label: 'COMO FUNCIONA', href: '#como-funciona' },
    { label: 'PLANOS', href: '#pricing' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-background/80 backdrop-blur-md border-b border-white/5' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="font-display font-bold text-sm tracking-widest uppercase text-white">
          AURA<span className="text-accent">//</span>TALK
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-mono text-[10px] tracking-[0.4em] uppercase text-white/50 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={onLogin}
            className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/60 hover:text-white transition-colors"
          >
            ENTRAR
          </button>
          <button
            onClick={onLogin}
            className="px-4 py-2 bg-accent text-white font-mono text-[10px] tracking-[0.2em] uppercase rounded hover:bg-accent/90 transition-colors"
          >
            COMECAR
          </button>
        </div>

        <button
          className="md:hidden text-white/60"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-md border-b border-white/5 px-6 py-4 space-y-3">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block font-mono text-[10px] tracking-[0.4em] uppercase text-white/50 hover:text-white py-2"
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={onLogin}
            className="w-full mt-2 px-4 py-2 bg-accent text-white font-mono text-[10px] tracking-[0.2em] uppercase rounded"
          >
            COMECAR
          </button>
        </div>
      )}
    </header>
  );
}
