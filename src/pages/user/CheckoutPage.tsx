import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, QrCode, CreditCard, Copy, Check, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Plan, supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { createPixPayment, createCardPayment, getPaymentStatus, PixPaymentResult } from '../../lib/payments';
import { ensureMercadoPago } from '../../lib/mercadopago';
import { Payment } from '@mercadopago/sdk-react';

type Cycle = 'monthly' | 'semiannual' | 'annual';

const CYCLE_LABEL: Record<Cycle, string> = {
  monthly: 'Mensal',
  semiannual: 'Semestral',
  annual: 'Anual',
};

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function maskCpfCnpj(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

const TEST_CARDS = [
  { brand: 'Mastercard APRO (aprovado)', number: '5031 4332 1540 6351', cvv: '123', exp: '11/30' },
  { brand: 'Visa OTHE (recusado)', number: '4235 6477 2802 5682', cvv: '123', exp: '11/30' },
  { brand: 'CPF teste', number: '12345678909', cvv: '', exp: '' },
];

export function CheckoutPage({
  plan,
  cycle,
  onBack,
  onSuccess,
}: {
  plan: Plan;
  cycle: Cycle;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const { profile, refreshProfile } = useAuth();
  const price = useMemo(() => {
    if (cycle === 'annual') return plan.price_annual;
    if (cycle === 'semiannual') return plan.price_semiannual;
    return plan.price_monthly;
  }, [plan, cycle]);

  const [tab, setTab] = useState<'pix' | 'card'>('pix');
  const [environment, setEnvironment] = useState<string>('test');
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState(profile?.email || '');
  const [payerDoc, setPayerDoc] = useState('');

  const [pixLoading, setPixLoading] = useState(false);
  const [pix, setPix] = useState<PixPaymentResult | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixStatus, setPixStatus] = useState<string>('pending');

  const [cardSubmitting, setCardSubmitting] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardSuccess, setCardSuccess] = useState<string | null>(null);

  const [showTestCards, setShowTestCards] = useState(false);
  const [brickKey, setBrickKey] = useState(0);

  const paymentInitialization = useMemo(
    () => ({
      amount: Number(price) || 0,
      payer: payerEmail ? { email: payerEmail } : undefined,
    }),
    [price, payerEmail]
  );

  const paymentCustomization = useMemo(
    () => ({
      paymentMethods: {
        creditCard: 'all' as const,
        maxInstallments: cycle === 'annual' ? 12 : cycle === 'semiannual' ? 6 : 1,
      },
      visual: { style: { theme: 'dark' as const } },
    }),
    [cycle]
  );

  // Remount the Payment brick when switching back to the card tab to avoid
  // "Secure Fields failed" caused by stale brick state from previous mounts.
  useEffect(() => {
    if (tab === 'card' && sdkReady) {
      setBrickKey((k) => k + 1);
    }
  }, [tab, sdkReady]);

  useEffect(() => {
    (async () => {
      try {
        const info = await ensureMercadoPago();
        setEnvironment(info.environment);
        if (!info.public_key) {
          setSdkError('Public Key do Mercado Pago nao configurada. Contate o administrador.');
        } else {
          setSdkReady(true);
        }
      } catch (e) {
        setSdkError(e instanceof Error ? e.message : 'Falha ao carregar SDK');
      }
    })();
  }, []);

  // Pix polling + realtime
  useEffect(() => {
    if (!pix?.payment_id) return;
    if (pixStatus === 'approved' || pixStatus === 'rejected') return;

    const channel = supabase
      .channel(`payment:${pix.payment_id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments', filter: `id=eq.${pix.payment_id}` },
        (payload) => {
          const newStatus = (payload.new as { status?: string }).status;
          if (newStatus) setPixStatus(newStatus);
        }
      )
      .subscribe();

    const interval = setInterval(async () => {
      try {
        const s = await getPaymentStatus(pix.payment_id);
        setPixStatus(s.status);
      } catch { /* ignore */ }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [pix?.payment_id, pixStatus]);

  useEffect(() => {
    if (pixStatus === 'approved') {
      (async () => {
        await refreshProfile();
      })();
    }
  }, [pixStatus, refreshProfile]);

  const handleCreatePix = async () => {
    setPixLoading(true);
    setCardError(null);
    try {
      const [first_name, ...rest] = payerName.trim().split(' ');
      const result = await createPixPayment({
        plan_id: plan.id,
        billing_cycle: cycle,
        payer: {
          email: payerEmail,
          first_name: first_name || 'Cliente',
          last_name: rest.join(' '),
          doc: payerDoc.replace(/\D/g, ''),
        },
      });
      setPix(result);
      setPixStatus(result.status || 'pending');
    } catch (e) {
      setCardError(e instanceof Error ? e.message : 'Falha ao gerar Pix');
    } finally {
      setPixLoading(false);
    }
  };

  const copyPix = async () => {
    if (!pix?.pix_qr_code) return;
    await navigator.clipboard.writeText(pix.pix_qr_code);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <button
          onClick={onBack}
          className="text-neutral-500 hover:text-white text-xs flex items-center gap-1.5 mb-6"
        >
          <ArrowLeft size={14} /> Voltar para planos
        </button>

        {environment === 'test' && (
          <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 mb-6 flex items-start gap-2.5">
            <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed flex-1">
              <strong className="text-amber-300">Modo de teste.</strong> Nenhuma cobranca real sera processada.{' '}
              <button
                onClick={() => setShowTestCards((v) => !v)}
                className="underline hover:text-amber-100"
              >
                {showTestCards ? 'Ocultar' : 'Ver'} dados de teste
              </button>
            </div>
          </div>
        )}

        {showTestCards && (
          <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-4 mb-6">
            <div className="text-xs uppercase tracking-wider text-neutral-500 mb-3">Cartoes e dados de teste</div>
            <div className="space-y-2 text-xs font-mono">
              {TEST_CARDS.map((c) => (
                <div key={c.brand} className="flex items-center gap-3 text-neutral-300">
                  <span className="text-neutral-500 w-44">{c.brand}</span>
                  <span className="text-white">{c.number}</span>
                  {c.cvv && <span className="text-neutral-500">CVV {c.cvv}</span>}
                  {c.exp && <span className="text-neutral-500">{c.exp}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main column */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-white tracking-tight">Pagamento</h1>
              <p className="text-sm text-neutral-500 mt-1">Escolha como deseja pagar</p>
            </div>

            {/* Payer */}
            <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-5 space-y-4">
              <div className="text-xs uppercase tracking-wider text-neutral-500">Dados do pagador</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-neutral-500 mb-1.5 block">Nome completo</label>
                  <input
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-neutral-500 mb-1.5 block">E-mail</label>
                  <input
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    placeholder="email@dominio.com"
                    className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] text-neutral-500 mb-1.5 block">CPF ou CNPJ</label>
                  <input
                    value={payerDoc}
                    onChange={(e) => setPayerDoc(maskCpfCnpj(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="inline-flex items-center bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-1 gap-0.5">
              <button
                onClick={() => setTab('pix')}
                className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  tab === 'pix' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <QrCode size={13} /> Pix
              </button>
              <button
                onClick={() => setTab('card')}
                className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  tab === 'card' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <CreditCard size={13} /> Cartao
              </button>
            </div>

            {sdkError && (
              <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-3 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" /> {sdkError}
              </div>
            )}

            {/* PIX */}
            {tab === 'pix' && (
              <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-5 space-y-4">
                {!pix ? (
                  <>
                    <div className="text-sm text-neutral-300">
                      Geramos um QR Code para pagamento via Pix. A aprovacao e instantanea.
                    </div>
                    <button
                      onClick={handleCreatePix}
                      disabled={pixLoading || !payerEmail || !payerDoc}
                      className="bg-white text-black rounded-lg px-5 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
                    >
                      {pixLoading ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
                      Gerar QR Code Pix
                    </button>
                    {(!payerEmail || !payerDoc) && (
                      <p className="text-[11px] text-neutral-600">Preencha email e CPF/CNPJ para continuar.</p>
                    )}
                  </>
                ) : pixStatus === 'approved' ? (
                  <div className="text-center py-6">
                    <CheckCircle2 size={42} className="text-emerald-400 mx-auto mb-3" />
                    <div className="text-lg text-white font-medium">Pagamento aprovado</div>
                    <div className="text-sm text-neutral-500 mt-1">Seu plano foi ativado.</div>
                    <button
                      onClick={onSuccess}
                      className="mt-5 bg-white text-black rounded-lg px-5 py-2.5 text-sm font-medium"
                    >
                      Continuar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                      {pix.pix_qr_code_base64 && (
                        <img
                          src={`data:image/png;base64,${pix.pix_qr_code_base64}`}
                          alt="QR Code Pix"
                          className="w-44 h-44 rounded-lg border border-[#1a1a1a] bg-white p-2 shrink-0"
                        />
                      )}
                      <div className="flex-1 space-y-3">
                        <div className="text-sm text-white">Escaneie o QR Code no app do seu banco</div>
                        <div className="text-xs text-neutral-500">
                          ou copie o codigo Pix abaixo e cole no seu app
                        </div>
                        <div className="bg-[#050505] border border-[#1a1a1a] rounded-lg p-3 text-[11px] font-mono text-neutral-300 break-all max-h-24 overflow-y-auto">
                          {pix.pix_qr_code}
                        </div>
                        <button
                          onClick={copyPix}
                          className="border border-[#2a2a2a] text-white rounded-lg px-4 py-2 text-xs flex items-center gap-2 hover:bg-[#141414] transition-colors"
                        >
                          {pixCopied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar codigo Pix</>}
                        </button>
                      </div>
                    </div>
                    <div className="border-t border-[#1a1a1a] pt-3 flex items-center gap-2 text-xs text-neutral-500">
                      <Loader2 size={12} className="animate-spin" />
                      Aguardando pagamento... a tela atualizara automaticamente apos a aprovacao.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Card */}
            {tab === 'card' && (
              <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-5">
                {cardSuccess ? (
                  <div className="text-center py-6">
                    <CheckCircle2 size={42} className="text-emerald-400 mx-auto mb-3" />
                    <div className="text-lg text-white font-medium">{cardSuccess}</div>
                    <button
                      onClick={onSuccess}
                      className="mt-5 bg-white text-black rounded-lg px-5 py-2.5 text-sm font-medium"
                    >
                      Continuar
                    </button>
                  </div>
                ) : (
                  <>
                    {cardError && (
                      <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-3 mb-4 text-xs text-red-300 flex items-start gap-2">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" /> {cardError}
                      </div>
                    )}
                    {sdkReady ? (
                      <Payment
                        key={brickKey}
                        initialization={paymentInitialization}
                        customization={paymentCustomization}
                        onSubmit={async ({ formData }) => {
                          setCardSubmitting(true);
                          setCardError(null);
                          try {
                            const fd = formData as Record<string, unknown>;
                            const result = await createCardPayment({
                              plan_id: plan.id,
                              billing_cycle: cycle,
                              token: String(fd.token),
                              installments: Number(fd.installments || 1),
                              payment_method_id: String(fd.payment_method_id),
                              issuer_id: fd.issuer_id ? String(fd.issuer_id) : undefined,
                              payer: {
                                email: payerEmail,
                                doc: payerDoc.replace(/\D/g, ''),
                              },
                            });
                            if (result.status === 'approved') {
                              await refreshProfile();
                              setCardSuccess('Pagamento aprovado! Seu plano foi ativado.');
                            } else if (result.status === 'in_process') {
                              setCardSuccess('Pagamento em analise. Voce sera notificado.');
                            } else {
                              setCardError(`Pagamento ${result.status}: ${result.status_detail || 'recusado'}`);
                            }
                          } catch (e) {
                            setCardError(e instanceof Error ? e.message : 'Falha ao processar cartao');
                          } finally {
                            setCardSubmitting(false);
                          }
                        }}
                        onError={(error) => {
                          setCardError(error?.message || 'Erro no formulario');
                        }}
                      />
                    ) : !sdkError ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 size={18} className="text-neutral-600 animate-spin" />
                      </div>
                    ) : null}
                    {cardSubmitting && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
                        <Loader2 size={12} className="animate-spin" /> Processando pagamento...
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Summary */}
          <aside className="space-y-4">
            <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-5 sticky top-6">
              <div className="text-xs uppercase tracking-wider text-neutral-500 mb-3">Resumo</div>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-white font-medium">{plan.name}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{plan.description}</div>
                </div>
                <div className="border-t border-[#1a1a1a] pt-3">
                  <div className="flex justify-between text-xs text-neutral-400 mb-1.5">
                    <span>Ciclo</span>
                    <span>{CYCLE_LABEL[cycle]}</span>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>Subtotal</span>
                    <span>{formatBRL(price)}</span>
                  </div>
                </div>
                <div className="border-t border-[#1a1a1a] pt-3 flex justify-between items-baseline">
                  <span className="text-xs text-neutral-500">Total</span>
                  <span className="text-2xl font-semibold text-white">{formatBRL(price)}</span>
                </div>
              </div>
              <div className="border-t border-[#1a1a1a] mt-4 pt-3 flex items-start gap-2 text-[11px] text-neutral-600 leading-relaxed">
                <Info size={11} className="shrink-0 mt-0.5" />
                Pagamento processado de forma segura via Mercado Pago. Seus dados de cartao nao sao armazenados em nossos servidores.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
