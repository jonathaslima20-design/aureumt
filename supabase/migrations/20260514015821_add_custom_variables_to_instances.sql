/*
  # Add custom variables to instances

  1. New columns
    - `custom_variables` (jsonb) - array of `{ key, value }` pairs used to replace `{{key}}` placeholders in `base_prompt`.
    - `base_prompt` (text) - raw user-authored prompt template (with placeholders) before substitution. The fully resolved version remains in `system_prompt`.

  2. Notes
    - Both columns are optional; existing agents are unaffected.
    - Default for `custom_variables` is an empty array.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instances' AND column_name = 'custom_variables'
  ) THEN
    ALTER TABLE instances ADD COLUMN custom_variables jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instances' AND column_name = 'base_prompt'
  ) THEN
    ALTER TABLE instances ADD COLUMN base_prompt text NOT NULL DEFAULT '';
  END IF;
END $$;
