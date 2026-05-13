import { useEffect, useState } from 'react';
import { Save, Loader2, Check, Eye, EyeOff, Copy, FlaskConical, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type ConfigData = {
  id?: string;
  environment: 'test' | 'production';
  public_key_test: string;
  access_token_test_masked: string;
  has_access_token_test?: boolean;
  public_key_prod: string;
  access_token_prod_masked: string;
  has_access_token_prod?: boolean;
  webhook_secret_masked: string;
  has_webhook_secret?: boolean;
  notification_url: string;
};

export function MercadoPagoPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cfg, setCfg] = useState<ConfigData | null>(null);

  const [environment, setEnvironment] = useState<'test' | 'production'>('test');
  const [pubKeyTest, setPubKeyTest] = useState('');
  const [accessTokenTest, setAccessTokenTest] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showTokenTest, setShowTokenTest] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const callAdmin = async (action: string, payload?: unknown) => {
    const session = await supabase.auth.getSession();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mp-admin`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.data.session?.access_token || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, payload }),
    });
    return resp.json();
  };

  const load = async () => {
    setLoading(true);
    const res = await callAdmin('getConfig');
    if (res?.config) {
      setCfg(res.config);
      setEnvironment(res.config.environment || 'test');
      setPubKeyTest(res.config.public_key_test || '');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    setTestResult(null);
    await callAdmin('saveConfig', {
      environment,
      public_key_test: pubKeyTest,
      access_token_test: accessTokenTest,
      webhook_secret: webhookSecret,
    });
    setAccessTokenTest('');
    setWebhookSecret('');
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await load();
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await callAdmin('testCredentials');
    if (res?.ok) {
      const acc = res.account;
      setTestResult({
        ok: true,
        message: `Conectado: ${acc.nickname || acc.email || acc.id} (${acc.site_id})`,
      });
    } else {
      setTestResult({ ok: false, message: res?.error || 'Falha ao validar credenciais' });
    }
    setTesting(false);
  };

  const copyUrl = async () => {
    if (!cfg?.notification_url) return;
    await navigator.clipboard.writeText(cfg.notification_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={18} className="text-neutral-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white tracking-tight">Mercado Pago</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Configure as credenciais do Checkout Transparente. Ambiente de teste nao processa cobrancas reais.
        </p>
      </div>

      {/* Test mode banner */}
      <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 flex items-start gap-3">
        <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <strong className="text-amber-300">Modo de teste ativo.</strong> Use credenciais de teste do
          Mercado Pago (Access Token comeca com <code className="font-mono">TEST-</code>). Nenhuma
          cobranca real sera processada. O ambiente de producao sera liberado em fase futura.
        </div>
      </div>

      {/* Environment */}
      <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] p-5">
        <div className="text-xs uppercase tracking-wider text-neutral-500 mb-3">Ambiente</div>
        <div className="inline-flex items-center bg-[#050505] border border-[#1a1a1a] rounded-lg p-1 gap-0.5">
          <button
            onClick={() => setEnvironment('test')}
            className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
              environment === 'test' ? 'bg-white text-black' : 'text-neutral-400'
            }`}
          >
            Teste
          </button>
          <button
            disabled
            className="px-4 py-2 rounded-md text-xs font-medium text-neutral-700 cursor-not-allowed"
          >
            Producao (em breve)
          </button>
        </div>
      </div>

      {/* Credentials */}
      <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] p-5 space-y-4">
        <div className="text-xs uppercase tracking-wider text-neutral-500">Credenciais de teste</div>

        <div>
          <label className="text-xs text-neutral-500 mb-2 block">Public Key (Teste)</label>
          <input
            value={pubKeyTest}
            onChange={(e) => setPubKeyTest(e.target.value)}
            placeholder="TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 font-mono"
          />
        </div>

        <div>
          <label className="text-xs text-neutral-500 mb-2 block flex items-center justify-between">
            <span>Access Token (Teste)</span>
            {cfg?.has_access_token_test && (
              <span className="text-[10px] text-emerald-400 normal-case">
                Salvo: {cfg.access_token_test_masked}
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type={showTokenTest ? 'text' : 'password'}
              value={accessTokenTest}
              onChange={(e) => setAccessTokenTest(e.target.value)}
              placeholder={cfg?.has_access_token_test ? 'Deixe vazio para manter o atual' : 'TEST-...'}
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-4 py-3 pr-10 text-sm text-white focus:outline-none focus:border-neutral-600 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowTokenTest((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
            >
              {showTokenTest ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-neutral-500 mb-2 block flex items-center justify-between">
            <span>Webhook Secret</span>
            {cfg?.has_webhook_secret && (
              <span className="text-[10px] text-emerald-400 normal-case">
                Salvo: {cfg.webhook_secret_masked}
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={cfg?.has_webhook_secret ? 'Deixe vazio para manter o atual' : 'Chave secreta gerada no painel do MP'}
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-4 py-3 pr-10 text-sm text-white focus:outline-none focus:border-neutral-600 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
            >
              {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="text-[11px] text-neutral-600 mt-1.5">
            Gerado no painel do Mercado Pago em Webhooks &gt; Configurar notificacoes. Usado para
            validar a assinatura HMAC das notificacoes recebidas.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="bg-white text-black rounded-lg px-5 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> :
             saved ? <><Check size={14} /> Salvo</> :
             <><Save size={14} /> Salvar credenciais</>}
          </button>

          <button
            onClick={test}
            disabled={testing || !cfg?.has_access_token_test}
            className="border border-[#2a2a2a] text-white rounded-lg px-5 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-[#141414] transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <><FlaskConical size={14} /> Testar credenciais</>}
          </button>
        </div>

        {testResult && (
          <div
            className={`rounded-lg border p-3 flex items-start gap-2 text-xs ${
              testResult.ok
                ? 'border-emerald-900/40 bg-emerald-950/20 text-emerald-300'
                : 'border-red-900/40 bg-red-950/20 text-red-300'
            }`}
          >
            {testResult.ok ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* Webhook URL */}
      <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] p-5 space-y-3">
        <div className="text-xs uppercase tracking-wider text-neutral-500">URL de notificacao</div>
        <p className="text-xs text-neutral-500 leading-relaxed">
          Cole esta URL no painel do Mercado Pago em <strong>Webhooks &gt; Configurar notificacoes</strong>,
          marcando apenas o evento <strong>Pagamentos</strong>.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-xs text-white font-mono truncate">
            {cfg?.notification_url || '—'}
          </code>
          <button
            onClick={copyUrl}
            className="border border-[#2a2a2a] text-white rounded-lg px-3 py-2.5 text-xs flex items-center gap-1.5 hover:bg-[#141414] transition-colors"
          >
            {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
          </button>
        </div>
      </div>
    </div>
  );
}
