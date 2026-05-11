/*
  # Add knowledge_hit column to chat_logs

  ## Summary
  Adds a boolean column `knowledge_hit` to the `chat_logs` table to track whether
  the AI used knowledge base content when generating a response.

  ## Changes
  - `chat_logs.knowledge_hit` (boolean, default false) — true when the response
    was informed by at least one knowledge source from the agent's knowledge bases.

  ## Purpose
  Enables analytics in the admin dashboard to measure knowledge base effectiveness:
  how often the KB is actually being used vs. the agent relying purely on its
  trained knowledge.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_logs' AND column_name = 'knowledge_hit'
  ) THEN
    ALTER TABLE chat_logs ADD COLUMN knowledge_hit boolean NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_logs_knowledge_hit ON chat_logs(knowledge_hit) WHERE knowledge_hit = true;
