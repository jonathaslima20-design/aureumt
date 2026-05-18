import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, Profile } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  hasLegalAcceptance: boolean | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshLegalAcceptance: () => Promise<void>;
};

const CURRENT_LEGAL_VERSION = '2026-05-17';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function ensureProfile(userId: string, email: string, fullName?: string): Promise<Profile | null> {
  const { data: existing, error: selErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (existing) return existing;
  if (selErr) {
    console.error('profile select error', selErr);
    return null;
  }

  const { data: created, error: insErr } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      role: 'user',
      plan_status: 'trial',
      full_name: fullName || null,
    })
    .select()
    .maybeSingle();

  if (insErr) {
    console.error('profile insert error', insErr);
    return null;
  }
  return created;
}

async function checkLegalAcceptance(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_legal_acceptances')
    .select('document_type')
    .eq('user_id', userId)
    .eq('document_version', CURRENT_LEGAL_VERSION)
    .in('document_type', ['terms_of_use', 'privacy_policy']);

  if (error || !data) return false;

  const types = data.map((r: { document_type: string }) => r.document_type);
  return types.includes('terms_of_use') && types.includes('privacy_policy');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLegalAcceptance, setHasLegalAcceptance] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    (async () => {
      const metaName = session.user.user_metadata?.full_name as string | undefined;
      const p = await ensureProfile(session.user.id, session.user.email || '', metaName);
      if (cancelled) return;
      setProfile(p);

      const accepted = await checkLegalAcceptance(session.user.id);
      if (cancelled) return;
      setHasLegalAcceptance(accepted);

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined,
    });
    return { error: error?.message || null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setHasLegalAcceptance(null);
  };

  const refreshProfile = async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();
    if (data) setProfile(data);
  };

  const refreshLegalAcceptance = async () => {
    if (!session?.user) return;
    const accepted = await checkLegalAcceptance(session.user.id);
    setHasLegalAcceptance(accepted);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, hasLegalAcceptance, signIn, signUp, signOut, refreshProfile, refreshLegalAcceptance }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
