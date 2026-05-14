/*
  # Add feedback_comment to chat_logs

  1. New column
    - `feedback_comment` (text) - free-form note left by the operator about a specific agent answer.

  2. Notes
    - Pairs with the existing `feedback_quality` (good/bad), `corrected_response`, and `is_training_example` columns.
    - All four together feed the agent's training pipeline.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_logs' AND column_name = 'feedback_comment'
  ) THEN
    ALTER TABLE public.chat_logs ADD COLUMN feedback_comment text DEFAULT '';
  END IF;
END $$;
