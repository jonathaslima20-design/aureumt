import { useEffect, useState } from 'react';
import { Puzzle, Loader2, ExternalLink, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Integration = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_url: string | null;
  category: string;
  is_enabled: boolean;
  sort_order: number;
};

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('integrations')
        .select('*')
        .eq('is_enabled', true)
        .order('sort_order');
      setIntegrations(data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={20} className="animate-spin text-neutral-600" />
      </div>
    );
  }

  const categories = [...new Set(integrations.map((i) => i.category))];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <header>
        <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent block mb-1">CONECTAR</span>
        <h1 className="font-display font-bold text-xl tracking-tighter text-white uppercase">Integracoes</h1>
        <p className="text-sm text-neutral-500 mt-1">Conecte o AuraTalk com as ferramentas que voce ja usa.</p>
      </header>

      {integrations.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {categories.map((cat) => (
            <section key={cat}>
              <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-500 mb-3">{cat}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {integrations
                  .filter((i) => i.category === cat)
                  .map((integration) => (
                    <IntegrationCard key={integration.id} integration={integration} />
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  return (
    <div className="group bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-5 transition-all duration-300 hover:border-white/[0.12] hover:bg-[#121212] aura-card flex flex-col">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-[#141414] border border-[#242424] flex items-center justify-center overflow-hidden shrink-0">
          {integration.icon_url ? (
            <img src={integration.icon_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Puzzle size={18} className="text-neutral-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white">{integration.name}</div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-600 mt-0.5">{integration.category}</div>
        </div>
      </div>

      <p className="text-[11px] text-neutral-500 line-clamp-2 flex-1">{integration.description}</p>

      <div className="mt-4 pt-3 border-t border-white/[0.04]">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-950/30 border border-amber-800/30 text-amber-400">
            <Clock size={9} /> Em breve
          </span>
          <ExternalLink size={12} className="text-neutral-700" />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-[#242424] rounded-xl p-16 text-center bg-[#0d0d0d]">
      <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-[#242424] flex items-center justify-center mx-auto mb-4">
        <Puzzle size={24} className="text-neutral-600" strokeWidth={1.5} />
      </div>
      <p className="text-sm text-neutral-400 mb-1">Nenhuma integracao disponivel</p>
      <p className="text-xs text-neutral-600">Novas integracoes serao adicionadas em breve.</p>
    </div>
  );
}
