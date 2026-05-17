import { useState, useEffect, useCallback } from 'react';
import { X, Shield, Settings, BarChart3, Megaphone, ArrowLeft, Lock } from 'lucide-react';

interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  acceptedAt: string;
}

const STORAGE_KEY = 'auratalk_cookie_consent';

function getStoredPreferences(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function savePreferences(prefs: CookiePreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  applyCookiePreferences(prefs);
}

function applyCookiePreferences(preferences: CookiePreferences) {
  if (preferences.analytics) {
    // Inicializar Google Analytics aqui
  }

  if (preferences.marketing) {
    // Inicializar Meta Pixel, Google Ads ou scripts de remarketing aqui
  }

  if (preferences.functional) {
    // Ativar cookies funcionais e preferências avançadas aqui
  }
}

const categories = [
  {
    key: 'essential' as const,
    label: 'Cookies essenciais',
    icon: Shield,
    locked: true,
    description: 'Necessários para login, segurança, autenticação, sessão e funcionamento básico da plataforma.',
  },
  {
    key: 'functional' as const,
    label: 'Cookies funcionais',
    icon: Settings,
    locked: false,
    description: 'Permitem lembrar preferências como tema, idioma, configurações visuais e escolhas feitas dentro da plataforma.',
  },
  {
    key: 'analytics' as const,
    label: 'Cookies de analytics',
    icon: BarChart3,
    locked: false,
    description: 'Ajudam a entender como os visitantes usam o site e a melhorar a experiência da plataforma.',
  },
  {
    key: 'marketing' as const,
    label: 'Cookies de marketing',
    icon: Megaphone,
    locked: false,
    description: 'Usados para medir campanhas, conversões, anúncios e ações de remarketing.',
  },
];

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    functional: true,
    analytics: true,
    marketing: true,
  });

  useEffect(() => {
    const stored = getStoredPreferences();
    if (!stored) {
      setVisible(true);
    } else {
      applyCookiePreferences(stored);
    }
  }, []);

  const openPreferences = useCallback(() => {
    const stored = getStoredPreferences();
    if (stored) {
      setPreferences({
        essential: true,
        functional: stored.functional,
        analytics: stored.analytics,
        marketing: stored.marketing,
      });
    }
    setShowPreferences(true);
    setVisible(true);
  }, []);

  useEffect(() => {
    const handler = () => openPreferences();
    window.addEventListener('open-cookie-preferences', handler);
    return () => window.removeEventListener('open-cookie-preferences', handler);
  }, [openPreferences]);

  const acceptAll = () => {
    const prefs: CookiePreferences = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
      acceptedAt: new Date().toISOString(),
    };
    savePreferences(prefs);
    setVisible(false);
    setShowPreferences(false);
  };

  const rejectOptional = () => {
    const prefs: CookiePreferences = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
      acceptedAt: new Date().toISOString(),
    };
    savePreferences(prefs);
    setVisible(false);
    setShowPreferences(false);
  };

  const saveCustom = () => {
    const prefs: CookiePreferences = {
      essential: true,
      functional: preferences.functional,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
      acceptedAt: new Date().toISOString(),
    };
    savePreferences(prefs);
    setVisible(false);
    setShowPreferences(false);
  };

  const toggleCategory = (key: 'functional' | 'analytics' | 'marketing') => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] p-4 sm:p-6 pointer-events-none">
      <div className="max-w-2xl mx-auto pointer-events-auto">
        <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          {!showPreferences ? (
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="text-white font-semibold text-sm sm:text-base">
                  Preferências de cookies
                </h3>
                <button
                  onClick={rejectOptional}
                  className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mb-4">
                O AuraTalk utiliza cookies para oferecer uma experiência mais segura, personalizada
                e eficiente. Você pode aceitar todos os cookies, recusar os opcionais ou gerenciar
                suas preferências.{' '}
                <a
                  href="/politica-de-cookies"
                  className="text-[#ff3b00] hover:text-[#ff3b00]/80 transition-colors underline underline-offset-2"
                >
                  Política de Cookies
                </a>
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={rejectOptional}
                  className="px-4 py-2.5 text-[11px] sm:text-xs font-medium uppercase tracking-wide text-gray-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors"
                >
                  Recusar opcionais
                </button>
                <button
                  onClick={() => setShowPreferences(true)}
                  className="px-4 py-2.5 text-[11px] sm:text-xs font-medium uppercase tracking-wide text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                >
                  Gerenciar preferências
                </button>
                <button
                  onClick={acceptAll}
                  className="px-4 py-2.5 text-[11px] sm:text-xs font-bold uppercase tracking-wide text-white bg-[#ff3b00] hover:bg-[#ff3b00]/85 rounded-lg transition-colors shadow-lg shadow-[#ff3b00]/20"
                >
                  Aceitar todos
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4 mb-5">
                <h3 className="text-white font-semibold text-sm sm:text-base">
                  Gerenciar preferências
                </h3>
                <button
                  onClick={() => setShowPreferences(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = preferences[cat.key];
                  return (
                    <div
                      key={cat.key}
                      className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#ff3b00]/10 flex items-center justify-center mt-0.5">
                        <Icon size={14} className="text-[#ff3b00]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-white text-xs sm:text-sm font-medium">
                            {cat.label}
                          </span>
                          {cat.locked ? (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Lock size={12} />
                              <span className="text-[10px] uppercase tracking-wide">Sempre ativo</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => toggleCategory(cat.key as 'functional' | 'analytics' | 'marketing')}
                              className={`relative w-10 h-5 rounded-full transition-colors ${
                                isActive ? 'bg-[#ff3b00]' : 'bg-white/10'
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                  isActive ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          )}
                        </div>
                        <p className="text-gray-500 text-[11px] sm:text-xs leading-relaxed mt-1">
                          {cat.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setShowPreferences(false)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-[11px] sm:text-xs font-medium uppercase tracking-wide text-gray-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors"
                >
                  <ArrowLeft size={14} />
                  Voltar
                </button>
                <button
                  onClick={rejectOptional}
                  className="px-4 py-2.5 text-[11px] sm:text-xs font-medium uppercase tracking-wide text-gray-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors"
                >
                  Recusar opcionais
                </button>
                <button
                  onClick={saveCustom}
                  className="px-4 py-2.5 text-[11px] sm:text-xs font-bold uppercase tracking-wide text-white bg-[#ff3b00] hover:bg-[#ff3b00]/85 rounded-lg transition-colors shadow-lg shadow-[#ff3b00]/20"
                >
                  Salvar preferências
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
