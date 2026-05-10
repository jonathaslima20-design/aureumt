/*
  # Knowledge Bases and Agent Links

  ## Summary
  Introduces independent knowledge bases owned by users (not tied to a specific agent),
  and a many-to-many join table linking agents (instances) to one or more knowledge bases.
  The existing knowledge_sources table is migrated to reference knowledge_base_id instead of instance_id.

  ## New Tables

  ### knowledge_bases
  - `id` (uuid, PK)
  - `user_id` (uuid, FK → profiles.id) — owner of the knowledge base
  - `name` (text) — display name for the base
  - `description` (text) — optional description
  - `created_at` (timestamptz)

  ### instance_knowledge_bases
  - `instance_id` (uuid, FK → instances.id) — the agent
  - `knowledge_base_id` (uuid, FK → knowledge_bases.id) — the linked base
  - Primary key on (instance_id, knowledge_base_id)

  ## Modified Tables

  ### knowledge_sources
  - Adds column `knowledge_base_id` (uuid, nullable FK → knowledge_bases.id)
  - The old `instance_id` column is kept for backwards compatibility with existing rows and edge functions;
    new sources should use knowledge_base_id going forward.

  ## Security
  - RLS enabled on both new tables
  - Users can only see, create, update, delete their own knowledge bases
  - Users can only manage agent-knowledge links for their own instances
*/

-- knowledge_bases table
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own knowledge bases"
  ON knowledge_bases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own knowledge bases"
  ON knowledge_bases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own knowledge bases"
  ON knowledge_bases FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own knowledge bases"
  ON knowledge_bases FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- instance_knowledge_bases join table
CREATE TABLE IF NOT EXISTS instance_knowledge_bases (
  instance_id uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  knowledge_base_id uuid NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  PRIMARY KEY (instance_id, knowledge_base_id)
);

ALTER TABLE instance_knowledge_bases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own instance knowledge base links"
  ON instance_knowledge_bases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = instance_knowledge_bases.instance_id
        AND instances.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own instance knowledge base links"
  ON instance_knowledge_bases FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = instance_knowledge_bases.instance_id
        AND instances.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own instance knowledge base links"
  ON instance_knowledge_bases FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = instance_knowledge_bases.instance_id
        AND instances.user_id = auth.uid()
    )
  );

-- Add knowledge_base_id column to knowledge_sources (nullable for migration safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'knowledge_sources' AND column_name = 'knowledge_base_id'
  ) THEN
    ALTER TABLE knowledge_sources ADD COLUMN knowledge_base_id uuid REFERENCES knowledge_bases(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_user ON knowledge_bases(user_id);
CREATE INDEX IF NOT EXISTS idx_instance_knowledge_bases_instance ON instance_knowledge_bases(instance_id);
CREATE INDEX IF NOT EXISTS idx_instance_knowledge_bases_base ON instance_knowledge_bases(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_kb ON knowledge_sources(knowledge_base_id);
