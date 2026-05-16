/*
  # Add profile picture URL to conversation states

  1. Modified Tables
    - `conversation_states`
      - Added `profile_picture_url` (text, nullable) - cached WhatsApp profile picture URL for the contact
      - Added `profile_picture_fetched_at` (timestamptz, nullable) - timestamp of when the picture was last fetched, for cache invalidation

  2. Important Notes
    - This allows caching the contact's WhatsApp profile picture URL to avoid repeated API calls
    - The fetched_at timestamp enables periodic refresh of the cached URL
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_states' AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE conversation_states ADD COLUMN profile_picture_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_states' AND column_name = 'profile_picture_fetched_at'
  ) THEN
    ALTER TABLE conversation_states ADD COLUMN profile_picture_fetched_at timestamptz;
  END IF;
END $$;
