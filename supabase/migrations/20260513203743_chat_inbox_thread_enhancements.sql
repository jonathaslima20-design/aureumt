/*
  # Chat Inbox & Thread Enhancements

  Adds inbox intelligence (unread counts, pin, archive), thread features
  (replies, delivery status) and message full-text search support.

  1. Changes to `conversation_states`
    - `last_seen_at` (timestamptz, default now) -- tracks when the operator last opened the conversation
    - `is_pinned` (boolean, default false) -- pinned conversations appear at the top
    - `is_archived` (boolean, default false) -- hidden from default inbox view
    - `unread_count` (integer, default 0) -- denormalized count of incoming messages since last_seen_at

  2. Changes to `chat_logs`
    - `reply_to_id` (uuid, FK self) -- quoted message id for reply/citation
    - `delivery_status` (text) -- pending | sent | delivered | read | failed (used for outgoing messages)
    - Backfill historical out messages as `sent`.

  3. New trigger `chat_logs_inbox_state`
    - On INSERT of incoming messages, upserts conversation_states and increments unread_count
      when the message arrives AFTER the stored last_seen_at.

  4. Indexes
    - GIN full-text index on chat_logs(message_body) using simple config for portuguese fallback
    - Index on conversation_states(instance_id, is_archived, is_pinned, updated_at desc)

  5. Security
    - RLS already enabled on both tables; existing policies cover the new columns.
*/

-- conversation_states columns -------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_states' AND column_name = 'last_seen_at'
  ) THEN
    ALTER TABLE conversation_states ADD COLUMN last_seen_at timestamptz DEFAULT now() NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_states' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE conversation_states ADD COLUMN is_pinned boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_states' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE conversation_states ADD COLUMN is_archived boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_states' AND column_name = 'unread_count'
  ) THEN
    ALTER TABLE conversation_states ADD COLUMN unread_count integer DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- chat_logs columns -----------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_logs' AND column_name = 'reply_to_id'
  ) THEN
    ALTER TABLE chat_logs ADD COLUMN reply_to_id uuid REFERENCES chat_logs(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_logs' AND column_name = 'delivery_status'
  ) THEN
    ALTER TABLE chat_logs ADD COLUMN delivery_status text DEFAULT 'sent' NOT NULL;
  END IF;
END $$;

-- Indexes ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_chat_logs_message_body_fts
  ON chat_logs USING gin (to_tsvector('simple', coalesce(message_body, '')));

CREATE INDEX IF NOT EXISTS idx_conversation_states_inbox
  ON conversation_states (instance_id, is_archived, is_pinned, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_logs_reply_to_id
  ON chat_logs (reply_to_id);

-- Trigger function to maintain unread_count on incoming messages -------------
CREATE OR REPLACE FUNCTION chat_logs_update_inbox_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.direction = 'in' AND NEW.instance_id IS NOT NULL THEN
    INSERT INTO conversation_states (instance_id, customer_number, manual_override, updated_at, last_seen_at, unread_count)
    VALUES (NEW.instance_id, NEW.customer_number, false, NEW.created_at, to_timestamp(0), 1)
    ON CONFLICT (instance_id, customer_number) DO UPDATE
      SET updated_at = NEW.created_at,
          unread_count = CASE
            WHEN NEW.created_at > conversation_states.last_seen_at
              THEN conversation_states.unread_count + 1
            ELSE conversation_states.unread_count
          END,
          is_archived = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_logs_inbox_state ON chat_logs;
CREATE TRIGGER chat_logs_inbox_state
  AFTER INSERT ON chat_logs
  FOR EACH ROW
  EXECUTE FUNCTION chat_logs_update_inbox_state();
