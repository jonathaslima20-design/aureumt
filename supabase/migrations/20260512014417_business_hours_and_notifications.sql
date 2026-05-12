/*
  # Business Hours, Notifications, and Conversion Events

  1. Modified Tables
    - `instances`: Added `business_hours` (jsonb, nullable) column for agent schedule configuration

  2. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to profiles)
      - `instance_id` (uuid, FK to instances)
      - `type` (text: overflow, keyword_alert)
      - `title` (text)
      - `body` (text)
      - `customer_number` (text)
      - `is_read` (boolean, default false)
      - `created_at` (timestamptz)

    - `conversion_events`
      - `id` (uuid, primary key)
      - `instance_id` (uuid, FK to instances)
      - `whatsapp_connection_id` (uuid, nullable FK to whatsapp_connections)
      - `customer_number` (text)
      - `event_type` (text: lead_captured, resolved, abandoned, sale_influenced)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

  3. Security
    - RLS enabled on both new tables
    - Users can only read/manage their own notifications
    - Users can only read conversion events for their own instances

  4. Indexes
    - notifications: (user_id, is_read, created_at DESC) for fast unread queries
    - conversion_events: (instance_id, created_at DESC) for dashboard queries
*/

-- Add business_hours column to instances
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instances' AND column_name = 'business_hours'
  ) THEN
    ALTER TABLE instances ADD COLUMN business_hours jsonb DEFAULT NULL;
  END IF;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instance_id uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'overflow',
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  customer_number text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read, created_at DESC);

-- Create conversion_events table
CREATE TABLE IF NOT EXISTS conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  whatsapp_connection_id uuid REFERENCES whatsapp_connections(id),
  customer_number text NOT NULL DEFAULT '',
  event_type text NOT NULL DEFAULT 'resolved',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_event_type CHECK (event_type IN ('lead_captured', 'resolved', 'abandoned', 'sale_influenced'))
);

ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversion events"
  ON conversion_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = conversion_events.instance_id
      AND instances.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own conversion events"
  ON conversion_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = conversion_events.instance_id
      AND instances.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_conversion_events_instance
  ON conversion_events (instance_id, created_at DESC);
