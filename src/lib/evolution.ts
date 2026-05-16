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
  // Connection-based operations (new model)
  createInstance: (connectionId: string) => call('createInstance', { connectionId }),
  connectInstance: (connectionId: string) => call('connectInstance', { connectionId }),
  instanceStatus: (connectionId: string) => call('instanceStatus', { connectionId }),
  logoutInstance: (connectionId: string) => call('logoutInstance', { connectionId }),
  deleteInstance: (connectionId: string) => call('deleteInstance', { connectionId }),
  // Agent-based send (uses instanceId for legacy chat routing)
  sendMessage: (instanceId: string, number: string, text: string) =>
    call('sendMessage', { instanceId, number, text }),
  setManualOverride: (instanceId: string, number: string, manual: boolean) =>
    call('setManualOverride', { instanceId, number, manual }),
  fetchContactInfo: (instanceId: string, number: string) =>
    call('fetchContactInfo', { instanceId, number }) as Promise<{ profilePictureUrl: string | null; contactName: string | null }>,
};
