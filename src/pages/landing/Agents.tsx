const agents = [
  {
    name: 'VENDAS',
    image: 'https://yulbqkwrfyycjxbbuloj.supabase.co/storage/v1/object/public/imageslanding/image32221478956.png',
    status: 'Qualificando lead',
    delay: '0s',
  },
  {
    name: 'SUPORTE',
    image: 'https://yulbqkwrfyycjxbbuloj.supabase.co/storage/v1/object/public/imageslanding/image55957.jpg',
    status: 'Resolvendo ticket',
    delay: '0.8s',
  },
  {
    name: 'ONBOARDING',
    image: 'https://yulbqkwrfyycjxbbuloj.supabase.co/storage/v1/object/public/imageslanding/image54478.png',
    status: 'Guiando cliente',
    delay: '1.6s',
  },
  {
    name: 'RETENCAO',
    image: 'https://yulbqkwrfyycjxbbuloj.supabase.co/storage/v1/object/public/imageslanding/image65565977715.jpg',
    status: 'Recuperando churn',
    delay: '2.4s',
  },
];

export function Agents() {
  return (
    <section id="agents" className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-accent">
            AGENTES ESPECIALIZADOS
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tighter text-white uppercase">
            UM AGENTE PARA CADA FUNCAO.
          </h2>
          <p className="text-sm text-white/30 max-w-md mx-auto">
            Cada agente opera de forma independente com personalidade, conhecimento e objetivos proprios.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((agent) => (
            <div key={agent.name} className="glass p-1 rounded-2xl group">
              <div className="relative overflow-hidden rounded-xl">
                <img
                  src={agent.image}
                  alt={`Agente ${agent.name}`}
                  className="w-full aspect-[3/4] object-cover"
                />

                {/* Scanner line */}
                <div
                  className="scanner-line"
                  style={{ animationDelay: agent.delay }}
                />

                {/* Corner decorations */}
                <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-accent/60" />
                <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-accent/60" />
                <div className="absolute bottom-14 left-3 w-4 h-4 border-b border-l border-accent/60" />
                <div className="absolute bottom-14 right-3 w-4 h-4 border-b border-r border-accent/60" />

                {/* Bottom overlay */}
                <div className="absolute bottom-0 left-0 right-0 agent-card-glass p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface border border-white/10 flex items-center justify-center">
                      <span className="font-mono text-[8px] text-accent font-bold">
                        {agent.name[0]}
                      </span>
                    </div>
                    <div>
                      <span className="block font-display font-semibold text-xs text-white uppercase tracking-wider">
                        {agent.name}
                      </span>
                      <span className="flex items-center gap-1.5 font-mono text-[9px] text-white/40">
                        <span className="flex gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                        {agent.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
