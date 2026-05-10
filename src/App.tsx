import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { AdminPanel } from './pages/AdminPanel';

function Shell() {
  const { session, loading, profile } = useAuth();
  const [view, setView] = useState<'dashboard' | 'admin' | null>(null);

  useEffect(() => {
    if (profile && view === null) {
      setView(profile.role === 'admin' ? 'admin' : 'dashboard');
    }
  }, [profile, view]);

  if (loading || (session && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <Loader2 size={20} className="text-neutral-600 animate-spin" />
      </div>
    );
  }

  if (!session) return <AuthPage />;

  if (view === 'admin' && profile?.role === 'admin') {
    return <AdminPanel onBack={() => setView('dashboard')} />;
  }

  return <Dashboard onNavAdmin={() => setView('admin')} />;
}

function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

export default App;
