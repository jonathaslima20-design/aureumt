import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type Density = 'compact' | 'comfortable';

type UIPreferences = {
  density: Density;
  sidebarCollapsed: boolean;
  focusMode: boolean;
};

type UIContextValue = UIPreferences & {
  setDensity: (d: Density) => void;
  setSidebarCollapsed: (v: boolean) => void;
  setFocusMode: (v: boolean) => void;
  isHintDismissed: (key: string) => boolean;
  dismissHint: (key: string) => void;
};

const DEFAULTS: UIPreferences = {
  density: 'comfortable',
  sidebarCollapsed: false,
  focusMode: false,
};

const UIContext = createContext<UIContextValue | null>(null);

export function UIPreferencesProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [prefs, setPrefs] = useState<UIPreferences>(DEFAULTS);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const { data } = await supabase
        .from('user_ui_preferences')
        .select('density, sidebar_collapsed, focus_mode')
        .eq('user_id', profile.id)
        .maybeSingle();
      if (data) {
        setPrefs({
          density: (data.density as Density) || 'comfortable',
          sidebarCollapsed: !!data.sidebar_collapsed,
          focusMode: !!data.focus_mode,
        });
      }

      const { data: hints } = await supabase
        .from('dismissed_hints')
        .select('hint_key')
        .eq('user_id', profile.id);
      if (hints) setDismissed(new Set(hints.map((h) => h.hint_key)));
    })();
  }, [profile?.id]);

  const persist = useCallback(
    async (next: Partial<UIPreferences>) => {
      if (!profile?.id) return;
      const merged = { ...prefs, ...next };
      setPrefs(merged);
      await supabase.from('user_ui_preferences').upsert({
        user_id: profile.id,
        density: merged.density,
        sidebar_collapsed: merged.sidebarCollapsed,
        focus_mode: merged.focusMode,
        updated_at: new Date().toISOString(),
      });
    },
    [prefs, profile?.id]
  );

  const setDensity = useCallback((d: Density) => persist({ density: d }), [persist]);
  const setSidebarCollapsed = useCallback((v: boolean) => persist({ sidebarCollapsed: v }), [persist]);
  const setFocusMode = useCallback((v: boolean) => persist({ focusMode: v }), [persist]);

  const isHintDismissed = useCallback((key: string) => dismissed.has(key), [dismissed]);

  const dismissHint = useCallback(
    async (key: string) => {
      if (!profile?.id) return;
      setDismissed((prev) => new Set(prev).add(key));
      await supabase.from('dismissed_hints').insert({ user_id: profile.id, hint_key: key });
    },
    [profile?.id]
  );

  return (
    <UIContext.Provider
      value={{
        ...prefs,
        setDensity,
        setSidebarCollapsed,
        setFocusMode,
        isHintDismissed,
        dismissHint,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUIPreferences() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUIPreferences must be used within UIPreferencesProvider');
  return ctx;
}
