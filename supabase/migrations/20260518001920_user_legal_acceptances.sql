/*
  # Create user_legal_acceptances table

  Records when users accept legal documents (Terms of Use, Privacy Policy).

  1. New Tables
    - `user_legal_acceptances`
      - `id` (uuid, primary key) - unique identifier for each acceptance record
      - `user_id` (uuid, references auth.users) - the user who accepted
      - `document_type` (text, not null) - type of document accepted (e.g. terms_of_use, privacy_policy)
      - `document_version` (text, not null) - version of the document accepted (e.g. 2026-05-17)
      - `accepted_at` (timestamptz) - when the acceptance occurred
      - `user_agent` (text) - browser user agent string at time of acceptance
      - `ip_address` (text, nullable) - IP address at time of acceptance
      - `created_at` (timestamptz) - row creation timestamp

  2. Security
    - Enable RLS on `user_legal_acceptances` table
    - Authenticated users can view only their own acceptance records
    - Authenticated users can insert only their own acceptance records
    - Admin users can view all acceptance records for audit purposes

  3. Indexes
    - Index on user_id for fast lookups during login
    - Unique constraint on (user_id, document_type, document_version) to prevent duplicate acceptances

  4. Notes
    - This table is used to enforce mandatory legal acceptance during signup
    - Existing users without acceptance records will be prompted to accept on next login
*/

CREATE TABLE IF NOT EXISTS user_legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, document_type, document_version)
);

CREATE INDEX IF NOT EXISTS idx_user_legal_acceptances_user_id
  ON user_legal_acceptances(user_id);

ALTER TABLE user_legal_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can view their own acceptance records
CREATE POLICY "Users can view own legal acceptances"
  ON user_legal_acceptances
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own acceptance records
CREATE POLICY "Users can insert own legal acceptances"
  ON user_legal_acceptances
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all acceptance records for audit
CREATE POLICY "Admins can view all legal acceptances"
  ON user_legal_acceptances
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
