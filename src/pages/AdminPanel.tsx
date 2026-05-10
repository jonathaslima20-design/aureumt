import { useEffect, useState } from 'react';
import { ArrowLeft, Save, Loader2, Check, Users, MessageCircle, Key } from 'lucide-react';
import { Logo } from '../components/Logo';
import { supabase, Profile, ApiConfig } from '../lib/supabase';

export function AdminPanel({ onBack }: { onBack: () => void }) {
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [geminiKey, setGeminiKey] = useState('');
  const [evoUrl, setEvoUrl] = useState('');
  const [evoKey, setEvoKey] = useState('');

  const load = async () => {
    const { data: cfg } = await supabase
      .from('api_configs')
      .select('*')
      .is('user_id', null)
      .maybeSingle();

    if (cfg) {
      setConfig(cfg);
      setGeminiKey(cfg.gemini_key || '');
      setEvoUrl(cfg.evolution_url || '');
      setEvoKey(cfg.evolution_key || '');
    }

    const { data: userList } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(userList || []);

    const { count } = await supabase
      .from('chat_logs')
      .select('*', { count: 'exact', head: true });
    setMessageCount(count || 0);

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    if (config) {
      await supabase
        .from('api_configs')
        .update({
          gemini_key: geminiKey,
          evolution_url: evoUrl,
          evolution_key: evoKey,
          is_active: true,
        })
        .eq('id', config.id);
    } else {
      const { data } = await supabase
        .from('api_configs')
        .insert({
          user_id: null,
          gemini_key: geminiKey,
          evolution_url: evoUrl,
          evolution_key: evoKey,
          is_active: true,
        })
        .select()
        .maybeSingle();
      setConfig(data);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updatePlan = async (id: string, plan_status: string) => {
    await supabase.from('profiles').update({ plan_status }).eq('id', id);
    load();
  };

  const toggleRole = async (id: string, current: string) => {
    const next = current === 'admin' ? 'user' : 'admin';
    await supabase.from('profiles').update({ role: next }).eq('id', id);
    load();
  };

  const planLabel = (p: string) => {
    if (p === 'active') return 'Ativo';
    if (p === 'inactive') return 'Inativo';
    return 'Teste';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={20} className="text-neutral-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="border-b border-[#1a1a1a] px-6 py-4 sticky top-0 bg-[#050505]/90 backdrop-blur-xl z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-neutral-500 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <Logo />
            <span className="text-xs px-2 py-0.5 rounded-md border border-[#1a1a1a] text-neutral-400 uppercase tracking-wider">
              Admin
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Central de Controle</h1>
          <p className="text-sm text-neutral-500 mt-1">Configuração global e supervisão de usuários.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Usuários" value={users.length} icon={<Users size={14} />} />
          <StatCard label="Mensagens" value={messageCount} icon={<MessageCircle size={14} />} />
          <StatCard
            label="Planos Ativos"
            value={users.filter((u) => u.plan_status === 'active').length}
            icon={<Check size={14} />}
          />
        </div>

        <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] p-6">
          <div className="flex items-center gap-2 mb-5">
            <Key size={14} className="text-neutral-500" />
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500">Credenciais Master</div>
              <div className="text-base text-white font-medium mt-0.5">Configuração Global de API</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-neutral-500 mb-2 block">
                Chave da API Gemini
              </label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors font-mono"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-neutral-500 mb-2 block">
                URL da Evolution
              </label>
              <input
                type="text"
                value={evoUrl}
                onChange={(e) => setEvoUrl(e.target.value)}
                placeholder="https://evolution.exemplo.com"
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors font-mono"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-neutral-500 mb-2 block">
                Chave da API Evolution
              </label>
              <input
                type="password"
                value={evoKey}
                onChange={(e) => setEvoKey(e.target.value)}
                placeholder="Token de acesso"
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors font-mono"
              />
            </div>
          </div>

          <button
            onClick={saveConfig}
            disabled={saving}
            className="mt-5 bg-white text-black rounded-lg px-5 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : saved ? (
              <>
                <Check size={14} /> Salvo
              </>
            ) : (
              <>
                <Save size={14} /> Salvar credenciais
              </>
            )}
          </button>
        </div>

        <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] overflow-hidden">
          <div className="p-6 border-b border-[#1a1a1a]">
            <div className="text-xs uppercase tracking-wider text-neutral-500">Gestão de Usuários</div>
            <div className="text-base text-white font-medium mt-0.5">Contas e Planos</div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500 border-b border-[#1a1a1a]">
                  <th className="px-6 py-3 font-normal">E-mail</th>
                  <th className="px-6 py-3 font-normal">Perfil</th>
                  <th className="px-6 py-3 font-normal">Plano</th>
                  <th className="px-6 py-3 font-normal">Criado em</th>
                  <th className="px-6 py-3 font-normal text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[#111] hover:bg-[#0d0d0d] transition-colors">
                    <td className="px-6 py-3 text-white">{u.email}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                          u.role === 'admin'
                            ? 'border-blue-900/40 bg-blue-950/30 text-blue-400'
                            : 'border-[#1a1a1a] text-neutral-400'
                        }`}
                      >
                        {u.role === 'admin' ? 'Admin' : 'Usuário'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <select
                        value={u.plan_status}
                        onChange={(e) => updatePlan(u.id, e.target.value)}
                        className="bg-[#050505] border border-[#1a1a1a] rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-neutral-600"
                      >
                        <option value="trial">Teste</option>
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                      </select>
                      <span className="sr-only">{planLabel(u.plan_status)}</span>
                    </td>
                    <td className="px-6 py-3 text-neutral-500 text-xs">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => toggleRole(u.id, u.role)}
                        className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded-md border border-[#1a1a1a] hover:border-[#262626] transition-colors"
                      >
                        Alternar perfil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] p-5 hover:border-[#262626] transition-colors">
      <div className="flex items-center gap-2 text-neutral-500 text-xs uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="text-3xl text-white font-semibold tracking-tight mt-2">{value}</div>
    </div>
  );
}
