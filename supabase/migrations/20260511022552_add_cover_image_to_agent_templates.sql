/*
  # Add cover_image_url to agent_templates

  1. Changes
    - `agent_templates`: add `cover_image_url` (text, nullable) — public URL of the uploaded cover photo shown on the template card
  
  2. Notes
    - Nullable: templates without a cover photo keep the existing emoji + glassmorphism card look
    - Upload handled via Supabase Storage bucket `template-covers` (public)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_templates' AND column_name = 'cover_image_url'
  ) THEN
    ALTER TABLE agent_templates ADD COLUMN cover_image_url text DEFAULT NULL;
  END IF;
END $$;
