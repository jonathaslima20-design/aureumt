/*
  # Knowledge Source History

  Introduces a new model where each knowledge base has a single consolidated
  knowledge source (type = 'consolidated') that accumulates all extracted text.
  Individual uploads (file, url, audio) are tracked in a history table so users
  can see what fed the consolidated source and optionally remove a contribution.

  ## New Tables
  - `knowledge_source_history`
    - `id` (uuid, pk)
    - `knowledge_base_id` (uuid, fk → knowledge_bases)
    - `type` ('file' | 'url' | 'audio')
    - `title` (text) — original file name / URL / recording title
    - `contributed_content` (text) — the exact text segment appended to the consolidated source
    - `metadata` (jsonb) — size_bytes, url, mime_type, char_count, etc.
    - `created_at` (timestamptz)

  ## Changes to knowledge_sources
  - No schema change required; a 'consolidated' virtual type will be managed at
    the application layer by inserting/upserting a single row per knowledge_base_id.

  ## Security
  - RLS enabled on knowledge_source_history
  - Users can only read/delete their own history entries (via knowledge_bases ownership)
*/

CREATE TABLE IF NOT EXISTS knowledge_source_history (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id uuid NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  type              text NOT NULL CHECK (type IN ('file', 'url', 'audio')),
  title             text NOT NULL DEFAULT '',
  contributed_content text NOT NULL DEFAULT '',
  metadata          jsonb NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_source_history_kb_idx
  ON knowledge_source_history(knowledge_base_id, created_at DESC);

ALTER TABLE knowledge_source_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history entries"
  ON knowledge_source_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM knowledge_bases
      WHERE knowledge_bases.id = knowledge_source_history.knowledge_base_id
        AND knowledge_bases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own history entries"
  ON knowledge_source_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM knowledge_bases
      WHERE knowledge_bases.id = knowledge_source_history.knowledge_base_id
        AND knowledge_bases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own history entries"
  ON knowledge_source_history FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM knowledge_bases
      WHERE knowledge_bases.id = knowledge_source_history.knowledge_base_id
        AND knowledge_bases.user_id = auth.uid()
    )
  );
