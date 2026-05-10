import { supabase } from './supabase';

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution`;

async function call(action: string, payload: Record<string, unknown> = {}) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

export const evolution = {
  createInstance: (instanceId: string) => call('createInstance', { instanceId }),
  connectInstance: (instanceId: string) => call('connectInstance', { instanceId }),
  instanceStatus: (instanceId: string) => call('instanceStatus', { instanceId }),
  logoutInstance: (instanceId: string) => call('logoutInstance', { instanceId }),
  deleteInstance: (instanceId: string) => call('deleteInstance', { instanceId }),
  sendMessage: (instanceId: string, number: string, text: string) =>
    call('sendMessage', { instanceId, number, text }),
  setManualOverride: (instanceId: string, number: string, manual: boolean) =>
    call('setManualOverride', { instanceId, number, manual }),
};
