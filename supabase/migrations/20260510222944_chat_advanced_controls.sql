/*
  # Chat Advanced Controls

  1. New Tables
    - `quick_replies`
      - `id` (uuid, pk)
      - `user_id` (uuid, fk profiles)
      - `instance_id` (uuid, nullable fk instances — null = applies to all instances of this user)
      - `shortcut` (text — trigger keyword, e.g. "saudacao")
      - `title` (text — display name in picker)
      - `body` (text — message content)
      - `sort_order` (integer — ordering)
      - `created_at` (timestamptz)

    - `contact_notes`
      - `id` (uuid, pk)
      - `instance_id` (uuid, fk instances)
      - `customer_number` (text)
      - `content` (text)
      - `created_at` (timestamptz)

    - `contact_labels`
      - `id` (uuid, pk)
      - `instance_id` (uuid, fk instances)
      - `customer_number` (text)
      - `label` (text)
      - `color` (text — hex color)
      - `created_at` (timestamptz)

  2. Modified Tables
    - `conversation_states`: add `contact_name` (text, nullable) — operator-defined alias for the phone number

  3. Security
    - RLS enabled on all new tables
    - Policies restrict access via instance ownership (joining instances → user_id = auth.uid())
*/

-- quick_replies
CREATE TABLE IF NOT EXISTS quick_replies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instance_id uuid REFERENCES instances(id) ON DELETE CASCADE,
  shortcut    text NOT NULL DEFAULT '',
  title       text NOT NULL DEFAULT '',
  body        text NOT NULL DEFAULT '',
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own quick replies"
  ON quick_replies FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own quick replies"
  ON quick_replies FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own quick replies"
  ON quick_replies FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own quick replies"
  ON quick_replies FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- contact_notes
CREATE TABLE IF NOT EXISTS contact_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id     uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_number text NOT NULL,
  content         text NOT NULL DEFAULT '',
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select notes for own instances"
  ON contact_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = contact_notes.instance_id
        AND instances.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert notes for own instances"
  ON contact_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = contact_notes.instance_id
        AND instances.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete notes for own instances"
  ON contact_notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = contact_notes.instance_id
        AND instances.user_id = auth.uid()
    )
  );

-- contact_labels
CREATE TABLE IF NOT EXISTS contact_labels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id     uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_number text NOT NULL,
  label           text NOT NULL,
  color           text NOT NULL DEFAULT '#3b82f6',
  created_at      timestamptz DEFAULT now(),
  UNIQUE (instance_id, customer_number, label)
);

ALTER TABLE contact_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select labels for own instances"
  ON contact_labels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = contact_labels.instance_id
        AND instances.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert labels for own instances"
  ON contact_labels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = contact_labels.instance_id
        AND instances.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete labels for own instances"
  ON contact_labels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = contact_labels.instance_id
        AND instances.user_id = auth.uid()
    )
  );

-- Add contact_name to conversation_states
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_states' AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE conversation_states ADD COLUMN contact_name text;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS quick_replies_user_idx ON quick_replies(user_id);
CREATE INDEX IF NOT EXISTS contact_notes_instance_customer_idx ON contact_notes(instance_id, customer_number);
CREATE INDEX IF NOT EXISTS contact_labels_instance_customer_idx ON contact_labels(instance_id, customer_number);
