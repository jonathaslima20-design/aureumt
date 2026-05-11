/*
  # Add media columns to chat_logs

  1. Modified Tables
    - `chat_logs`
      - `media_type` (text, nullable) - Type of media: 'audio', 'image', 'video', 'document'
      - `media_url` (text, nullable) - Base64 data URI or URL for the media content

  2. Important Notes
    - These columns allow the frontend to render audio players and image previews
    - Nullable so existing text-only messages are unaffected
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_logs' AND column_name = 'media_type'
  ) THEN
    ALTER TABLE chat_logs ADD COLUMN media_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_logs' AND column_name = 'media_url'
  ) THEN
    ALTER TABLE chat_logs ADD COLUMN media_url text;
  END IF;
END $$;
