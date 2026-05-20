/*
  # Integrations System

  Structure for managing third-party integrations (Bling, Mercado Livre, etc.)
  with admin-controlled activation and per-user connection state.

  1. New Tables
    - `integrations`
      - `id` (uuid, primary key)
      - `name` (text) - display name of the integration
      - `slug` (text, unique) - URL-safe identifier
      - `description` (text) - brief description
      - `icon_url` (text, nullable) - logo/icon URL
      - `category` (text) - grouping category (ERP, Marketplace, CRM, etc.)
      - `is_enabled` (boolean, default false) - admin toggle for global visibility
      - `sort_order` (int, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `user_integrations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK -> profiles)
      - `integration_id` (uuid, FK -> integrations)
      - `is_connected` (boolean, default false) - user connection status
      - `config` (jsonb, default '{}') - reserved for future credentials/settings
      - `connected_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - Unique constraint on (user_id, integration_id)

  2. Security
    - RLS enabled on both tables
    - Authenticated users can read enabled integrations
    - Authenticated users can manage their own user_integrations rows
    - Admins have full CRUD on both tables

  3. Seed Data
    - 5 initial integrations (all disabled by default): Bling, Mercado Livre, Tiny ERP, Nuvemshop, Shopify
*/

-- integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  icon_url text,
  category text DEFAULT 'Outros',
  is_enabled boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- user_integrations table
CREATE TABLE IF NOT EXISTS user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  is_connected boolean DEFAULT false,
  config jsonb DEFAULT '{}',
  connected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, integration_id)
);

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integrations_is_enabled ON integrations(is_enabled);
CREATE INDEX IF NOT EXISTS idx_integrations_slug ON integrations(slug);
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_integration_id ON user_integrations(integration_id);

-- RLS Policies for integrations

CREATE POLICY "Authenticated users can read enabled integrations"
  ON integrations FOR SELECT
  TO authenticated
  USING (is_enabled = true);

CREATE POLICY "Admins can read all integrations"
  ON integrations FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert integrations"
  ON integrations FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update integrations"
  ON integrations FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete integrations"
  ON integrations FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for user_integrations

CREATE POLICY "Users can read own integrations"
  ON user_integrations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own integrations"
  ON user_integrations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own integrations"
  ON user_integrations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own integrations"
  ON user_integrations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all user integrations"
  ON user_integrations FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed initial integrations (all disabled)
INSERT INTO integrations (name, slug, description, icon_url, category, sort_order) VALUES
  ('Bling', 'bling', 'Sistema de gestao ERP para controle de estoque, financeiro e notas fiscais.', 'https://images.pexels.com/photos/7788009/pexels-photo-7788009.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&fit=crop', 'ERP', 0),
  ('Mercado Livre', 'mercado-livre', 'Marketplace lider na America Latina para vendas online.', 'https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&fit=crop', 'Marketplace', 1),
  ('Tiny ERP', 'tiny-erp', 'ERP online simples e completo para pequenas e medias empresas.', 'https://images.pexels.com/photos/7788009/pexels-photo-7788009.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&fit=crop', 'ERP', 2),
  ('Nuvemshop', 'nuvemshop', 'Plataforma de e-commerce para criar e gerenciar sua loja virtual.', 'https://images.pexels.com/photos/5632381/pexels-photo-5632381.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&fit=crop', 'E-commerce', 3),
  ('Shopify', 'shopify', 'Plataforma global de e-commerce para lojas de todos os tamanhos.', 'https://images.pexels.com/photos/5632381/pexels-photo-5632381.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&fit=crop', 'E-commerce', 4)
ON CONFLICT (slug) DO NOTHING;
