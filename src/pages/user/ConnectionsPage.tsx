import { useEffect, useState } from 'react';
import {
  Circle, QrCode, LogOut, Loader2, RefreshCw, Plus, Wifi, WifiOff,
  Pencil, Trash2, X, Check, Bot,
} from 'lucide-react';
import { supabase, WhatsappConnection, Instance } from '../../lib/supabase';
import { evolution } from '../../lib/evolution';
import { useAuth } from '../../context/AuthContext';

type Props = {
  instances: Instance[];
  onUpdate: () => void;
};

export function ConnectionsPage({ instances, onUpdate }: Props) {
  const { profile } = useAuth();
  const [connections, setConnections] = useState<WhatsappConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchConnections = async () => {
    const { data } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .order('created_at', { ascending: true });
    setConnections(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim() || !profile) return;
    setCreating(true);
    setCreateError('');
    try {
      const evolution_instance_id = `conn_${Date.now().toString(36)}`;
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .insert({
          user_id: profile.id,
          display_name: newName.trim(),
          evolution_instance_id,
          status: 'close',
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setConnections((prev) => [...prev, data as WhatsappConnection]);
        onUpdate();
      }
      setNewName('');
      setShowNewForm(false);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Erro ao criar conexão');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (conn: WhatsappConnection) => {
    try {
      await evolution.deleteInstance(conn.id);
    } catch { /* ignore */ }
    await supabase.from('whatsapp_connections').delete().eq('id', conn.id);
    setConnections((prev) => prev.filter((c) => c.id !== conn.id));
    onUpdate();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={18} className="animate-spin text-neutral-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Conexões WhatsApp</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Gerencie os números conectados e atribua agentes.
          </p>
        </div>
        <button
          onClick={() => { setShowNewForm(true); setCreateError(''); }}
          className="bg-white text-black rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium flex items-center gap-2 hover:bg-neutral-200 transition-colors"
        >
          <Plus size={14} /> Nova conexão
        </button>
      </div>

      {showNewForm && (
        <div className="border border-[#242424] rounded-xl bg-[#141414] p-4 sm:p-5">
          <div className="text-sm text-white font-medium mb-3">Nova conexão WhatsApp</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Ex: Vendas, Suporte..."
              className="flex-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-[#2a2a2a] outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="flex-1 sm:flex-initial bg-white text-black rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Criar
              </button>
              <button
                onClick={() => { setShowNewForm(false); setNewName(''); }}
                className="border border-[#242424] text-neutral-400 hover:text-white rounded-lg px-3 py-2.5 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </div>
          {createError && (
            <p className="text-xs text-red-400 mt-2">{createError}</p>
          )}
        </div>
      )}

      {connections.length === 0 && !showNewForm ? (
        <div className="border border-dashed border-[#242424] rounded-xl p-16 text-center bg-[#0d0d0d]">
          <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-[#242424] flex items-center justify-center mx-auto mb-4">
            <Wifi size={22} className="text-neutral-600" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-neutral-400 mb-1">Nenhuma conexão ainda</p>
          <p className="text-xs text-neutral-600 mb-6">
            Crie uma conexão para vincular um número de WhatsApp a um agente.
          </p>
          <button
            onClick={() => setShowNewForm(true)}
            className="bg-white text-black rounded-lg px-4 py-2.5 text-sm font-medium inline-flex items-center gap-2 hover:bg-neutral-200 transition-colors"
          >
            <Plus size={14} /> Nova conexão
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((conn) => (
            <ConnectionCard
              key={conn.id}
              connection={conn}
              instances={instances}
              onDeleted={handleDelete}
              onUpdate={(updated) => {
                setConnections((prev) => prev.map((c) => c.id === updated.id ? updated : c));
                onUpdate();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectionCard({
  connection,
  instances,
  onDeleted,
  onUpdate,
}: {
  connection: WhatsappConnection;
  instances: Instance[];
  onDeleted: (conn: WhatsappConnection) => void;
  onUpdate: (conn: WhatsappConnection) => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [editName, setEditName] = useState(connection.display_name);
  const [savingName, setSavingName] = useState(false);
  const [savingAgent, setSavingAgent] = useState(false);

  const isConnected = connection.status === 'open';

  const refreshStatus = async () => {
    try {
      const res = await evolution.instanceStatus(connection.id);
      if (res.state) {
        await supabase
          .from('whatsapp_connections')
          .update({ status: res.state })
          .eq('id', connection.id);
        onUpdate({ ...connection, status: res.state });
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [connection.id]);

  useEffect(() => {
    if (isConnected && qr) setQr(null);
  }, [isConnected, qr]);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await evolution.createInstance(connection.id);
      const res = await evolution.connectInstance(connection.id);
      if (res.qrcode?.base64) setQr(res.qrcode.base64);
      else if (res.base64) setQr(res.base64);
      else setError('QR Code indisponível. Verifique as credenciais da API.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha na conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await evolution.logoutInstance(connection.id);
      await supabase
        .from('whatsapp_connections')
        .update({ status: 'close' })
        .eq('id', connection.id);
      onUpdate({ ...connection, status: 'close' });
      setQr(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao desconectar');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    setSavingName(true);
    await supabase
      .from('whatsapp_connections')
      .update({ display_name: editName.trim() })
      .eq('id', connection.id);
    onUpdate({ ...connection, display_name: editName.trim() });
    setSavingName(false);
    setRenaming(false);
  };

  const handleAgentChange = async (agentId: string) => {
    setSavingAgent(true);
    const newAgentId = agentId === '' ? null : agentId;
    await supabase
      .from('whatsapp_connections')
      .update({ agent_id: newAgentId })
      .eq('id', connection.id);
    onUpdate({ ...connection, agent_id: newAgentId });
    setSavingAgent(false);
  };

  const assignedAgent = instances.find((i) => i.id === connection.agent_id);
  const statusLabel = isConnected ? 'Conectado' : qr ? 'Aguardando leitura' : 'Desconectado';
  const statusColor = isConnected ? 'text-emerald-400' : qr ? 'text-amber-400' : 'text-neutral-500';

  return (
    <div className="border border-[#242424] rounded-xl bg-[#141414] overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 sm:gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`relative shrink-0 ${isConnected ? 'text-emerald-400' : 'text-neutral-600'}`}>
              {isConnected ? <Wifi size={20} /> : <WifiOff size={20} />}
            </div>
            <div className="min-w-0 flex-1">
              {renaming ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setRenaming(false); setEditName(connection.display_name); } }}
                    className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-sm text-white outline-none flex-1"
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    {savingName ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  </button>
                  <button
                    onClick={() => { setRenaming(false); setEditName(connection.display_name); }}
                    className="text-neutral-500 hover:text-white transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">{connection.display_name}</span>
                  <button
                    onClick={() => setRenaming(true)}
                    className="text-neutral-600 hover:text-neutral-300 transition-colors shrink-0"
                  >
                    <Pencil size={11} />
                  </button>
                </div>
              )}
              <div className={`text-[11px] mt-0.5 ${statusColor}`}>{statusLabel}</div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={refreshStatus}
              className="text-neutral-500 hover:text-white transition-colors p-1.5 rounded-lg border border-[#242424] hover:border-[#2e2e2e]"
              title="Atualizar status"
            >
              <RefreshCw size={12} />
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-neutral-500 hover:text-red-400 transition-colors p-1.5 rounded-lg border border-[#242424] hover:border-red-900/40"
                title="Excluir conexão"
              >
                <Trash2 size={12} />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onDeleted(connection)}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-900/40 rounded-lg px-2 py-1 transition-colors"
                >
                  Excluir
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-neutral-500 hover:text-white transition-colors p-1.5"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Agent assignment */}
        <div className="flex items-center gap-2 mb-4">
          <Bot size={12} className="text-neutral-500 shrink-0" />
          <span className="text-[11px] text-neutral-500 shrink-0">Agente:</span>
          <div className="relative flex-1">
            <select
              value={connection.agent_id || ''}
              onChange={(e) => handleAgentChange(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none appearance-none cursor-pointer hover:border-[#2a2a2a] transition-colors pr-6"
            >
              <option value="">Sem agente</option>
              {instances.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.display_name || inst.instance_name}
                </option>
              ))}
            </select>
            {savingAgent && (
              <Loader2 size={10} className="animate-spin text-neutral-500 absolute right-2 top-1/2 -translate-y-1/2" />
            )}
          </div>
          {assignedAgent && (
            <div
              className="w-4 h-4 rounded-full shrink-0"
              style={{ background: assignedAgent.color || '#3b82f6' }}
            />
          )}
        </div>

        {error && (
          <div className="mb-3 text-xs text-red-400 bg-red-950/20 border border-red-900/40 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {qr && !isConnected && (
          <div className="bg-white rounded-xl p-3 flex items-center justify-center mb-3">
            <img src={qr} alt="QR Code" className="w-full max-w-[200px] sm:max-w-[220px]" />
          </div>
        )}

        <div className="flex gap-2">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="flex-1 bg-white text-black rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <QrCode size={12} />}
              {qr ? 'Gerar novo QR' : 'Conectar WhatsApp'}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex-1 bg-[#141414] border border-[#242424] text-white rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-2 hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
              Desconectar
            </button>
          )}
        </div>
      </div>

      {qr && !isConnected && (
        <div className="border-t border-[#1a1a1a] px-4 sm:px-5 py-3 bg-[#0d0d0d]">
          <ol className="space-y-1.5 text-[11px] text-neutral-400">
            {['Abra o WhatsApp no celular', 'Configurações > Aparelhos conectados', 'Toque em "Conectar um aparelho"', 'Aponte a câmera para o QR Code'].map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 w-4 h-4 rounded-full border border-[#2e2e2e] flex items-center justify-center text-[9px] text-neutral-500">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
