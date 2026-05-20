import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Save, Loader2, Check, Users, MessageCircle, Key,
  Zap, DollarSign, ChevronDown, ChevronUp, AlertTriangle, TrendingUp,
  LayoutDashboard, ShieldCheck, CreditCard, LayoutTemplate, Wallet, BookOpen,
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { supabase, Profile, ApiConfig, TokenStatsByUser, TokenDailySeries, calcCostBRL, Plan } from '../lib/supabase';
import { PlansManagementPage } from './admin/PlansManagementPage';
import { TemplatesPage } from './admin/TemplatesPage';
import { MercadoPagoPage } from './admin/MercadoPagoPage';
import { HelpCenterAdminPage } from './admin/HelpCenterAdminPage';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString('pt-BR');
}

function fmtCost(tokens: number): string {
  return `R$ ${calcCostBRL(tokens).toFixed(4)}`;
}

type TokenStatus = 'no_limit' | 'ok' | 'alert' | 'exceeded';

function tokenStatus(stat: TokenStatsByUser): TokenStatus {
  if (!stat.token_limit) return 'no_limit';
  if (stat.tokens_month >= stat.token_limit) return 'exceeded';
  if (stat.token_alert_threshold && stat.tokens_month >= stat.token_alert_threshold) return 'alert';
  return 'ok';
}

