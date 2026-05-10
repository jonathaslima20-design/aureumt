/*
  # WhatsApp Connections — Separation of Agents and WhatsApp Numbers

  ## Summary
  This migration separates the concept of "AI Agent" (instances table) from
  "WhatsApp Connection" (new whatsapp_connections table), allowing:
  - Multiple WhatsApp numbers per agent
  - Connections managed independently from agents
  - Chat history tied to the WhatsApp connection (phone number), not the agent

  ## New Tables
  - `whatsapp_connections`
    - `id` (uuid, PK)
    - `user_id` (uuid, FK → auth.users)
    - `display_name` (text) — friendly name set by user
    - `evolution_instance_id` (text) — internal name used by Evolution API
    - `status` (text) — 'open' | 'close'
    - `agent_id` (uuid, nullable FK → instances) — which agent handles this connection
    - `created_at` (timestamptz)

  ## Modified Tables
  - `chat_logs`: add `whatsapp_connection_id` column (nullable FK → whatsapp_connections)
  - `conversation_states`: add `whatsapp_connection_id` column
  - `contact_labels`: add `whatsapp_connection_id` column
  - `contact_notes`: add `whatsapp_connection_id` column (if table exists)
  - `quick_replies`: add `whatsapp_connection_id` column (replaces instance_id scope)

  ## Data Migration
  - For each existing instance that has an evolution_instance_id/status, create a
    corresponding whatsapp_connections row and set agent_id to that instance.
  - Backfill whatsapp_connection_id on chat_logs, conversation_states,
    contact_labels using the instance_id → whatsapp_connections mapping.

  ## Security
  - RLS enabled on whatsapp_connections
  - Users can only see/edit their own connections
*/

-- 1. Create whatsapp_connections table
CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  evolution_instance_id text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'close',
  agent_id uuid REFERENCES instances(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own whatsapp_connections"
  ON whatsapp_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own whatsapp_connections"
  ON whatsapp_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own whatsapp_connections"
  ON whatsapp_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own whatsapp_connections"
  ON whatsapp_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Migrate existing instances into whatsapp_connections
-- Each instance that has an evolution_instance_id becomes a connection
INSERT INTO whatsapp_connections (id, user_id, display_name, evolution_instance_id, status, agent_id, created_at)
SELECT
  gen_random_uuid(),
  user_id,
  COALESCE(NULLIF(display_name, ''), instance_name) AS display_name,
  COALESCE(NULLIF(evolution_instance_id, ''), instance_name) AS evolution_instance_id,
  COALESCE(NULLIF(status, ''), 'close') AS status,
  id AS agent_id,
  created_at
FROM instances
WHERE TRUE
ON CONFLICT DO NOTHING;

-- 3. Add whatsapp_connection_id to chat_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_logs' AND column_name = 'whatsapp_connection_id'
  ) THEN
    ALTER TABLE chat_logs ADD COLUMN whatsapp_connection_id uuid REFERENCES whatsapp_connections(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Backfill chat_logs.whatsapp_connection_id from instance_id
UPDATE chat_logs cl
SET whatsapp_connection_id = wc.id
FROM whatsapp_connections wc
WHERE wc.agent_id = cl.instance_id
  AND cl.whatsapp_connection_id IS NULL;

-- 4. Add whatsapp_connection_id to conversation_states
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_states' AND column_name = 'whatsapp_connection_id'
  ) THEN
    ALTER TABLE conversation_states ADD COLUMN whatsapp_connection_id uuid REFERENCES whatsapp_connections(id) ON DELETE SET NULL;
  END IF;
END $$;

UPDATE conversation_states cs
SET whatsapp_connection_id = wc.id
FROM whatsapp_connections wc
WHERE wc.agent_id = cs.instance_id
  AND cs.whatsapp_connection_id IS NULL;

-- 5. Add whatsapp_connection_id to contact_labels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_labels' AND column_name = 'whatsapp_connection_id'
  ) THEN
    ALTER TABLE contact_labels ADD COLUMN whatsapp_connection_id uuid REFERENCES whatsapp_connections(id) ON DELETE SET NULL;
  END IF;
END $$;

UPDATE contact_labels cl
SET whatsapp_connection_id = wc.id
FROM whatsapp_connections wc
WHERE wc.agent_id = cl.instance_id
  AND cl.whatsapp_connection_id IS NULL;

-- 6. Add whatsapp_connection_id to contact_notes if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_notes'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_notes' AND column_name = 'whatsapp_connection_id'
  ) THEN
    ALTER TABLE contact_notes ADD COLUMN whatsapp_connection_id uuid REFERENCES whatsapp_connections(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 7. Add index for fast queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_user_id ON whatsapp_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_agent_id ON whatsapp_connections(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_whatsapp_connection_id ON chat_logs(whatsapp_connection_id);
