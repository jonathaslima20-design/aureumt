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

function AuraBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* Top-right white orb */}
      <div
        className="absolute animate-aura-breathe"
        style={{
          top: '-15%',
          right: '-10%',
          width: '55vw',
          height: '55vw',
          maxWidth: 700,
          maxHeight: 700,
          background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 45%, transparent 70%)',
          filter: 'blur(40px)',
          borderRadius: '50%',
        }}
      />
      {/* Bottom-left white orb */}
      <div
        className="absolute animate-aura-breathe-alt"
        style={{
          bottom: '-20%',
          left: '-12%',
          width: '60vw',
          height: '60vw',
          maxWidth: 760,
          maxHeight: 760,
          background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 50%, transparent 72%)',
          filter: 'blur(50px)',
          borderRadius: '50%',
        }}
      />
      {/* Centre-right subtle white depth orb */}
      <div
        className="absolute animate-aura-drift"
        style={{
          top: '35%',
          right: '20%',
          width: '30vw',
          height: '30vw',
          maxWidth: 360,
          maxHeight: 360,
          background: 'radial-gradient(circle, rgba(255,255,255,0.025) 0%, transparent 65%)',
          filter: 'blur(60px)',
          borderRadius: '50%',
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuraBackground />
      <Shell />
    </AuthProvider>
  );
}

export default App;
