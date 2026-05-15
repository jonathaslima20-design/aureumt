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
            Equipes crescem linearmente. Demanda cresce exponencialmente.
            Cada minuto sem resposta e uma oportunidade transferida ao concorrente.
            O AuraTalk elimina esse gap com agentes que operam em latencia inferior a 2 segundos,
            24 horas por dia, sem intervalos.
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
        <div className="relative space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Card 1 */}
            <div className="glass rounded-2xl overflow-hidden relative aspect-square">
              <img
                src="https://yulbqkwrfyycjxbbuloj.supabase.co/storage/v1/object/public/imageslanding/image32221478956.png"
                alt="AI Agent"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-accent/60" />
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-accent/60" />
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-accent/60" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-accent/60" />
            </div>

            {/* Card 2 */}
            <div className="glass rounded-2xl overflow-hidden relative aspect-square">
              <img
                src="https://yulbqkwrfyycjxbbuloj.supabase.co/storage/v1/object/public/imageslanding/image54478.png"
                alt="AI Agent"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-accent/60" />
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-accent/60" />
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-accent/60" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-accent/60" />
            </div>

            {/* Card 3 */}
            <div className="glass rounded-2xl overflow-hidden relative aspect-square">
              <img
                src="https://yulbqkwrfyycjxbbuloj.supabase.co/storage/v1/object/public/imageslanding/image55957.jpg"
                alt="AI Agent"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-accent/60" />
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-accent/60" />
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-accent/60" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-accent/60" />
            </div>

            {/* Card 4 */}
            <div className="glass rounded-2xl overflow-hidden relative aspect-square">
              <img
                src="https://yulbqkwrfyycjxbbuloj.supabase.co/storage/v1/object/public/imageslanding/image65565977715.jpg"
                alt="AI Agent"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-accent/60" />
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-accent/60" />
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-accent/60" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-accent/60" />
            </div>
          </div>

          {/* Bottom overlay card */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
                <span className="font-mono text-[10px] text-accent font-bold">AT</span>
              </div>
              <div className="flex-1">
                <span className="block font-display font-semibold text-sm text-white uppercase tracking-wider">
                  AURATALK AGENT
                </span>
                <span className="flex items-center gap-2 font-mono text-[10px] text-gray-400">
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                  Respondendo
                </span>
              </div>
              <span className="font-mono text-[9px] text-accent/80">0.8s</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
