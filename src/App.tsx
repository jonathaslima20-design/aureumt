import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UIPreferencesProvider } from './context/UIPreferencesContext';
import { AuthPage } from './pages/AuthPage';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { AdminPanel } from './pages/AdminPanel';
import { PlanSelectionPage } from './pages/PlanSelectionPage';

function Shell() {
  const { session, loading, profile } = useAuth();
  const [view, setView] = useState<'landing' | 'auth' | 'dashboard' | 'admin' | 'plan_selection' | null>(null);

  useEffect(() => {
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={20} className="text-neutral-600 animate-spin" />
      </div>
    );
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

function App() {
  return (
    <AuthProvider>
      <UIPreferencesProvider>
        <Shell />
      </UIPreferencesProvider>
    </AuthProvider>
  );
}

export default App;
