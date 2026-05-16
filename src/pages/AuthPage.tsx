import { useState } from 'react';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

interface AuthPageProps {
  onBack?: () => void;
}

export function AuthPage({ onBack }: AuthPageProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setFullName('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup' && !fullName.trim()) {
      setError('Informe seu nome completo.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('As senhas nao coincidem.');
      return;
    }

    setLoading(true);
    const res = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, fullName.trim());
    if (res.error) setError(res.error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/[0.02] rounded-full animate-spin-slow pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] border border-white/[0.02] rounded-full animate-reverse-spin pointer-events-none" />

      <div className="w-full max-w-sm animate-fade-in relative z-10">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs text-neutral-500 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft size={14} />
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase">VOLTAR</span>
          </button>
        )}

        <div className="flex justify-center mb-4">
          <Logo size="lg" />
        </div>

        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 bg-white/5 backdrop-blur-md rounded-full">
            <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-accent">
              ACESSO SEGURO
            </span>
          </div>
        </div>

        <div className="mb-10">
          <h1 className="font-display font-bold text-3xl tracking-tighter text-white uppercase leading-tight">
            {mode === 'signin' ? 'BEM-VINDO DE VOLTA' : 'CRIAR CONTA'}
          </h1>
          <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
            {mode === 'signin'
              ? 'Entre no seu espaco AuraTalk.'
              : 'Comece a criar seus agentes de IA em minutos.'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-2 block">NOME COMPLETO</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-accent/40 transition-colors backdrop-blur-sm"
                placeholder="Seu nome completo"
              />
            </div>
          )}

          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-2 block">E-MAIL</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-accent/40 transition-colors backdrop-blur-sm"
              placeholder="voce@empresa.com"
            />
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-2 block">SENHA</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 pr-11 text-sm text-white focus:outline-none focus:border-accent/40 transition-colors backdrop-blur-sm"
                placeholder="Minimo de 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-2 block">CONFIRMAR SENHA</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 pr-11 text-sm text-white focus:outline-none focus:border-accent/40 transition-colors backdrop-blur-sm"
                  placeholder="Repita sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white rounded-lg py-3 text-sm font-display font-semibold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,59,0,0.25)] hover:shadow-[0_0_30px_rgba(255,59,0,0.4)] transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                {mode === 'signin' ? 'Entrar' : 'Criar conta'}
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-neutral-500">
          {mode === 'signin' ? 'Ainda nao tem uma conta?' : 'Ja possui uma conta?'}{' '}
          <button
            onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-accent hover:text-white transition-colors font-medium"
          >
            {mode === 'signin' ? 'Cadastre-se' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
