/*
  # Knowledge Sources & Multimodal Support

  1. New Tables
    - `knowledge_sources`
      - `id` (uuid, primary key)
      - `instance_id` (uuid, FK to instances)
      - `type` (text: file, url, audio)
      - `title` (text: display name of the source)
      - `content` (text: extracted text content)
      - `metadata` (jsonb: file size, url, mime type, etc.)
      - `is_active` (boolean: toggle sources on/off)
      - `created_at` (timestamptz)

  2. Modified Tables
    - `instances`: added `is_multimodal_active` column (boolean, default true)

  3. Security
    - RLS enabled on `knowledge_sources`
    - Policies: users can manage sources for their own instances
    - Admin can access all

  4. Indexes
    - Index on instance_id + is_active for fast knowledge retrieval
*/

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'file',
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_sources_select"
  ON knowledge_sources FOR SELECT TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM instances i
      WHERE i.id = knowledge_sources.instance_id AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "knowledge_sources_insert"
  ON knowledge_sources FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM instances i
      WHERE i.id = knowledge_sources.instance_id AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "knowledge_sources_update"
  ON knowledge_sources FOR UPDATE TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM instances i
      WHERE i.id = knowledge_sources.instance_id AND i.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM instances i
      WHERE i.id = knowledge_sources.instance_id AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "knowledge_sources_delete"
  ON knowledge_sources FOR DELETE TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM instances i
      WHERE i.id = knowledge_sources.instance_id AND i.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_instance_active
  ON knowledge_sources(instance_id, is_active);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instances' AND column_name = 'is_multimodal_active'
  ) THEN
    ALTER TABLE instances ADD COLUMN is_multimodal_active boolean DEFAULT true;
  END IF;
END $$;
