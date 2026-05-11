/*
  # Fix RLS policies on knowledge_sources for knowledge_base_id support

  ## Problem
  The original RLS policies on knowledge_sources only checked instance_id ownership.
  After the knowledge_bases system was introduced and instance_id was made nullable,
  sources inserted via knowledge_base_id (the new system) became invisible to users
  because the SELECT/INSERT/UPDATE/DELETE policies still require a valid instance_id.

  The edge function inserts with service role (bypasses RLS), so inserts succeed,
  but the frontend user client cannot read those rows back.

  ## Changes
  - DROP and recreate all four policies on knowledge_sources
  - Each policy now accepts access when EITHER:
    a) The row has a knowledge_base_id owned by the current user (new system), OR
    b) The row has an instance_id owned by the current user (legacy system)
    c) The user is an admin (preserved from original policies)

  ## Affected Table
  - knowledge_sources: SELECT, INSERT, UPDATE, DELETE policies updated
*/

-- DROP existing policies
DROP POLICY IF EXISTS "knowledge_sources_select" ON knowledge_sources;
DROP POLICY IF EXISTS "knowledge_sources_insert" ON knowledge_sources;
DROP POLICY IF EXISTS "knowledge_sources_update" ON knowledge_sources;
DROP POLICY IF EXISTS "knowledge_sources_delete" ON knowledge_sources;

-- SELECT: user can read sources linked to their knowledge bases OR their instances
CREATE POLICY "knowledge_sources_select"
  ON knowledge_sources FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM knowledge_bases kb
      WHERE kb.id = knowledge_sources.knowledge_base_id
        AND kb.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM instances i
      WHERE i.id = knowledge_sources.instance_id
        AND i.user_id = auth.uid()
    )
  );

-- INSERT: user can insert sources into their knowledge bases OR their instances
CREATE POLICY "knowledge_sources_insert"
  ON knowledge_sources FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM knowledge_bases kb
      WHERE kb.id = knowledge_sources.knowledge_base_id
        AND kb.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM instances i
      WHERE i.id = knowledge_sources.instance_id
        AND i.user_id = auth.uid()
    )
  );

-- UPDATE: user can update sources linked to their knowledge bases OR their instances
CREATE POLICY "knowledge_sources_update"
  ON knowledge_sources FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM knowledge_bases kb
      WHERE kb.id = knowledge_sources.knowledge_base_id
        AND kb.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM instances i
      WHERE i.id = knowledge_sources.instance_id
        AND i.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM knowledge_bases kb
      WHERE kb.id = knowledge_sources.knowledge_base_id
        AND kb.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM instances i
      WHERE i.id = knowledge_sources.instance_id
        AND i.user_id = auth.uid()
    )
  );

-- DELETE: user can delete sources linked to their knowledge bases OR their instances
CREATE POLICY "knowledge_sources_delete"
  ON knowledge_sources FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM knowledge_bases kb
      WHERE kb.id = knowledge_sources.knowledge_base_id
        AND kb.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM instances i
      WHERE i.id = knowledge_sources.instance_id
        AND i.user_id = auth.uid()
    )
  );
