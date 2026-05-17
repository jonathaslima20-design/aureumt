import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UIPreferencesProvider } from './context/UIPreferencesContext';
import NetworkBackground from './components/NetworkBackground';
import { AuthPage } from './pages/AuthPage';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { AdminPanel } from './pages/AdminPanel';
import { PlanSelectionPage } from './pages/PlanSelectionPage';
import { CookiePolicy } from './pages/CookiePolicy';

function Shell() {
  const { session, loading, profile } = useAuth();
  const [view, setView] = useState<'landing' | 'auth' | 'dashboard' | 'admin' | 'plan_selection' | 'cookie_policy' | null>(null);

  useEffect(() => {
    if (window.location.pathname === '/politica-de-cookies') {
      setView('cookie_policy');
      return;
    }

    if (loading) return;

    if (!session) {
      if (view !== 'auth') setView('landing');
      return;
    }

    if (!profile) return;

    if (profile.role === 'admin') {
      setView('admin');
      return;
    }

    if (profile.plan_id || profile.plan_status === 'active') {
      setView('dashboard');
      return;
    }

    setView('plan_selection');
  }, [profile, session, loading]);

  if (loading || (session && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={20} className="text-neutral-600 animate-spin" />
      </div>
    );
  }

  if (view === 'cookie_policy') {
    return <CookiePolicy onBack={() => { window.history.pushState({}, '', '/'); setView('landing'); }} />;
  }

  if (view === 'landing' || (!session && view !== 'auth')) {
    return <LandingPage onLogin={() => setView('auth')} />;
  }

  if (view === 'auth' && !session) {
    return <AuthPage onBack={() => setView('landing')} />;
  }

  if (view === 'plan_selection') {
    return <PlanSelectionPage onPlanSelected={() => setView('dashboard')} />;
  }

  if (view === 'admin' && profile?.role === 'admin') {
    return <AdminPanel onBack={() => setView('dashboard')} />;
  }

  return <Dashboard onNavAdmin={() => setView('admin')} />;
}

function NoiseOverlay() {
  return (
    <div className="noise">
      <svg width="100%" height="100%">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>
    </div>
  );
}

function AuraBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-5" aria-hidden="true">
      <div
        className="absolute top-0 left-1/3 w-[600px] h-[400px] animate-aura-breathe"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)',
          filter: 'blur(48px)',
        }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-[500px] h-[350px] animate-aura-breathe-alt"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,59,0,0.02) 0%, transparent 70%)',
          filter: 'blur(56px)',
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <UIPreferencesProvider>
        <NetworkBackground />
        <AuraBackground />
        <Shell />
        <NoiseOverlay />
      </UIPreferencesProvider>
    </AuthProvider>
  );
}

export default App;
