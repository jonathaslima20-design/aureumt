/*
  # Add connection and knowledge base limits to plans

  1. Modified Tables
    - `plans`
      - `max_connections` (integer, nullable - null means unlimited) - Maximum WhatsApp connections per user
      - `max_knowledge_bases` (integer, nullable - null means unlimited) - Maximum knowledge bases per user

  2. Updates
    - Business plan: 1 connection, 2 knowledge bases
    - Pro plan: 3 connections, 10 knowledge bases
    - Elite plan: unlimited (null)

  3. Notes
    - null value means unlimited for that resource
    - These limits match the feature descriptions shown in the plans UI
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'max_connections'
  ) THEN
    ALTER TABLE plans ADD COLUMN max_connections integer DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'max_knowledge_bases'
  ) THEN
    ALTER TABLE plans ADD COLUMN max_knowledge_bases integer DEFAULT NULL;
  END IF;
END $$;

UPDATE plans SET max_connections = 1, max_knowledge_bases = 2 WHERE slug = 'business';
UPDATE plans SET max_connections = 3, max_knowledge_bases = 10 WHERE slug = 'pro';
UPDATE plans SET max_connections = NULL, max_knowledge_bases = NULL WHERE slug = 'elite';
