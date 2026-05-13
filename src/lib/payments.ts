import { supabase } from './supabase';

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago`;

async function call(action: string, payload?: unknown) {
  const session = await supabase.auth.getSession();
  const resp = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.data.session?.access_token || ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, payload }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || 'Falha na requisicao');
  return data;
}

export type Payer = {
  email?: string;
  first_name?: string;
  last_name?: string;
  doc?: string;
};

export type PixPaymentResult = {
  payment_id: string;
  mp_payment_id: string;
  status: string;
  pix_qr_code: string;
  pix_qr_code_base64: string;
  pix_ticket_url: string;
  expires_at: string | null;
};

export type CardPaymentResult = {
  payment_id: string;
  mp_payment_id: string;
  status: string;
  status_detail: string;
  card_last4: string;
};

export type StatusResult = {
  payment_id: string;
  status: string;
  status_detail: string;
};

export async function getPublicKey(): Promise<{ public_key: string; environment: string }> {
  return call('getPublicKey');
}

export async function createPixPayment(args: {
  plan_id: string;
  billing_cycle: 'monthly' | 'semiannual' | 'annual';
  payer: Payer;
}): Promise<PixPaymentResult> {
  return call('createPixPayment', args);
}

export async function createCardPayment(args: {
  plan_id: string;
  billing_cycle: 'monthly' | 'semiannual' | 'annual';
  token: string;
  installments: number;
  payment_method_id: string;
  issuer_id?: string;
  payer: Payer;
}): Promise<CardPaymentResult> {
  return call('createCardPayment', args);
}

export async function getPaymentStatus(payment_id: string): Promise<StatusResult> {
  return call('getPaymentStatus', { payment_id });
}
