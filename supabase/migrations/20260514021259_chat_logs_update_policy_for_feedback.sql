/*
  # chat_logs UPDATE policy for feedback

  Allows the owning user (the user who owns the related instance) to update
  feedback fields on chat_logs (feedback_quality, feedback_comment,
  is_training_example, corrected_response). Without this policy, RLS blocks
  the operator from rating answers from the chat UI.

  ## Security
    - Restricted to authenticated users.
    - Both USING and WITH CHECK ensure the row stays under the same owning instance.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.chat_logs'::regclass
      AND polname = 'chat_logs_update'
  ) THEN
    DROP POLICY chat_logs_update ON public.chat_logs;
  END IF;
END $$;

CREATE POLICY chat_logs_update
  ON public.chat_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM instances i
      WHERE i.id = chat_logs.instance_id
        AND i.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM instances i
      WHERE i.id = chat_logs.instance_id
        AND i.user_id = auth.uid()
    )
  );
