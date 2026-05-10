import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  plan_status: string;
  token_limit: number | null;
  token_alert_threshold: number | null;
  created_at: string;
};

export type TokenStatsByUser = {
  user_id: string;
  email: string;
  plan_status: string;
  token_limit: number | null;
  token_alert_threshold: number | null;
  tokens_today: number;
  tokens_7d: number;
  tokens_month: number;
  tokens_total: number;
};

export type TokenDailySeries = {
  day: string;
  tokens: number;
};

// Gemini 2.5 Flash pricing (USD per 1M tokens, output rate used as conservative estimate)
export const GEMINI_PRICE_PER_1M_OUTPUT_USD = 0.6;
export const USD_TO_BRL = 5.1;

export function calcCostBRL(tokens: number): number {
  return (tokens / 1_000_000) * GEMINI_PRICE_PER_1M_OUTPUT_USD * USD_TO_BRL;
}

export type Instance = {
  id: string;
  user_id: string;
  instance_name: string;
  evolution_instance_id: string;
  system_prompt: string;
  status: string;
  response_delay: number;
  flow_status: string;
  overflow_keyword: string;
  created_at: string;
  display_name: string;
  avatar_url: string;
  persona_name: string;
  company_name: string;
  tone: string;
  language: string;
  color: string;
  emoji_usage: string;
  signature: string;
  is_multimodal_active: boolean;
};

export const AGENT_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

export const TONE_OPTIONS = [
  { value: 'friendly', label: 'Amigável' },
  { value: 'professional', label: 'Profissional' },
  { value: 'casual', label: 'Descontraído' },
  { value: 'technical', label: 'Técnico' },
  { value: 'warm', label: 'Acolhedor' },
];

export const EMOJI_OPTIONS = [
  { value: 'none', label: 'Nenhum' },
  { value: 'moderate', label: 'Moderado' },
  { value: 'expressive', label: 'Expressivo' },
];

export const LANGUAGE_OPTIONS = [
  { value: 'pt-BR', label: 'Português (BR)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es', label: 'Español' },
];

export const AGENT_TEMPLATES = [
  {
    key: 'sales',
    title: 'Vendas',
    description: 'Consultor de vendas que qualifica e converte',
    base:
      'Seu papel é atuar como consultor de vendas. Faça perguntas qualificadoras antes de apresentar soluções, entenda a dor do cliente e conduza com objetividade até o fechamento.',
  },
  {
    key: 'support',
    title: 'Atendimento',
    description: 'Atendimento ao cliente claro e resolutivo',
    base:
      'Seu papel é prestar atendimento ao cliente. Identifique o problema, ofereça soluções passo a passo e confirme se a demanda foi resolvida antes de encerrar.',
  },
  {
    key: 'sdr',
    title: 'SDR',
    description: 'Pré-vendas focado em qualificar e agendar',
    base:
      'Seu papel é atuar como SDR. Qualifique o lead usando critérios como necessidade, orçamento e prazo, e agende uma reunião com o time comercial quando houver fit.',
  },
  {
    key: 'faq',
    title: 'FAQ',
    description: 'Responde dúvidas frequentes com precisão',
    base:
      'Seu papel é responder dúvidas frequentes. Seja direto, cite as informações relevantes e, se não souber a resposta, oriente o cliente a falar com um humano.',
  },
  {
    key: 'blank',
    title: 'Em branco',
    description: 'Começar sem template e escrever do zero',
    base: '',
  },
];

export function buildSystemPrompt(input: {
  persona_name: string;
  company_name: string;
  tone: string;
  language: string;
  emoji_usage: string;
  base: string;
  signature?: string;
}): string {
  const toneLabel = TONE_OPTIONS.find((t) => t.value === input.tone)?.label || 'amigável';
  const langLabel = LANGUAGE_OPTIONS.find((l) => l.value === input.language)?.label || 'Português (BR)';
  const emojiMap: Record<string, string> = {
    none: 'Não utilize emojis em nenhuma resposta.',
    moderate: 'Use emojis com moderação, apenas quando reforçarem a mensagem.',
    expressive: 'Use emojis de forma expressiva para dar calor humano às respostas.',
  };
  const parts: string[] = [];
  const who = input.persona_name?.trim()
    ? `Você é ${input.persona_name}${input.company_name?.trim() ? `, da empresa ${input.company_name}` : ''}.`
    : input.company_name?.trim()
    ? `Você é um assistente da empresa ${input.company_name}.`
    : 'Você é um assistente virtual.';
  parts.push(who);
  parts.push(`Mantenha um tom ${toneLabel.toLowerCase()} e responda sempre em ${langLabel}.`);
  parts.push(emojiMap[input.emoji_usage] || emojiMap.moderate);
  if (input.base?.trim()) parts.push(input.base.trim());
  if (input.signature?.trim()) parts.push(`Sempre encerre suas mensagens com: "${input.signature.trim()}".`);
  parts.push('Seja conciso, humano e evite respostas genéricas.');
  return parts.join('\n\n');
}

export type ApiConfig = {
  id: string;
  user_id: string | null;
  gemini_key: string;
  evolution_url: string;
  evolution_key: string;
  is_active: boolean;
};

export type ChatLog = {
  id: string;
  instance_id: string;
  customer_number: string;
  direction: 'in' | 'out';
  message_body: string;
  tokens_used: number;
  created_at: string;
};

export type QuickReply = {
  id: string;
  user_id: string;
  instance_id: string | null;
  shortcut: string;
  title: string;
  body: string;
  sort_order: number;
  created_at: string;
};

export type ContactNote = {
  id: string;
  instance_id: string;
  customer_number: string;
  content: string;
  created_at: string;
};

export type ContactLabel = {
  id: string;
  instance_id: string;
  customer_number: string;
  label: string;
  color: string;
  created_at: string;
};

export const LABEL_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#8b5cf6',
  '#84cc16',
];

export type KnowledgeBase = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
};

export type KnowledgeSource = {
  id: string;
  instance_id: string | null;
  knowledge_base_id: string | null;
  type: 'file' | 'url' | 'audio';
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
};
