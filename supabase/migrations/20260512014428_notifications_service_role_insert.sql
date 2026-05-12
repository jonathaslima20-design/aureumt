/*
  # Allow service role to insert notifications

  1. Security Changes
    - Add INSERT policy for service_role on notifications table
    - This allows the webhook edge function to create notifications when overflow is detected
*/

CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  TO service_role
  WITH CHECK (true);
