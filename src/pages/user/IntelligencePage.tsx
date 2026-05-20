import { useState } from 'react';
import { Database, GraduationCap, Brain } from 'lucide-react';
import { Instance } from '../../lib/supabase';
import { KnowledgePage } from './KnowledgePage';
import { AgentTrainingPage } from './AgentTrainingPage';

type Tab = 'knowledge' | 'training';

export function IntelligencePage({ instances }: { instances: Instance[] }) {
  const [tab, setTab] = useState<Tab>('knowledge');

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <header>
        <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent block mb-1">IA</span>
        <h1 className="font-display font-bold text-xl tracking-tighter text-white uppercase flex items-center gap-2">
          <Brain size={20} className="text-accent" /> Inteligencia
        </h1>
        <p className="text-sm text-neutral-500 mt-1">Gerencie bases de conhecimento e treine a personalidade dos seus agentes.</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl w-fit">
        <button
          onClick={() => setTab('knowledge')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-display font-semibold uppercase tracking-wider transition-all ${
            tab === 'knowledge'
              ? 'bg-white/[0.08] text-white border border-white/[0.1] shadow-sm'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Database size={13} /> Conhecimento
        </button>
        <button
          onClick={() => setTab('training')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-display font-semibold uppercase tracking-wider transition-all ${
            tab === 'training'
              ? 'bg-white/[0.08] text-white border border-white/[0.1] shadow-sm'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <GraduationCap size={13} /> Treinamento
        </button>
      </div>

      {/* Content */}
      {tab === 'knowledge' && <KnowledgePage />}
      {tab === 'training' && <AgentTrainingPage instances={instances} />}
    </div>
  );
}
