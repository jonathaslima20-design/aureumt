/*
  # Auto-create agent_learnings from chat_logs feedback

  Adds a trigger that syncs `chat_logs` feedback (corrected_response,
  feedback_comment with bad quality) into the `agent_learnings`
  table, so the "Aprendizados" tab in Treinamento always reflects
  manual corrections from chat.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='agent_learnings' AND column_name='source_chat_log_id'
  ) THEN
    ALTER TABLE agent_learnings ADD COLUMN source_chat_log_id uuid;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agent_learnings_source_chat_log_id_key'
  ) THEN
    ALTER TABLE agent_learnings
      ADD CONSTRAINT agent_learnings_source_chat_log_id_key
      UNIQUE (source_chat_log_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_learning_from_chat_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correction text;
  v_user_message text;
BEGIN
  IF NEW.direction <> 'out' OR NEW.instance_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_correction := COALESCE(NULLIF(trim(COALESCE(NEW.corrected_response, '')), ''), NULL);
  IF v_correction IS NULL
     AND COALESCE(NEW.feedback_quality, '') = 'bad'
     AND COALESCE(trim(NEW.feedback_comment), '') <> '' THEN
    v_correction := trim(NEW.feedback_comment);
  END IF;

  IF v_correction IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT message_body INTO v_user_message
  FROM chat_logs
  WHERE instance_id = NEW.instance_id
    AND customer_number = NEW.customer_number
    AND direction = 'in'
    AND created_at < NEW.created_at
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_message IS NULL OR trim(v_user_message) = '' THEN
    v_user_message := '(mensagem inicial sem contexto)';
  END IF;

  INSERT INTO agent_learnings (
    instance_id, customer_number, user_message, bot_response,
    human_correction, rating, is_active, source_chat_log_id
  )
  VALUES (
    NEW.instance_id,
    COALESCE(NEW.customer_number, ''),
    v_user_message,
    COALESCE(NEW.message_body, ''),
    v_correction,
    'corrected',
    true,
    NEW.id
  )
  ON CONFLICT (source_chat_log_id) DO UPDATE
    SET human_correction = EXCLUDED.human_correction,
        bot_response = EXCLUDED.bot_response,
        user_message = EXCLUDED.user_message,
        is_active = true;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_logs_sync_learning ON chat_logs;
CREATE TRIGGER chat_logs_sync_learning
  AFTER INSERT OR UPDATE OF feedback_quality, feedback_comment, corrected_response
  ON chat_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_learning_from_chat_feedback();

INSERT INTO agent_learnings (
  instance_id, customer_number, user_message, bot_response,
  human_correction, rating, is_active, source_chat_log_id
)
SELECT
  cl.instance_id,
  COALESCE(cl.customer_number, ''),
  COALESCE((
    SELECT message_body FROM chat_logs prev
    WHERE prev.instance_id = cl.instance_id
      AND prev.customer_number = cl.customer_number
      AND prev.direction = 'in'
      AND prev.created_at < cl.created_at
    ORDER BY prev.created_at DESC LIMIT 1
  ), '(mensagem inicial sem contexto)'),
  COALESCE(cl.message_body, ''),
  COALESCE(
    NULLIF(trim(COALESCE(cl.corrected_response, '')), ''),
    NULLIF(trim(COALESCE(cl.feedback_comment, '')), '')
  ),
  'corrected',
  true,
  cl.id
FROM chat_logs cl
WHERE cl.direction = 'out'
  AND cl.instance_id IS NOT NULL
  AND (
    NULLIF(trim(COALESCE(cl.corrected_response, '')), '') IS NOT NULL
    OR (cl.feedback_quality = 'bad' AND NULLIF(trim(COALESCE(cl.feedback_comment, '')), '') IS NOT NULL)
  )
ON CONFLICT (source_chat_log_id) DO NOTHING;
