import { useState } from 'react';
import { ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const CURRENT_LEGAL_VERSION = '2026-05-17';

interface LegalAcceptanceProps {
  onAccepted: () => void;
}

export function LegalAcceptance({ onAccepted }: LegalAcceptanceProps) {
  const { session } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!accepted || !session?.user) return;

    setLoading(true);
    setError(null);

    const records = [
      {
        user_id: session.user.id,
        document_type: 'terms_of_use',
        document_version: CURRENT_LEGAL_VERSION,
        user_agent: navigator.userAgent,
      },
      {
        user_id: session.user.id,
        document_type: 'privacy_policy',
        document_version: CURRENT_LEGAL_VERSION,
        user_agent: navigator.userAgent,
      },
    ];

    const { error: insertError } = await supabase
      .from('user_legal_acceptances')
      .upsert(records, { onConflict: 'user_id,document_type,document_version' });

    if (insertError) {
      setError('Ocorreu um erro ao registrar o aceite. Tente novamente.');
      setLoading(false);
      return;
    }

    onAccepted();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/[0.02] rounded-full animate-spin-slow pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="flex justify-center mb-4">
          <Logo size="lg" />
        </div>

        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 bg-white/5 backdrop-blur-md rounded-full">
            <ShieldCheck size={12} className="text-accent" />
            <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-accent">
              ATUALIZACAO NECESSARIA
            </span>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 sm:p-8">
          <h1 className="font-display font-bold text-2xl tracking-tighter text-white uppercase leading-tight mb-3">
            Atualizacao necessaria
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed mb-8">
            Para continuar usando o AuraTalk, aceite os Termos de Uso e a Politica de Privacidade.
          </p>

          <label className="flex items-start gap-3 cursor-pointer group mb-6">
            <div className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-5 h-5 rounded border border-white/20 bg-white/5 peer-checked:bg-[#ff3b00] peer-checked:border-[#ff3b00] transition-all flex items-center justify-center">
                {accepted && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-neutral-300 leading-relaxed">
              Li e aceito os{' '}
              <a
                href="/termos-de-uso"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#ff3b00] hover:text-[#ff3b00]/80 underline underline-offset-2 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Termos de Uso
              </a>
              {' '}e a{' '}
              <a
                href="/politica-de-privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#ff3b00] hover:text-[#ff3b00]/80 underline underline-offset-2 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Politica de Privacidade
              </a>
              {' '}do AuraTalk.
            </span>
          </label>

          {error && (
            <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleAccept}
            disabled={!accepted || loading}
            className="w-full bg-accent text-white rounded-lg py-3 text-sm font-display font-semibold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,59,0,0.25)] hover:shadow-[0_0_30px_rgba(255,59,0,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                Aceitar e continuar
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
