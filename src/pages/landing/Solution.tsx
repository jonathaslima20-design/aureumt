const agents = [
  { img: 'https://yulbqkwrfyycjxbbuloj.supabase.co/storage/v1/object/public/imageslanding/image32221478956.png', time: '0.8s', delay: '0s' },
  { img: 'https://yulbqkwrfyycjxbbuloj.supabase.co/storage/v1/object/public/imageslanding/image54478.png', time: '1.2s', delay: '0.8s' },
  { img: 'https://yulbqkwrfyycjxbbuloj.supabase.co/storage/v1/object/public/imageslanding/image55957.jpg', time: '0.5s', delay: '1.6s' },
  { img: 'https://yulbqkwrfyycjxbbuloj.supabase.co/storage/v1/object/public/imageslanding/image65565977715.jpg', time: '0.9s', delay: '2.4s' },
];

export function Solution() {
  return (
    <section id="solucao" className="py-32 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left column */}
        <div className="space-y-8">
          <span className="font-mono text-[10px] text-accent tracking-[0.4em] uppercase">
            /// O DESAFIO OPERACIONAL
          </span>
          <h2 className="font-display font-bold text-4xl md:text-6xl tracking-tighter uppercase leading-[1.05]">
            ONDE A ESCALA HUMANA ENCONTRA O SEU LIMITE.
          </h2>
          <p className="text-gray-400 font-light leading-relaxed">
            A demanda cresce mais rápido que sua equipe.
            Cada minuto sem resposta pode virar uma venda perdida.
            O AuraTalk resolve isso com IA atendendo 24h por dia.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-white/5 rounded-xl p-6">
              <span className="font-display font-bold text-3xl text-accent">Zero</span>
              <p className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase mt-2">
                TEMPO DE ESPERA
              </p>
            </div>
            <div className="border border-white/5 rounded-xl p-6">
              <span className="font-display font-bold text-3xl text-white">100%</span>
              <p className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase mt-2">
                DISPONIBILIDADE
              </p>
            </div>
          </div>
        </div>

        {/* Right column - Agent visuals grid */}
        <div className="relative">
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {agents.map((agent, i) => (
              <div
                key={i}
                className="agent-card glass rounded-2xl overflow-hidden relative aspect-[2/3]"
                style={{ '--delay': agent.delay } as React.CSSProperties}
              >
                <img
                  src={agent.img}
                  alt="AI Agent"
                  className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute top-2 left-2 w-3 h-3 sm:top-3 sm:left-3 sm:w-4 sm:h-4 border-t-2 border-l-2 border-accent/60" />
                <div className="absolute top-2 right-2 w-3 h-3 sm:top-3 sm:right-3 sm:w-4 sm:h-4 border-t-2 border-r-2 border-accent/60" />
                <div className="absolute bottom-2 left-2 w-3 h-3 sm:bottom-3 sm:left-3 sm:w-4 sm:h-4 border-b-2 border-l-2 border-accent/60" />
                <div className="absolute bottom-2 right-2 w-3 h-3 sm:bottom-3 sm:right-3 sm:w-4 sm:h-4 border-b-2 border-r-2 border-accent/60" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-accent/30 px-1.5 py-1 sm:px-3 sm:py-2">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-accent/20 border border-accent/40 overflow-hidden shrink-0">
                      <img src={agent.img} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block font-display font-semibold text-[7px] sm:text-[10px] text-white uppercase tracking-wider truncate">AuraTalk Agent</span>
                      <span className="flex items-center gap-0.5 sm:gap-1 font-mono text-[6px] sm:text-[8px] text-emerald-400">
                        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="truncate">RESPONDENDO</span>
                        <span className="hidden sm:flex gap-0.5 ml-1">
                          <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="hidden sm:block font-mono text-[8px] text-gray-500 uppercase">Tempo Resp.</span>
                      <span className="block font-mono text-[10px] sm:text-sm text-white font-bold">{agent.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
