/*
  # User UI Preferences

  1. New Tables
    - `user_ui_preferences` — stores per-user UI choices to allow people to control density and dismiss hints
      - `user_id` (uuid, PK, references auth.users)
      - `density` (text: 'compact' | 'comfortable', default 'comfortable')
      - `sidebar_collapsed` (boolean, default false)
      - `focus_mode` (boolean, default false) — hides secondary KPIs and decorative chrome
      - `created_at`, `updated_at`

    - `dismissed_hints` — tracks which educational hints the user has dismissed (one row per hint key per user)
      - `id` (uuid, PK)
      - `user_id` (uuid, FK)
      - `hint_key` (text)
      - `dismissed_at` (timestamptz)

  2. Security
    - RLS enabled on both tables
    - Users can only read/write their own preferences and dismissed hints

  3. Notes
    - These tables back a system-wide visual decluttering effort, allowing the UI to
      remember per-user density and progressively hide noise.
*/

CREATE TABLE IF NOT EXISTS user_ui_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  density text NOT NULL DEFAULT 'comfortable',
  sidebar_collapsed boolean NOT NULL DEFAULT false,
  focus_mode boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_ui_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_ui_preferences' AND policyname = 'Users read own ui prefs') THEN
    CREATE POLICY "Users read own ui prefs"
      ON user_ui_preferences FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_ui_preferences' AND policyname = 'Users insert own ui prefs') THEN
    CREATE POLICY "Users insert own ui prefs"
      ON user_ui_preferences FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_ui_preferences' AND policyname = 'Users update own ui prefs') THEN
    CREATE POLICY "Users update own ui prefs"
      ON user_ui_preferences FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS dismissed_hints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hint_key text NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, hint_key)
);

ALTER TABLE dismissed_hints ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dismissed_hints' AND policyname = 'Users read own dismissed hints') THEN
    CREATE POLICY "Users read own dismissed hints"
      ON dismissed_hints FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dismissed_hints' AND policyname = 'Users insert own dismissed hints') THEN
    CREATE POLICY "Users insert own dismissed hints"
      ON dismissed_hints FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dismissed_hints' AND policyname = 'Users delete own dismissed hints') THEN
    CREATE POLICY "Users delete own dismissed hints"
      ON dismissed_hints FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
