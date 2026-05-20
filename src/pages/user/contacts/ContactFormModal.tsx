import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase, Contact, ContactStage } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';

export function ContactFormModal({
  contact,
  stages,
  onClose,
  onSaved,
}: {
  contact?: Contact | null;
  stages: ContactStage[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const isEdit = !!contact;

  const [name, setName] = useState(contact?.display_name || '');
  const [number, setNumber] = useState(contact?.customer_number || '');
  const [email, setEmail] = useState(contact?.email || '');
  const [company, setCompany] = useState(contact?.company || '');
  const [phoneSecondary, setPhoneSecondary] = useState(contact?.phone_secondary || '');
  const [stageId, setStageId] = useState(contact?.stage_id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!number.trim() && !name.trim()) {
      setError('Informe pelo menos o nome ou numero do contato.');
      return;
    }
    if (!profile) return;
    setSaving(true);
    setError('');

    const payload = {
      user_id: profile.id,
      customer_number: number.trim(),
      display_name: name.trim(),
      email: email.trim() || null,
      company: company.trim() || null,
      phone_secondary: phoneSecondary.trim() || null,
      stage_id: stageId || null,
      source: 'manual' as const,
      updated_at: new Date().toISOString(),
    };

    if (isEdit && contact) {
      const { error: err } = await supabase
        .from('contacts')
        .update(payload)
        .eq('id', contact.id);
      if (err) {
        setError(err.message.includes('unique') ? 'Ja existe um contato com este numero.' : err.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: err } = await supabase
        .from('contacts')
        .insert(payload);
      if (err) {
        setError(err.message.includes('unique') ? 'Ja existe um contato com este numero.' : err.message);
        setSaving(false);
        return;
      }
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="glass rounded-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="font-display font-bold text-sm text-white">
            {isEdit ? 'Editar Contato' : 'Novo Contato'}
          </h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div>
            <label className="text-[11px] text-neutral-500 uppercase font-mono tracking-wide block mb-1">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do contato"
              className="w-full bg-[#141414] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-accent/40 transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] text-neutral-500 uppercase font-mono tracking-wide block mb-1">Numero WhatsApp</label>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="5511999999999"
              disabled={isEdit}
              className="w-full bg-[#141414] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-accent/40 transition-colors disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-neutral-500 uppercase font-mono tracking-wide block mb-1">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                type="email"
                className="w-full bg-[#141414] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-accent/40 transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] text-neutral-500 uppercase font-mono tracking-wide block mb-1">Empresa</label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Nome da empresa"
                className="w-full bg-[#141414] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-accent/40 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-neutral-500 uppercase font-mono tracking-wide block mb-1">Telefone Secundario</label>
            <input
              value={phoneSecondary}
              onChange={(e) => setPhoneSecondary(e.target.value)}
              placeholder="Opcional"
              className="w-full bg-[#141414] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-accent/40 transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] text-neutral-500 uppercase font-mono tracking-wide block mb-1">Estagio</label>
            <select
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              className="w-full bg-[#141414] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent/40 transition-colors"
            >
              <option value="">Sem estagio</option>
              {stages.sort((a, b) => a.sort_order - b.sort_order).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-xs bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            {isEdit ? 'Salvar' : 'Criar Contato'}
          </button>
        </div>
      </div>
    </div>
  );
}
