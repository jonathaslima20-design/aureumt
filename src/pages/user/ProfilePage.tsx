import { useState, useRef, useEffect } from 'react';
import { Camera, Save, Loader2, User, Mail, Phone, Shield, Calendar, CreditCard, ArrowLeft } from 'lucide-react';
import { supabase, UserPlan, Plan } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const CYCLE_LABELS: Record<string, string> = {
  monthly: 'Mensal',
  semiannual: 'Semestral',
  annual: 'Anual',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function ProfilePage({ onBack, onOpenPlans }: { onBack?: () => void; onOpenPlans?: () => void }) {
  const { profile, session, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [userPlan, setUserPlan] = useState<(UserPlan & { plan?: Plan }) | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setPhone(profile?.phone || '');
    setAvatarUrl(profile?.avatar_url || '');
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from('user_plans')
        .select('*, plan:plans(*)')
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setUserPlan(data);
      setLoadingPlan(false);
    })();
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;

    setUploading(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = objectUrl;
      });

      const size = 256;
      canvas.width = size;
      canvas.height = size;
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(objectUrl);

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/webp', 0.85)
      );

      const path = `${session.user.id}/avatar.webp`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/webp' });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
      setAvatarUrl(publicUrl);
      await refreshProfile();
    } catch (err) {
      console.error('Avatar upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!session?.user) return;
    setSaving(true);
    setSaved(false);

    await supabase.from('profiles').update({
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
    }).eq('id', session.user.id);

    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError('A senha deve ter no minimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('As senhas nao coincidem.');
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    }
    setChangingPassword(false);
  };

  const initial = (profile?.full_name || profile?.email || '?')[0].toUpperCase();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg border border-[#242424] text-neutral-400 hover:text-white hover:border-[#2e2e2e] hover:bg-[#141414] transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent block mb-1">CONTA</span>
            <h1 className="font-display font-bold text-xl tracking-tighter text-white uppercase">Meu Perfil</h1>
          </div>
        </div>
        <p className="text-sm text-neutral-500 mt-1 ml-0">
          Gerencie suas informacoes pessoais e configuracoes de conta.
        </p>
      </div>

      {/* Avatar + Basic Info Card */}
      <div className="border border-[#242424] rounded-xl bg-[#141414] p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#2a2a2a] bg-[#0a0a0a] flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-neutral-400">{initial}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              {uploading ? (
                <Loader2 size={20} className="text-white animate-spin" />
              ) : (
                <Camera size={20} className="text-white" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          {/* Name & Email display */}
          <div className="flex-1 text-center sm:text-left space-y-1">
            <h2 className="text-lg font-semibold text-white">
              {profile?.full_name || 'Sem nome definido'}
            </h2>
            <p className="text-sm text-neutral-500 font-mono">{profile?.email}</p>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-white/10 bg-white/5 text-accent">
                {profile?.role === 'admin' ? 'Administrador' : 'Usuario'}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-900/40 bg-emerald-950/30 text-emerald-400">
                {profile?.plan_status === 'active' ? 'Ativo' : profile?.plan_status === 'trial' ? 'Trial' : profile?.plan_status || 'Free'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="border border-[#242424] rounded-xl bg-[#141414] p-6 space-y-5">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-2">
          <User size={14} className="text-neutral-400" /> Informacoes Pessoais
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-2 block">NOME COMPLETO</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#1c1c1c] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#363636] transition-colors"
              placeholder="Seu nome"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-2 block">E-MAIL</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-[#0a0a0a] border border-[#1c1c1c] rounded-lg px-4 py-2.5">
                <Mail size={14} className="text-neutral-600 shrink-0" />
                <span className="text-sm text-neutral-400 truncate">{profile?.email}</span>
              </div>
            </div>
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-2 block">TELEFONE</label>
            <div className="relative">
              <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#1c1c1c] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#363636] transition-colors"
                placeholder="(99) 99999-9999"
              />
            </div>
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-2 block">MEMBRO DESDE</label>
            <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#1c1c1c] rounded-lg px-4 py-2.5">
              <Calendar size={14} className="text-neutral-600 shrink-0" />
              <span className="text-sm text-neutral-400">{profile?.created_at ? formatDate(profile.created_at) : '-'}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saved ? 'Salvo!' : 'Salvar alteracoes'}
          </button>
        </div>
      </div>

      {/* Subscription */}
      <div className="border border-[#242424] rounded-xl bg-[#141414] p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-2">
          <CreditCard size={14} className="text-neutral-400" /> Assinatura
        </h3>

        {loadingPlan ? (
          <div className="flex items-center gap-2 text-neutral-500 text-sm py-4">
            <Loader2 size={14} className="animate-spin" /> Carregando...
          </div>
        ) : userPlan?.plan ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#0a0a0a] border border-[#1c1c1c] rounded-lg p-4 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">PLANO ATUAL</span>
              <p className="text-white font-semibold">{userPlan.plan.name}</p>
            </div>
            <div className="bg-[#0a0a0a] border border-[#1c1c1c] rounded-lg p-4 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">CICLO</span>
              <p className="text-white font-medium">{CYCLE_LABELS[userPlan.billing_cycle] || userPlan.billing_cycle}</p>
            </div>
            <div className="bg-[#0a0a0a] border border-[#1c1c1c] rounded-lg p-4 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">CONTRATACAO</span>
              <p className="text-neutral-300 text-sm">{formatDate(userPlan.starts_at)}</p>
            </div>
            <div className="bg-[#0a0a0a] border border-[#1c1c1c] rounded-lg p-4 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">VENCIMENTO</span>
              <p className="text-neutral-300 text-sm">{userPlan.expires_at ? formatDate(userPlan.expires_at) : 'Sem vencimento'}</p>
            </div>
          </div>
        ) : (
          <div className="bg-[#0a0a0a] border border-[#1c1c1c] rounded-lg p-4">
            <p className="text-sm text-neutral-500">Nenhuma assinatura ativa.</p>
          </div>
        )}

        {onOpenPlans && (
          <button
            onClick={onOpenPlans}
            className="text-sm text-accent hover:underline font-medium"
          >
            Gerenciar plano
          </button>
        )}
      </div>

      {/* Security */}
      <div className="border border-[#242424] rounded-xl bg-[#141414] p-6 space-y-5">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-2">
          <Shield size={14} className="text-neutral-400" /> Seguranca
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-2 block">NOVA SENHA</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#1c1c1c] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#363636] transition-colors"
                placeholder="Minimo 6 caracteres"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-2 block">CONFIRMAR NOVA SENHA</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#1c1c1c] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#363636] transition-colors"
                placeholder="Repita a nova senha"
              />
            </div>
          </div>

          {passwordError && (
            <p className="text-xs text-red-400">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="text-xs text-emerald-400">Senha alterada com sucesso!</p>
          )}

          <button
            onClick={handlePasswordChange}
            disabled={changingPassword || !newPassword}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#242424] text-sm text-neutral-300 hover:text-white hover:border-[#363636] transition-colors disabled:opacity-40"
          >
            {changingPassword && <Loader2 size={14} className="animate-spin" />}
            Alterar senha
          </button>
        </div>
      </div>
    </div>
  );
}