function StatusBadge({ status }: { status: TokenStatus }) {
  const map: Record<TokenStatus, { label: string; cls: string }> = {
    no_limit: { label: 'Sem limite', cls: 'border-[#1a1a1a] text-neutral-500' },
    ok:       { label: 'OK',         cls: 'border-emerald-900/40 bg-emerald-950/30 text-emerald-400' },
    alert:    { label: 'Alerta',     cls: 'border-amber-900/40 bg-amber-950/30 text-amber-400' },
    exceeded: { label: 'Excedido',   cls: 'border-red-900/40 bg-red-950/30 text-red-400' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-md border uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const onMove = React.useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--x', `${e.clientX - r.left}px`);
    ref.current.style.setProperty('--y', `${e.clientY - r.top}px`);
  }, []);

  return (
    <div ref={ref} onMouseMove={onMove} className="spotlight glass rounded-2xl p-4 hover:border-white/10 transition-colors">
      <div className="flex items-center gap-2 text-neutral-500 font-mono text-[11px] uppercase tracking-wider mb-2">
        {icon}
        {label}
      </div>
      <div className="text-xl text-white font-display font-bold tracking-tight">{value}</div>
    </div>
  );
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────

function MiniBarChart({ series }: { series: TokenDailySeries[] }) {
  const max = Math.max(1, ...series.map((s) => s.tokens));
  return (
    <div className="flex items-end gap-1.5 h-16">
      {series.map((s) => (
        <div key={s.day} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex-1 flex items-end">
            <div
              className="w-full bg-white/70 rounded-t transition-all"
              style={{ height: `${(s.tokens / max) * 100}%`, minHeight: s.tokens > 0 ? 3 : 0 }}
            />
          </div>
          <div className="text-[9px] text-neutral-600 font-mono whitespace-nowrap">
            {new Date(s.day + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Expandable token row ─────────────────────────────────────────────────────

function TokenRow({ stat, onSaved }: { stat: TokenStatsByUser; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [series, setSeries] = useState<TokenDailySeries[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);

  const [limitInput, setLimitInput] = useState(stat.token_limit?.toString() ?? '');
  const [thresholdInput, setThresholdInput] = useState(stat.token_alert_threshold?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const status = tokenStatus(stat);

  const expand = async () => {
    setOpen((v) => !v);
    if (!open && series.length === 0) {
      setLoadingSeries(true);
      const { data } = await supabase.rpc('get_token_daily_series', {
        p_user_id: stat.user_id,
        p_days: 7,
      });
      setSeries((data as TokenDailySeries[]) || []);
      setLoadingSeries(false);
    }
  };

  const save = async () => {
    setSaving(true);
    await supabase.from('profiles').update({
      token_limit: limitInput ? parseInt(limitInput, 10) : null,
      token_alert_threshold: thresholdInput ? parseInt(thresholdInput, 10) : null,
    }).eq('id', stat.user_id);
    setSaving(false);
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2000);
    onSaved();
  };

  return (
    <>
      <tr
        className="border-b border-white/[0.04] hover:bg-[#0d0d0d] transition-colors cursor-pointer"
        onClick={expand}
      >
        <td className="px-4 py-3 text-white text-sm">{stat.email}</td>
        <td className="px-4 py-3 text-neutral-300 text-xs font-mono">{fmtTokens(stat.tokens_today)}</td>
        <td className="px-4 py-3 text-neutral-300 text-xs font-mono">{fmtTokens(stat.tokens_7d)}</td>
        <td className="px-4 py-3 text-neutral-300 text-xs font-mono">{fmtTokens(stat.tokens_month)}</td>
        <td className="px-4 py-3 text-neutral-400 text-xs font-mono">{fmtCost(stat.tokens_month)}</td>
        <td className="px-4 py-3 text-neutral-500 text-xs font-mono">
          {stat.token_limit ? fmtTokens(stat.token_limit) : '—'}
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={status} />
        </td>
        <td className="px-4 py-3 text-right">
          {open
            ? <ChevronUp size={14} className="text-neutral-500 ml-auto" />
            : <ChevronDown size={14} className="text-neutral-500 ml-auto" />}
        </td>
      </tr>

      {open && (
        <tr className="border-b border-white/[0.04] bg-[#080808]">
          <td colSpan={8} className="px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-3">
                  Tokens por dia — últimos 7 dias
                </div>
                {loadingSeries ? (
                  <div className="h-16 flex items-center">
                    <Loader2 size={14} className="text-neutral-600 animate-spin" />
                  </div>
                ) : series.length > 0 ? (
                  <MiniBarChart series={series} />
                ) : (
                  <p className="text-xs text-neutral-600 h-16 flex items-center">Sem dados</p>
                )}
              </div>

              <div className="space-y-3">
                <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                  Limites de token
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] text-neutral-500 mb-1 block">Limite mensal</label>
                    <input
                      type="number"
                      value={limitInput}
                      onChange={(e) => setLimitInput(e.target.value)}
                      placeholder="ex: 500000"
                      className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600 font-mono"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] text-neutral-500 mb-1 block">Alertar a partir de</label>
                    <input
                      type="number"
                      value={thresholdInput}
                      onChange={(e) => setThresholdInput(e.target.value)}
                      placeholder="ex: 400000"
                      className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600 font-mono"
                    />
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); save(); }}
                  disabled={saving}
                  className="bg-white text-black rounded-lg px-4 py-2 text-xs font-medium flex items-center gap-1.5 hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : savedOk ? <><Check size={12} /> Salvo</> : <><Save size={12} /> Salvar limites</>}
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#111] grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              {[
                { label: 'Total histórico', value: fmtTokens(stat.tokens_total) },
                { label: 'Custo histórico', value: `R$ ${calcCostBRL(stat.tokens_total).toFixed(4)}` },
                { label: 'Tokens este mês', value: fmtTokens(stat.tokens_month) },
                { label: 'Custo este mês', value: fmtCost(stat.tokens_month) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-3">
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">{label}</div>
                  <div className="text-sm font-mono text-white">{value}</div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Menu items ───────────────────────────────────────────────────────────────

type AdminSection = 'dashboard' | 'users' | 'tokens' | 'credentials' | 'plans' | 'templates' | 'mercadopago' | 'helpcenter';

const MENU_ITEMS: { id: AdminSection; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'dashboard',   label: 'Dashboard',          icon: <LayoutDashboard size={15} />, description: 'Visão geral do sistema' },
  { id: 'users',       label: 'Gestão de Usuários', icon: <Users size={15} />,           description: 'Contas, planos e perfis' },
  { id: 'plans',       label: 'Gestão de Planos',   icon: <CreditCard size={15} />,      description: 'Planos, preços e links' },
  { id: 'templates',   label: 'Templates de Agente', icon: <LayoutTemplate size={15} />, description: 'Biblioteca de Agentes' },
  { id: 'helpcenter',  label: 'Central de Ajuda',   icon: <BookOpen size={15} />,        description: 'Artigos e tutoriais' },
  { id: 'tokens',      label: 'Consumo de Tokens',  icon: <Zap size={15} />,             description: 'Uso e limites por usuário' },
  { id: 'credentials', label: 'Credenciais',        icon: <ShieldCheck size={15} />,     description: 'Chaves de API globais' },
  { id: 'mercadopago', label: 'Mercado Pago',       icon: <Wallet size={15} />,          description: 'Checkout Transparente' },
];

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminPanel({ onBack }: { onBack: () => void }) {
  const [section, setSection] = useState<AdminSection>('dashboard');
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [tokenStats, setTokenStats] = useState<TokenStatsByUser[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filterAlert, setFilterAlert] = useState(false);

  const [geminiKey, setGeminiKey] = useState('');
  const [evoUrl, setEvoUrl] = useState('');
  const [evoKey, setEvoKey] = useState('');

  const load = async () => {
    const [cfgRes, userRes, countRes, statsRes, plansRes] = await Promise.all([
      supabase.from('api_configs').select('*').is('user_id', null).maybeSingle(),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('chat_logs').select('*', { count: 'exact', head: true }),
      supabase.rpc('get_token_stats_by_user'),
      supabase.from('plans').select('*').order('sort_order', { ascending: true }),
    ]);

    if (cfgRes.data) {
      setConfig(cfgRes.data);
      setGeminiKey(cfgRes.data.gemini_key || '');
      setEvoUrl(cfgRes.data.evolution_url || '');
      setEvoKey(cfgRes.data.evolution_key || '');
    }
    setUsers(userRes.data || []);
    setAllPlans(plansRes.data || []);
    setMessageCount(countRes.count || 0);
    setTokenStats((statsRes.data as TokenStatsByUser[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveConfig = async () => {
    setSaving(true);
    if (config) {
      await supabase.from('api_configs').update({ gemini_key: geminiKey, evolution_url: evoUrl, evolution_key: evoKey, is_active: true }).eq('id', config.id);
    } else {
      const { data } = await supabase.from('api_configs').insert({ user_id: null, gemini_key: geminiKey, evolution_url: evoUrl, evolution_key: evoKey, is_active: true }).select().maybeSingle();
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

  const assignPlan = async (userId: string, planId: string | null) => {
    if (planId) {
      await supabase.from('profiles').update({ plan_id: planId, plan_status: 'active' }).eq('id', userId);
      // Upsert user_plan
      const { data: existing } = await supabase
        .from('user_plans')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();
      if (existing) {
        await supabase.from('user_plans').update({ plan_id: planId }).eq('id', existing.id);
      } else {
        await supabase.from('user_plans').insert({
          user_id: userId,
          plan_id: planId,
          billing_cycle: 'monthly',
          status: 'active',
        });
      }
    } else {
      await supabase.from('profiles').update({ plan_id: null, plan_status: 'trial' }).eq('id', userId);
      await supabase.from('user_plans').update({ status: 'cancelled' }).eq('user_id', userId).eq('status', 'active');
    }
    load();
  };

  const toggleRole = async (id: string, current: string) => {
    const next = current === 'admin' ? 'user' : 'admin';
    await supabase.from('profiles').update({ role: next }).eq('id', id);
    load();
  };

  const globalTokensToday = tokenStats.reduce((s, r) => s + (r.tokens_today || 0), 0);
  const globalTokensMonth = tokenStats.reduce((s, r) => s + (r.tokens_month || 0), 0);

  const alertCount = tokenStats.filter((s) => {
    const st = tokenStatus(s);
    return st === 'alert' || st === 'exceeded';
  }).length;

  const displayedStats = filterAlert
    ? tokenStats.filter((s) => { const st = tokenStatus(s); return st === 'alert' || st === 'exceeded'; })
    : tokenStats;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={20} className="text-neutral-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
      {/* Top bar */}
      <header className="border-b border-white/[0.05] px-6 py-4 sticky top-0 bg-background/80 backdrop-blur-xl z-20 flex items-center gap-4">
        <button onClick={onBack} className="text-neutral-500 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </button>
        <Logo />
        <span className="font-mono text-[9px] px-2 py-0.5 rounded-md border border-white/[0.08] text-accent uppercase tracking-[0.2em]">
          ADMIN
        </span>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-60 shrink-0 border-r border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-[57px] h-[calc(100vh-57px)] flex flex-col py-4 overflow-y-auto">
          <div className="px-4 mb-3">
            <span className="font-mono text-[9px] text-neutral-600 uppercase tracking-[0.2em]">MENU</span>
          </div>
          <nav className="flex flex-col gap-0.5 px-2">
            {MENU_ITEMS.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group ${
                    active
                      ? 'bg-white/[0.08] text-white border border-white/[0.08]'
                      : 'text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <span className={`shrink-0 transition-colors ${active ? 'text-accent' : 'text-neutral-600 group-hover:text-neutral-400'}`}>
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <div className={`text-xs font-medium leading-snug ${active ? 'text-white' : ''}`}>
                      {item.label}
                    </div>
                    <div className="text-[10px] text-neutral-600 leading-snug truncate mt-0.5 font-mono">
                      {item.description}
                    </div>
                  </div>
                  {item.id === 'tokens' && alertCount > 0 && (
                    <span className="ml-auto shrink-0 font-mono text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-1.5 py-0.5 leading-none">
                      {alertCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-8 py-8">

            {/* ── Dashboard ── */}
            {section === 'dashboard' && (
              <div className="space-y-6">
                <SectionHeader
                  tag="SISTEMA"
                  title="Dashboard"
                  subtitle="Visão geral do sistema em tempo real."
                />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <StatCard label="Usuários" value={users.length.toString()} icon={<Users size={13} />} />
                  <StatCard label="Mensagens" value={messageCount.toLocaleString('pt-BR')} icon={<MessageCircle size={13} />} />
                  <StatCard label="Planos Ativos" value={users.filter((u) => u.plan_status === 'active').length.toString()} icon={<Check size={13} />} />
                  <StatCard label="Tokens Hoje" value={fmtTokens(globalTokensToday)} icon={<Zap size={13} />} />
                  <StatCard label="Tokens Mês" value={fmtTokens(globalTokensMonth)} icon={<TrendingUp size={13} />} />
                  <StatCard label="Custo Mês" value={`R$ ${calcCostBRL(globalTokensMonth).toFixed(2)}`} icon={<DollarSign size={13} />} />
                </div>

                {/* Quick access cards */}
                <div className="grid grid-cols-2 gap-3">
                  {MENU_ITEMS.filter((m) => m.id !== 'dashboard').map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSection(item.id)}
                      className="flex items-center gap-4 p-4 glass rounded-2xl hover:border-white/10 transition-all text-left group"
                    >
                      <span className="text-neutral-500 group-hover:text-neutral-300 transition-colors">{item.icon}</span>
                      <div>
                        <div className="text-sm text-white font-medium">{item.label}</div>
                        <div className="text-[11px] text-neutral-600 mt-0.5">{item.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Gestão de Usuários ── */}
            {section === 'users' && (
              <div className="space-y-6">
                <SectionHeader
                  tag="USUARIOS"
                  title="Gestão de Usuários"
                  subtitle={`${users.length} ${users.length === 1 ? 'conta cadastrada' : 'contas cadastradas'} · ${users.filter((u) => u.plan_status === 'active').length} ativas`}
                />
                <div className="glass rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left font-mono text-[11px] uppercase tracking-wider text-neutral-500 border-b border-white/[0.06]">
                          <th className="px-6 py-3 font-normal">E-mail</th>
                          <th className="px-6 py-3 font-normal">Perfil</th>
                          <th className="px-6 py-3 font-normal">Plano</th>
                          <th className="px-6 py-3 font-normal">Criado em</th>
                          <th className="px-6 py-3 font-normal text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-xs text-neutral-600">
                              Nenhum usuário encontrado
                            </td>
                          </tr>
                        ) : users.map((u) => (
                          <tr key={u.id} className="border-b border-white/[0.04] hover:bg-[#0d0d0d] transition-colors">
                            <td className="px-6 py-3 text-white">{u.email}</td>
                            <td className="px-6 py-3">
                              <span className={`text-[11px] px-2 py-0.5 rounded-md border uppercase tracking-wider ${u.role === 'admin' ? 'border-blue-900/40 bg-blue-950/30 text-blue-400' : 'border-[#1a1a1a] text-neutral-400'}`}>
                                {u.role === 'admin' ? 'Admin' : 'Usuário'}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <select
                                value={u.plan_id || ''}
                                onChange={(e) => assignPlan(u.id, e.target.value || null)}
                                className="bg-[#050505] border border-[#1a1a1a] rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-neutral-600"
                              >
                                <option value="">Sem plano</option>
                                {allPlans.map((p) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
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
              </div>
            )}

            {/* ── Consumo de Tokens ── */}
            {section === 'tokens' && (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <SectionHeader
                    tag="TOKEN ANALYTICS"
                    title="Consumo de Tokens"
                    subtitle="Detalhamento por usuário. Custo estimado com base no preço de saída do Gemini 2.5 Flash (US$ 0,60 / 1M tokens · câmbio R$ 5,10)."
                  />
                  {alertCount > 0 && (
                    <button
                      onClick={() => setFilterAlert((v) => !v)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${filterAlert ? 'border-amber-800/60 bg-amber-950/40 text-amber-400' : 'border-amber-900/40 bg-amber-950/20 text-amber-500 hover:text-amber-400'}`}
                    >
                      <AlertTriangle size={12} />
                      {alertCount} {alertCount === 1 ? 'usuário em alerta' : 'usuários em alerta'}
                      {filterAlert ? ' · Mostrar todos' : ' · Filtrar'}
                    </button>
                  )}
                </div>

                <div className="glass rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left font-mono text-[11px] uppercase tracking-wider text-neutral-500 border-b border-white/[0.06]">
                          <th className="px-4 py-3 font-normal">E-mail</th>
                          <th className="px-4 py-3 font-normal">Hoje</th>
                          <th className="px-4 py-3 font-normal">7 dias</th>
                          <th className="px-4 py-3 font-normal">Este mês</th>
                          <th className="px-4 py-3 font-normal">Custo mês</th>
                          <th className="px-4 py-3 font-normal">Limite mensal</th>
                          <th className="px-4 py-3 font-normal">Status</th>
                          <th className="px-4 py-3 font-normal text-right"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedStats.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-10 text-center text-xs text-neutral-600">
                              {filterAlert ? 'Nenhum usuário em alerta' : 'Nenhum dado de consumo'}
                            </td>
                          </tr>
                        ) : (
                          displayedStats.map((stat) => (
                            <TokenRow key={stat.user_id} stat={stat} onSaved={load} />
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── Gestão de Planos ── */}
            {section === 'plans' && <PlansManagementPage />}

            {/* ── Templates de Agente ── */}
            {section === 'templates' && <TemplatesPage />}

            {/* ── Central de Ajuda ── */}
            {section === 'helpcenter' && <HelpCenterAdminPage />}

            {/* ── Mercado Pago ── */}
            {section === 'mercadopago' && <MercadoPagoPage />}

            {/* ── Credenciais ── */}
            {section === 'credentials' && (
              <div className="space-y-6">
                <SectionHeader
                  tag="SEGURANCA"
                  title="Credenciais"
                  subtitle="Chaves de API globais utilizadas por todos os agentes do sistema."
                />
                <div className="glass rounded-2xl p-6 space-y-5">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.04]">
                    <Key size={14} className="text-neutral-500" />
                    <div>
                      <div className="text-xs uppercase tracking-wider text-neutral-500">API Gemini</div>
                      <div className="text-sm text-white font-medium mt-0.5">Google Gemini 2.5 Flash</div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-neutral-500 mb-2 block">Chave da API Gemini</label>
                    <input
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIza..."
                      className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2.5 pt-2 pb-4 border-b border-white/[0.04]">
                    <Key size={14} className="text-neutral-500" />
                    <div>
                      <div className="text-xs uppercase tracking-wider text-neutral-500">Evolution API</div>
                      <div className="text-sm text-white font-medium mt-0.5">Integração WhatsApp</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs uppercase tracking-wider text-neutral-500 mb-2 block">URL da Evolution</label>
                      <input
                        type="text"
                        value={evoUrl}
                        onChange={(e) => setEvoUrl(e.target.value)}
                        placeholder="https://evolution.exemplo.com"
                        className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider text-neutral-500 mb-2 block">Chave da API Evolution</label>
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
                    className="bg-white text-black rounded-lg px-5 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <><Check size={14} /> Salvo</> : <><Save size={14} /> Salvar credenciais</>}
                  </button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, tag }: { title: string; subtitle?: string; tag?: string }) {
  return (
    <div className="mb-2">
      {tag && (
        <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent block mb-2">
          {tag}
        </span>
      )}
      <h1 className="font-display font-bold text-xl tracking-tighter text-white uppercase">{title}</h1>
      {subtitle && <p className="text-sm text-neutral-500 mt-1 leading-relaxed">{subtitle}</p>}
    </div>
  );
}
