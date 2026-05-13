import { initMercadoPago } from '@mercadopago/sdk-react';
import { getPublicKey } from './payments';

let initialized = false;
let initializing: Promise<{ public_key: string; environment: string }> | null = null;
let cachedInfo: { public_key: string; environment: string } | null = null;

export async function ensureMercadoPago(): Promise<{ public_key: string; environment: string }> {
  if (cachedInfo) return cachedInfo;
  if (initializing) return initializing;
  initializing = (async () => {
    const info = await getPublicKey();
    if (!initialized && info.public_key) {
      initMercadoPago(info.public_key, { locale: 'pt-BR' });
      initialized = true;
    }
    cachedInfo = info;
    return info;
  })();
  return initializing;
}
