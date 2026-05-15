import { useState } from 'react';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

interface AuthPageProps {
  onBack?: () => void;
}

export function AuthPage({ onBack }: AuthPageProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
    if (res.error) setError(res.error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#050505] relative overflow-hidden">
      {/* Amplified auth-page aura — cyan top-center */}
      <div
        className="absolute pointer-events-none animate-aura-breathe"
        style={{
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80vw',
          height: '80vw',
          maxWidth: 640,
          maxHeight: 640,
          background:
            'radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 45%, transparent 68%)',
          filter: 'blur(48px)',
          borderRadius: '50%',
        }}
        aria-hidden="true"
      />
      {/* Blue bottom-right */}
      <div
        className="absolute pointer-events-none animate-aura-breathe-alt"
        style={{
          bottom: '-8%',
          right: '-6%',
          width: '55vw',
          height: '55vw',
          maxWidth: 500,
          maxHeight: 500,
          background:
            'radial-gradient(circle, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 50%, transparent 70%)',
          filter: 'blur(56px)',
          borderRadius: '50%',
        }}
        aria-hidden="true"
      />

      <div className="w-full max-w-sm animate-fade-in relative z-10">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs text-neutral-500 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft size={14} />
            Voltar
          </button>
        )}
        <div className="flex justify-center mb-10">
          <Logo size={56} />
        </div>

        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-white tracking-tight leading-tight">
            {mode === 'signin' ? 'Bem-vindo de volta' : 'Criar conta'}
          </h1>
          <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
            {mode === 'signin'
              ? 'Entre no seu espaço AuraTalk.'
              : 'Comece a criar seus agentes de IA em minutos.'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-neutral-500 mb-2 block">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
              placeholder="voce@empresa.com"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-neutral-500 mb-2 block">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
              placeholder="Mínimo de 6 caracteres"
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black rounded-lg py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
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
          {mode === 'signin' ? 'Ainda não tem uma conta?' : 'Já possui uma conta?'}{' '}
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-white hover:text-neutral-300 transition-colors"
          >
            {mode === 'signin' ? 'Cadastre-se' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
