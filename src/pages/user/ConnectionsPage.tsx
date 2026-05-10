import { useEffect, useState } from 'react';
import { Circle, QrCode, LogOut, Loader2, RefreshCw } from 'lucide-react';
import { supabase, Instance } from '../../lib/supabase';
import { evolution } from '../../lib/evolution';

export function ConnectionsPage({
  instance,
  onUpdate,
}: {
  instance: Instance;
  onUpdate: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = instance.status === 'open';

  const refreshStatus = async () => {
    try {
      const res = await evolution.instanceStatus(instance.id);
      if (res.state) {
        await supabase.from('instances').update({ status: res.state }).eq('id', instance.id);
        onUpdate();
      }
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [instance.id]);

  useEffect(() => {
    if (isConnected && qr) setQr(null);
  }, [isConnected, qr]);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await evolution.createInstance(instance.id);
      const res = await evolution.connectInstance(instance.id);
      if (res.qrcode?.base64) setQr(res.qrcode.base64);
      else if (res.base64) setQr(res.base64);
      else setError('QR Code indisponível. Verifique as credenciais globais da API.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha na conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await evolution.logoutInstance(instance.id);
      await supabase.from('instances').update({ status: 'close' }).eq('id', instance.id);
      onUpdate();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao desconectar');
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = isConnected ? 'Conectado' : qr ? 'Aguardando leitura' : 'Desconectado';
  const statusColor = isConnected ? 'text-emerald-400' : qr ? 'text-amber-400' : 'text-neutral-500';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Conexões</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Conecte o WhatsApp ao agente <span className="text-neutral-300">{instance.instance_name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 border border-[#252530] rounded-xl bg-[#111116] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Circle size={44} strokeWidth={1.5} className={statusColor} />
                {isConnected && (
                  <div className="absolute inset-0 rounded-full bg-emerald-400/10 animate-pulse-subtle" />
                )}
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-neutral-500">Status</div>
                <div className="text-lg text-white font-medium mt-0.5">{statusLabel}</div>
                <div className="text-xs text-neutral-500 mt-1">{instance.instance_name}</div>
              </div>
            </div>
            <button
              onClick={refreshStatus}
              className="text-neutral-500 hover:text-white transition-colors p-2 rounded-lg border border-[#252530] hover:border-[#32323e]"
              title="Atualizar status"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {qr && !isConnected && (
            <div className="bg-white rounded-xl p-4 flex items-center justify-center mb-6">
              <img src={qr} alt="QR Code" className="w-full max-w-[300px]" />
            </div>
          )}

          {error && (
            <div className="mb-4 text-xs text-red-400 bg-red-950/20 border border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                disabled={loading}
                className="flex-1 bg-white text-black rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
                {qr ? 'Gerar novo QR' : 'Conectar WhatsApp'}
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="flex-1 bg-[#111116] border border-[#252530] text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#16161e] transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                Desconectar
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 border border-[#252530] rounded-xl bg-[#111116] p-6">
          <div className="text-xs uppercase tracking-wider text-neutral-500 mb-4">Como parear</div>
          <ol className="space-y-4 text-sm text-neutral-300">
            {[
              'Abra o WhatsApp no seu celular',
              'Toque em Configurações e depois em Aparelhos conectados',
              'Selecione "Conectar um aparelho"',
              'Aponte a câmera para o QR Code ao lado',
            ].map((step, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full border border-[#32323e] flex items-center justify-center text-[11px] text-neutral-400 font-medium">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-[11px] text-neutral-600 mt-6 leading-relaxed">
            O QR Code expira em poucos minutos. Se expirar, clique em "Gerar novo QR".
          </p>
        </div>
      </div>
    </div>
  );
}
