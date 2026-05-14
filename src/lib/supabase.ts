import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  plan_status: string;
  plan_id: string | null;
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
  system_prompt: string;
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
  business_hours: BusinessHours | null;
  base_prompt: string;
  custom_variables: { key: string; value: string }[];
};

export type WhatsappConnection = {
  id: string;
  user_id: string;
  display_name: string;
  evolution_instance_id: string;
  status: string;
  agent_id: string | null;
  created_at: string;
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
  instance_id: string | null;
  whatsapp_connection_id: string | null;
  customer_number: string;
  direction: 'in' | 'out';
  message_body: string;
  tokens_used: number;
  created_at: string;
  media_type: string | null;
  media_url: string | null;
  reply_to_id: string | null;
  delivery_status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  feedback_quality?: string | null;
  is_training_example?: boolean | null;
  corrected_response?: string | null;
  feedback_comment?: string | null;
};

export type ConversationState = {
  id: string;
  instance_id: string;
  customer_number: string;
  manual_override: boolean;
  contact_name: string | null;
  updated_at: string;
  last_seen_at: string;
  is_pinned: boolean;
  is_archived: boolean;
  unread_count: number;
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
  type: 'file' | 'url' | 'audio' | 'consolidated';
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
};

export type KnowledgeSourceHistory = {
  id: string;
  knowledge_base_id: string;
  type: 'file' | 'url' | 'audio';
  title: string;
  contributed_content: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Plan = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_semiannual: number;
  price_annual: number;
  max_agents: number | null;
  max_messages_month: number | null;
  features: string[];
  payment_link_monthly: string;
  payment_link_semiannual: string;
  payment_link_annual: string;
  sort_order: number;
  is_active: boolean;
  highlight: boolean;
  created_at: string;
};

export type UserPlan = {
  id: string;
  user_id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'semiannual' | 'annual';
  status: 'active' | 'cancelled' | 'expired';
  starts_at: string;
  expires_at: string | null;
  created_at: string;
};

export type TemplateExampleMessage = { role: 'user' | 'assistant'; content: string };

export type AgentTemplate = {
  id: string;
  title: string;
  description: string;
  icon: string;
  profile_image_url: string | null;
  base_prompt: string;
  default_settings: {
    tone: string;
    language: string;
    emoji_usage: string;
  };
  custom_fields: Array<{
    key: string;
    label: string;
    placeholder: string;
    type: 'text' | 'textarea' | 'url';
    required: boolean;
  }>;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category: string;
  tagline: string;
  tags: string[];
  capabilities: string[];
  example_conversation: TemplateExampleMessage[];
  ideal_for: string[];
  recommended_integrations: string[];
  setup_time_minutes: number;
  is_featured: boolean;
};

export const TEMPLATE_CATEGORIES = [
  { value: 'todos', label: 'Todos' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'suporte', label: 'Suporte' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'agendamento', label: 'Agendamento' },
  { value: 'conteudo', label: 'Conteudo' },
  { value: 'geral', label: 'Geral' },
];

export type BusinessHours = {
  enabled: boolean;
  timezone: string;
  schedule: Record<string, { start: string; end: string; active: boolean }>;
  away_message: string;
};

export type Notification = {
  id: string;
  user_id: string;
  instance_id: string;
  type: 'overflow' | 'keyword_alert';
  title: string;
  body: string;
  customer_number: string;
  is_read: boolean;
  created_at: string;
};

export type ConversionEvent = {
  id: string;
  instance_id: string;
  whatsapp_connection_id: string | null;
  customer_number: string;
  event_type: 'lead_captured' | 'resolved' | 'abandoned' | 'sale_influenced';
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AgentPersona = {
  id: string;
  instance_id: string;
  age_range: string;
  region: string;
  background_story: string;
  hobbies: string;
  speech_quirks: string;
  favorite_phrases: string;
  formality_level: string;
  use_typos: boolean;
  use_abbreviations: boolean;
  use_hesitations: boolean;
  use_regional_slang: boolean;
  anti_detection_mode: boolean;
  created_at: string;
  updated_at: string;
};

export type CustomerMemory = {
  id: string;
  instance_id: string;
  customer_number: string;
  customer_name: string;
  facts: string[];
  preferences: Record<string, unknown>;
  last_topics: string;
  relationship_level: string;
  total_interactions: number;
  last_interaction_at: string;
  created_at: string;
};

export type AgentLearning = {
  id: string;
  instance_id: string;
  customer_number: string;
  user_message: string;
  bot_response: string;
  human_correction: string;
  rating: string;
  is_active: boolean;
  created_at: string;
};

export type HumanExample = {
  id: string;
  instance_id: string;
  trigger_keyword: string;
  example_question: string;
  ideal_response: string;
  is_active: boolean;
  sort_order: number;
  source_shared_id: string | null;
  created_at: string;
};

export type PersonaTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  age_range: string;
  region: string;
  background_story: string;
  hobbies: string;
  speech_quirks: string;
  favorite_phrases: string;
  formality_level: string;
  use_typos: boolean;
  use_abbreviations: boolean;
  use_hesitations: boolean;
  use_regional_slang: boolean;
  anti_detection_mode: boolean;
  is_official: boolean;
  created_by: string | null;
  created_at: string;
};

export type SharedExample = {
  id: string;
  user_id: string;
  label: string;
  trigger_keyword: string;
  example_question: string;
  ideal_response: string;
  created_at: string;
};
