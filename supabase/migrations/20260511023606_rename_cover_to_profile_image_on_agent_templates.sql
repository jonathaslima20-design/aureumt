-- Rename cover_image_url to profile_image_url on agent_templates

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_templates' AND column_name = 'cover_image_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_templates' AND column_name = 'profile_image_url'
  ) THEN
    ALTER TABLE agent_templates RENAME COLUMN cover_image_url TO profile_image_url;
  END IF;
END $$;
