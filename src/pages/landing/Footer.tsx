export function Footer() {
  return (
    <footer className="py-20 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <span className="font-display font-bold text-sm tracking-widest uppercase text-white">
          AURA<span className="text-accent">//</span>TALK
        </span>

        <div className="flex items-center gap-6">
          <a href="#" className="font-mono text-[9px] tracking-[0.3em] uppercase text-white/30 hover:text-white/60 transition-colors">
            TERMOS
          </a>
          <a href="#" className="font-mono text-[9px] tracking-[0.3em] uppercase text-white/30 hover:text-white/60 transition-colors">
            PRIVACIDADE
          </a>
          <a href="#" className="font-mono text-[9px] tracking-[0.3em] uppercase text-white/30 hover:text-white/60 transition-colors">
            API STATUS
          </a>
        </div>

        <span className="font-mono text-[9px] tracking-[0.2em] text-white/20">
          &copy; 2024 AURATALK
        </span>
      </div>
    </footer>
  );
}
