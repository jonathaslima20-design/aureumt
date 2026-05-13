import { useEffect, useState } from 'react';
import { Save, Loader2, Check, Eye, EyeOff, Copy, FlaskConical, AlertCircle, CheckCircle2, Zap, ShieldCheck } from 'lucide-react';
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
  const [pubKeyProd, setPubKeyProd] = useState('');
  const [accessTokenProd, setAccessTokenProd] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showTokenTest, setShowTokenTest] = useState(false);
  const [showTokenProd, setShowTokenProd] = useState(false);
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
      setPubKeyProd(res.config.public_key_prod || '');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    setTestResult(null);
    const res = await callAdmin('saveConfig', {
      environment,
      public_key_test: pubKeyTest,
      access_token_test: accessTokenTest,
      public_key_prod: pubKeyProd,
      access_token_prod: accessTokenProd,
      webhook_secret: webhookSecret,
    });
    setSaving(false);
    if (res?.error) {
      setTestResult({ ok: false, message: res.error });
      return;
    }
    setAccessTokenTest('');
    setAccessTokenProd('');
    setWebhookSecret('');
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

  const canActivateProd = !!cfg?.has_access_token_prod && !!pubKeyProd;
  const canActivateTest = !!cfg?.has_access_token_test && !!pubKeyTest;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white tracking-tight">Mercado Pago</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Configure as credenciais do Checkout Transparente para teste e producao.
        </p>
      </div>

      {/* Active environment indicator */}
      <div className={`rounded-xl border p-4 flex items-start gap-3 ${
        environment === 'production'
          ? 'border-emerald-900/40 bg-emerald-950/20'
          : 'border-amber-900/40 bg-amber-950/20'
      }`}>
        {environment === 'production' ? (
          <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        )}
        <div className={`text-xs leading-relaxed ${
          environment === 'production' ? 'text-emerald-200/90' : 'text-amber-200/90'
        }`}>
          {environment === 'production' ? (
            <>
              <strong className="text-emerald-300">Ambiente de PRODUCAO ativo.</strong> Cobrancas reais
              serao processadas. Verifique se as credenciais APP_USR estao corretas.
            </>
          ) : (
            <>
              <strong className="text-amber-300">Ambiente de TESTE ativo.</strong> Use credenciais de
              teste (TEST-...). Nenhuma cobranca real sera processada.
            </>
          )}
        </div>
      </div>

      {/* Environment switcher */}
      <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] p-5">
        <div className="text-xs uppercase tracking-wider text-neutral-500 mb-3">Ambiente ativo</div>
        <div className="inline-flex items-center bg-[#050505] border border-[#1a1a1a] rounded-lg p-1 gap-0.5">
          <button
            onClick={() => setEnvironment('test')}
            disabled={!canActivateTest}
            className={`px-4 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              environment === 'test'
                ? 'bg-white text-black'
                : canActivateTest
                ? 'text-neutral-400 hover:text-white'
                : 'text-neutral-700 cursor-not-allowed'
            }`}
          >
            <FlaskConical size={12} /> Teste
          </button>
          <button
            onClick={() => setEnvironment('production')}
            disabled={!canActivateProd}
            className={`px-4 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              environment === 'production'
                ? 'bg-emerald-500 text-black'
                : canActivateProd
                ? 'text-neutral-400 hover:text-white'
                : 'text-neutral-700 cursor-not-allowed'
            }`}
          >
            <Zap size={12} /> Producao
          </button>
        </div>
        {!canActivateProd && (
          <p className="text-[11px] text-neutral-600 mt-3">
            Adicione credenciais de producao validas (APP_USR-...) e clique em Salvar para habilitar
            o ambiente de producao.
          </p>
        )}
      </div>

      {/* Test Credentials */}
      <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FlaskConical size={14} className="text-amber-400" />
          <div className="text-xs uppercase tracking-wider text-neutral-400">Credenciais de teste</div>
        </div>

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
      </div>

      {/* Production Credentials */}
      <div className="border border-emerald-900/40 rounded-xl bg-[#0a0a0a] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-emerald-400" />
          <div className="text-xs uppercase tracking-wider text-emerald-300/90">Credenciais de producao</div>
        </div>

        <div className="rounded-lg bg-emerald-950/10 border border-emerald-900/30 p-3 text-[11px] text-emerald-200/80 leading-relaxed">
          Use as credenciais reais da sua aplicacao no Mercado Pago (comecam com <code className="font-mono">APP_USR-</code>).
          Encontre em "Suas integracoes" {'>'} sua aplicacao {'>'} "Credenciais de producao".
        </div>

        <div>
          <label className="text-xs text-neutral-500 mb-2 block">Public Key (Producao)</label>
          <input
            value={pubKeyProd}
            onChange={(e) => setPubKeyProd(e.target.value)}
            placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 font-mono"
          />
        </div>

        <div>
          <label className="text-xs text-neutral-500 mb-2 block flex items-center justify-between">
            <span>Access Token (Producao)</span>
            {cfg?.has_access_token_prod && (
              <span className="text-[10px] text-emerald-400 normal-case">
                Salvo: {cfg.access_token_prod_masked}
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type={showTokenProd ? 'text' : 'password'}
              value={accessTokenProd}
              onChange={(e) => setAccessTokenProd(e.target.value)}
              placeholder={cfg?.has_access_token_prod ? 'Deixe vazio para manter o atual' : 'APP_USR-...'}
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-4 py-3 pr-10 text-sm text-white focus:outline-none focus:border-neutral-600 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowTokenProd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
            >
              {showTokenProd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Webhook secret */}
      <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] p-5 space-y-4">
        <div className="text-xs uppercase tracking-wider text-neutral-500">Webhook Secret</div>

        <div>
          <label className="text-xs text-neutral-500 mb-2 block flex items-center justify-between">
            <span>Chave secreta do webhook</span>
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
              placeholder={cfg?.has_webhook_secret ? 'Deixe vazio para manter o atual' : 'Gerada no painel do MP'}
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
            Gerado no painel do Mercado Pago em Webhooks {'>'} Configurar notificacoes. Usado para
            validar a assinatura HMAC das notificacoes recebidas.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="bg-white text-black rounded-lg px-5 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> :
           saved ? <><Check size={14} /> Salvo</> :
           <><Save size={14} /> Salvar</>}
        </button>

        <button
          onClick={test}
          disabled={testing || (environment === 'test' ? !cfg?.has_access_token_test : !cfg?.has_access_token_prod)}
          className="border border-[#2a2a2a] text-white rounded-lg px-5 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-[#141414] transition-colors disabled:opacity-50"
        >
          {testing ? <Loader2 size={14} className="animate-spin" /> : <><FlaskConical size={14} /> Testar credenciais ativas</>}
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

      {/* Webhook URL */}
      <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] p-5 space-y-3">
        <div className="text-xs uppercase tracking-wider text-neutral-500">URL de notificacao</div>
        <p className="text-xs text-neutral-500 leading-relaxed">
          Cole esta URL no painel do Mercado Pago em <strong>Webhooks {'>'} Configurar notificacoes</strong>,
          marcando apenas o evento <strong>Pagamentos</strong>. A mesma URL atende teste e producao.
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
