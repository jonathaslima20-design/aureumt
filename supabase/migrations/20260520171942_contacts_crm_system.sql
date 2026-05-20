/*
  # Contacts CRM System

  1. New Tables
    - `contact_stages`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to profiles)
      - `name` (text) - stage display name
      - `color` (text) - hex color for badge
      - `sort_order` (integer) - ordering in pipeline
      - `is_default` (boolean) - whether it's a system default stage
      - `created_at` (timestamptz)

    - `contacts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to profiles)
      - `customer_number` (text) - WhatsApp phone number
      - `display_name` (text) - contact name
      - `email` (text, nullable) - contact email
      - `company` (text, nullable) - company/organization
      - `phone_secondary` (text, nullable) - secondary phone
      - `stage_id` (uuid, nullable, FK to contact_stages) - pipeline stage
      - `source` (text) - origin: 'whatsapp', 'import', 'manual'
      - `custom_fields` (jsonb) - user-defined extra fields
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `contact_agents`
      - `id` (uuid, primary key)
      - `contact_id` (uuid, FK to contacts)
      - `instance_id` (uuid, FK to instances)
      - `first_interaction_at` (timestamptz)
      - `last_interaction_at` (timestamptz)
      - `message_count` (integer)

  2. Security
    - Enable RLS on all new tables
    - Policies for authenticated users to manage their own data

  3. Triggers
    - Auto-sync: when conversation_states gets a new row, upsert into contacts and contact_agents

  4. Default Data
    - Insert default stages for each new user via trigger on profiles
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: contact_stages (custom pipeline stages per user)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6b7280',
  sort_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contact_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own stages"
  ON contact_stages FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own stages"
  ON contact_stages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own stages"
  ON contact_stages FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own stages"
  ON contact_stages FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: contacts (global CRM contacts per user)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_number text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  email text DEFAULT NULL,
  company text DEFAULT NULL,
  phone_secondary text DEFAULT NULL,
  stage_id uuid DEFAULT NULL REFERENCES contact_stages(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'whatsapp',
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, customer_number)
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_contacts_user_stage ON contacts(user_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_number ON contacts(user_id, customer_number);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: contact_agents (tracks which agents a contact interacted with)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  instance_id uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  first_interaction_at timestamptz NOT NULL DEFAULT now(),
  last_interaction_at timestamptz NOT NULL DEFAULT now(),
  message_count integer NOT NULL DEFAULT 0,
  UNIQUE (contact_id, instance_id)
);

ALTER TABLE contact_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own contact agents"
  ON contact_agents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_agents.contact_id
      AND contacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own contact agents"
  ON contact_agents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_agents.contact_id
      AND contacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own contact agents"
  ON contact_agents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_agents.contact_id
      AND contacts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_agents.contact_id
      AND contacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own contact agents"
  ON contact_agents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_agents.contact_id
      AND contacts.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_contact_agents_contact ON contact_agents(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_agents_instance ON contact_agents(instance_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Function: create default stages for a user
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_default_contact_stages(p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO contact_stages (user_id, name, color, sort_order, is_default)
  VALUES
    (p_user_id, 'Lead', '#f59e0b', 1, true),
    (p_user_id, 'Cliente', '#10b981', 2, true),
    (p_user_id, 'VIP', '#3b82f6', 3, true),
    (p_user_id, 'Inativo', '#6b7280', 4, true)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: auto-create default stages when a profile is created
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_profile_stages()
RETURNS trigger AS $$
BEGIN
  PERFORM create_default_contact_stages(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_profile_created_stages'
  ) THEN
    CREATE TRIGGER on_profile_created_stages
      AFTER INSERT ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_profile_stages();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Function: sync conversation_states to contacts + contact_agents
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_conversation_state_to_contacts()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
  v_contact_id uuid;
BEGIN
  -- Get user_id from the instance
  SELECT user_id INTO v_user_id
  FROM instances
  WHERE id = NEW.instance_id;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Upsert into contacts
  INSERT INTO contacts (user_id, customer_number, display_name, source)
  VALUES (
    v_user_id,
    NEW.customer_number,
    COALESCE(NEW.contact_name, ''),
    'whatsapp'
  )
  ON CONFLICT (user_id, customer_number) DO UPDATE
  SET
    display_name = CASE
      WHEN contacts.display_name = '' AND COALESCE(NEW.contact_name, '') != ''
      THEN NEW.contact_name
      ELSE contacts.display_name
    END,
    updated_at = now()
  RETURNING id INTO v_contact_id;

  -- Upsert into contact_agents
  INSERT INTO contact_agents (contact_id, instance_id, first_interaction_at, last_interaction_at, message_count)
  VALUES (v_contact_id, NEW.instance_id, now(), now(), 0)
  ON CONFLICT (contact_id, instance_id) DO UPDATE
  SET last_interaction_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_conversation_state_sync_contact'
  ) THEN
    CREATE TRIGGER on_conversation_state_sync_contact
      AFTER INSERT ON conversation_states
      FOR EACH ROW
      EXECUTE FUNCTION sync_conversation_state_to_contacts();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: create default stages for all existing users
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM profiles LOOP
    PERFORM create_default_contact_stages(r.id);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: populate contacts from existing conversation_states
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO contacts (user_id, customer_number, display_name, source, created_at, updated_at)
SELECT DISTINCT ON (i.user_id, cs.customer_number)
  i.user_id,
  cs.customer_number,
  COALESCE(cs.contact_name, ''),
  'whatsapp',
  cs.updated_at,
  cs.updated_at
FROM conversation_states cs
JOIN instances i ON i.id = cs.instance_id
ON CONFLICT (user_id, customer_number) DO NOTHING;

-- Populate contact_agents from existing conversation_states
INSERT INTO contact_agents (contact_id, instance_id, first_interaction_at, last_interaction_at, message_count)
SELECT
  c.id,
  cs.instance_id,
  MIN(cs.updated_at),
  MAX(cs.updated_at),
  0
FROM conversation_states cs
JOIN instances i ON i.id = cs.instance_id
JOIN contacts c ON c.user_id = i.user_id AND c.customer_number = cs.customer_number
GROUP BY c.id, cs.instance_id
ON CONFLICT (contact_id, instance_id) DO NOTHING;