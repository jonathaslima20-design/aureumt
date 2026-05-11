/*
  # Plans System

  1. New Tables
    - `plans`
      - `id` (uuid, primary key)
      - `name` (text) - Plan display name (e.g., "Business", "Pro", "Elite")
      - `slug` (text, unique) - URL-friendly identifier
      - `description` (text) - Short description
      - `price_monthly` (numeric) - Monthly price in BRL
      - `price_semiannual` (numeric) - Semiannual price in BRL
      - `price_annual` (numeric) - Annual price in BRL
      - `max_agents` (integer, nullable) - Max agents allowed (null = unlimited)
      - `max_messages_month` (integer, nullable) - Max messages per month (null = unlimited)
      - `features` (jsonb) - Array of feature strings for display
      - `payment_link_monthly` (text) - External payment link for monthly billing
      - `payment_link_semiannual` (text) - External payment link for semiannual billing
      - `payment_link_annual` (text) - External payment link for annual billing
      - `sort_order` (integer) - Display order
      - `is_active` (boolean) - Whether the plan is visible to users
      - `highlight` (boolean) - Whether to highlight this plan as recommended
      - `created_at` (timestamptz)

    - `user_plans`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `plan_id` (uuid, references plans)
      - `billing_cycle` (text) - 'monthly', 'semiannual', 'annual'
      - `status` (text) - 'active', 'cancelled', 'expired'
      - `starts_at` (timestamptz)
      - `expires_at` (timestamptz, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Plans: readable by all authenticated users, writable by admins only (via service role)
    - User plans: users can read their own, admins can read/write all

  3. Seed Data
    - Insert Business, Pro, and Elite plans with the specified pricing
*/

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  price_semiannual numeric(10,2) NOT NULL DEFAULT 0,
  price_annual numeric(10,2) NOT NULL DEFAULT 0,
  max_agents integer,
  max_messages_month integer,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_link_monthly text NOT NULL DEFAULT '',
  payment_link_semiannual text NOT NULL DEFAULT '',
  payment_link_annual text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  highlight boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active plans"
  ON plans FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- User plans table
CREATE TABLE IF NOT EXISTS user_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  plan_id uuid NOT NULL REFERENCES plans(id),
  billing_cycle text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan subscriptions"
  ON user_plans FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Users can insert own plan subscriptions"
  ON user_plans FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Admins can update plan subscriptions"
  ON user_plans FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Admins can delete plan subscriptions"
  ON user_plans FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Seed the three default plans
INSERT INTO plans (name, slug, description, price_monthly, price_semiannual, price_annual, max_agents, max_messages_month, features, payment_link_monthly, payment_link_semiannual, payment_link_annual, sort_order, is_active, highlight)
VALUES
  (
    'Business',
    'business',
    'Ideal para profissionais liberais e pequenas empresas.',
    197.00,
    1063.00,
    1891.00,
    1,
    2000,
    '["1 Agente de IA", "Até 2.000 mensagens/mês", "Treinamento via texto", "Conexão direta com WhatsApp"]'::jsonb,
    '',
    '',
    '',
    1,
    true,
    false
  ),
  (
    'Pro',
    'pro',
    'Ideal para empresas em crescimento que precisam de múltiplos departamentos.',
    397.00,
    2143.00,
    3811.00,
    5,
    10000,
    '["Até 5 Agentes de IA", "Até 10.000 mensagens/mês", "Treinamento via PDF/Arquivos", "Dashboard de métricas avançado"]'::jsonb,
    '',
    '',
    '',
    2,
    true,
    true
  ),
  (
    'Elite',
    'elite',
    'Ideal para operações de alto volume e agências.',
    797.00,
    4303.00,
    7651.00,
    NULL,
    NULL,
    '["Agentes Ilimitados", "Mensagens ilimitadas (Fair Use)", "Suporte prioritário via WhatsApp", "Integração via Webhooks"]'::jsonb,
    '',
    '',
    '',
    3,
    true,
    false
  )
ON CONFLICT (slug) DO NOTHING;

-- Add plan_id column to profiles for quick access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'plan_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN plan_id uuid REFERENCES plans(id);
  END IF;
END $$;
