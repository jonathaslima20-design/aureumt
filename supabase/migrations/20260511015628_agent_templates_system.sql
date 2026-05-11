/*
  # Agent Templates System

  ## Summary
  Introduces a dynamic template library that admins can manage through the UI.
  Users select templates when creating agents; the wizard renders custom fields
  defined by the admin, and merges user answers into the final system_prompt.

  ## New Tables

  ### agent_templates
  Stores reusable agent templates configurable by admins.
  - `id` (uuid, PK) — unique identifier
  - `title` (text) — template display name, e.g. "Vendas"
  - `description` (text) — short description shown in gallery
  - `icon` (text) — emoji or short icon string
  - `base_prompt` (text) — the raw system prompt template; use `{{variable_name}}` placeholders that match keys in custom_fields
  - `default_settings` (jsonb) — default values for tone, language, emoji_usage etc.
  - `custom_fields` (jsonb) — ordered array of field definitions the user must fill in
      Each field: { key, label, placeholder, required, type }
      type: "text" | "textarea" | "url"
  - `sort_order` (int) — display order in the gallery
  - `is_active` (boolean) — whether the template is visible to users
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Admins (role = 'admin' via profiles) can INSERT / UPDATE / DELETE
  - All authenticated users can SELECT active templates
  - Anon users have no access
*/

CREATE TABLE IF NOT EXISTS agent_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL DEFAULT '',
  description      text NOT NULL DEFAULT '',
  icon             text NOT NULL DEFAULT '',
  base_prompt      text NOT NULL DEFAULT '',
  default_settings jsonb NOT NULL DEFAULT '{}',
  custom_fields    jsonb NOT NULL DEFAULT '[]',
  sort_order       int  NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active templates
CREATE POLICY "Authenticated users can view active templates"
  ON agent_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can read ALL templates (including inactive)
CREATE POLICY "Admins can view all templates"
  ON agent_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Admins can insert templates
CREATE POLICY "Admins can insert templates"
  ON agent_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Admins can update templates
CREATE POLICY "Admins can update templates"
  ON agent_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Admins can delete templates
CREATE POLICY "Admins can delete templates"
  ON agent_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_agent_templates_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_templates_updated_at ON agent_templates;
CREATE TRIGGER trg_agent_templates_updated_at
  BEFORE UPDATE ON agent_templates
  FOR EACH ROW EXECUTE FUNCTION update_agent_templates_updated_at();

-- Seed initial templates
INSERT INTO agent_templates (title, description, icon, base_prompt, default_settings, custom_fields, sort_order, is_active)
VALUES
  (
    'Vendas',
    'Consultor de vendas que qualifica e converte leads',
    '💼',
    'Você representa {{store_name}}. Seu papel é atuar como consultor de vendas. Faça perguntas qualificadoras antes de apresentar soluções, entenda a dor do cliente e conduza com objetividade até o fechamento.',
    '{"tone": "professional", "language": "pt-BR", "emoji_usage": "moderate"}',
    '[{"key":"store_name","label":"Nome da loja ou empresa","placeholder":"Ex: Loja da Maria","required":true,"type":"text"}]',
    1,
    true
  ),
  (
    'Atendimento',
    'Atendimento ao cliente claro e resolutivo',
    '🎧',
    'Você representa {{company_name}}. Seu papel é prestar atendimento ao cliente. Identifique o problema, ofereça soluções passo a passo e confirme se a demanda foi resolvida antes de encerrar.',
    '{"tone": "friendly", "language": "pt-BR", "emoji_usage": "moderate"}',
    '[{"key":"company_name","label":"Nome da empresa","placeholder":"Ex: Tech Solutions","required":true,"type":"text"}]',
    2,
    true
  ),
  (
    'SDR',
    'Pré-vendas focado em qualificar e agendar reuniões',
    '📅',
    'Você é um SDR representando {{company_name}}. Qualifique o lead usando critérios como necessidade, orçamento e prazo, e agende uma reunião com o time comercial quando houver fit. Link do calendário: {{calendar_link}}',
    '{"tone": "professional", "language": "pt-BR", "emoji_usage": "none"}',
    '[{"key":"company_name","label":"Nome da empresa","placeholder":"Ex: Agência X","required":true,"type":"text"},{"key":"calendar_link","label":"Link do calendário","placeholder":"https://calendly.com/...","required":false,"type":"url"}]',
    3,
    true
  ),
  (
    'E-commerce',
    'Assistente de loja virtual com catálogo e pedidos',
    '🛍️',
    'Você é o assistente virtual da {{store_name}}. Ajude clientes a encontrar produtos, esclareça dúvidas e direcione para o catálogo: {{catalog_link}}. Informe sobre prazos de entrega e políticas de troca.',
    '{"tone": "warm", "language": "pt-BR", "emoji_usage": "expressive"}',
    '[{"key":"store_name","label":"Nome da loja","placeholder":"Ex: Moda Chic","required":true,"type":"text"},{"key":"catalog_link","label":"Link do catálogo","placeholder":"https://loja.com/catalogo","required":false,"type":"url"}]',
    4,
    true
  ),
  (
    'FAQ',
    'Responde dúvidas frequentes com precisão',
    '❓',
    'Você é o assistente de FAQ da {{company_name}}. Responda dúvidas frequentes com precisão. Seja direto, cite as informações relevantes e, se não souber a resposta, oriente o cliente a falar com um humano.',
    '{"tone": "professional", "language": "pt-BR", "emoji_usage": "none"}',
    '[{"key":"company_name","label":"Nome da empresa","placeholder":"Ex: Empresa ABC","required":true,"type":"text"}]',
    5,
    true
  ),
  (
    'Em branco',
    'Começar sem template e escrever do zero',
    '✏️',
    '',
    '{"tone": "friendly", "language": "pt-BR", "emoji_usage": "moderate"}',
    '[]',
    99,
    true
  );
