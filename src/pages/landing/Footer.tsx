export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#050505] py-20 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="text-center md:text-left space-y-2">
          <img
            src="/auratalk_logo_sem_fundo.png"
            alt="AuraTalk"
            className="h-8 w-auto object-contain"
          />
          <p className="font-mono text-[9px] tracking-[0.2em] text-gray-600 uppercase">
            Agentes de IA para WhatsApp. Automacao Conversacional Deterministica.
          </p>
        </div>

        <div className="flex items-center gap-6">
          <a href="#" className="font-mono text-[9px] tracking-[0.2em] uppercase text-gray-500 hover:text-white transition-colors">
            TERMOS
          </a>
          <a href="#" className="font-mono text-[9px] tracking-[0.2em] uppercase text-gray-500 hover:text-white transition-colors">
            PRIVACIDADE
          </a>
          <a href="#" className="font-mono text-[9px] tracking-[0.2em] uppercase text-gray-500 hover:text-white transition-colors">
            API STATUS
          </a>
        </div>

        <span className="font-mono text-[9px] tracking-[0.2em] text-gray-700">
          &copy; 2024 AURATALK AI SYSTEMS.
        </span>
      </div>
    </footer>
  );
}
