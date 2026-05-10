/*
  # AuraTalk SaaS Initial Schema

  1. New Tables
    - `profiles` - User profiles with role and plan status
      - `id` (uuid, references auth.users)
      - `email` (text)
      - `role` (text, admin or user)
      - `plan_status` (text, active/inactive/trial)
      - `created_at` (timestamptz)
    - `api_configs` - API credentials (global if user_id is null, or per-user)
      - `id` (uuid)
      - `user_id` (uuid, nullable, references profiles)
      - `gemini_key` (text)
      - `evolution_url` (text)
      - `evolution_key` (text)
      - `is_active` (boolean)
    - `instances` - WhatsApp instance configurations
      - `id` (uuid)
      - `user_id` (uuid, references profiles)
      - `instance_name` (text)
      - `evolution_instance_id` (text)
      - `system_prompt` (text)
      - `status` (text, open/close)
      - `response_delay` (int, milliseconds)
      - `flow_status` (text, active/paused)
      - `overflow_keyword` (text)
    - `chat_logs` - Message history
      - `id` (uuid)
      - `instance_id` (uuid, references instances)
      - `customer_number` (text)
      - `direction` (text, in/out)
      - `message_body` (text)
      - `tokens_used` (int)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Admins can access everything via role check
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  plan_status text NOT NULL DEFAULT 'trial',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  gemini_key text DEFAULT '',
  evolution_url text DEFAULT '',
  evolution_key text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instance_name text NOT NULL,
  evolution_instance_id text DEFAULT '',
  system_prompt text DEFAULT '',
  status text DEFAULT 'close',
  response_delay integer DEFAULT 3000,
  flow_status text DEFAULT 'active',
  overflow_keyword text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_number text NOT NULL,
  direction text NOT NULL,
  message_body text DEFAULT '',
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Users insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Users read own api_configs or global"
  ON api_configs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Users insert own api_configs"
  ON api_configs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')));

CREATE POLICY "Users update own api_configs"
  ON api_configs FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (user_id IS NULL AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')))
  WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')));

CREATE POLICY "Admins delete api_configs"
  ON api_configs FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Users read own instances"
  ON instances FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Users insert own instances"
  ON instances FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own instances"
  ON instances FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Users delete own instances"
  ON instances FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Users read own chat_logs"
  ON chat_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = chat_logs.instance_id AND (i.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))));

CREATE POLICY "Users insert own chat_logs"
  ON chat_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM instances i WHERE i.id = chat_logs.instance_id AND i.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_chat_logs_instance ON chat_logs(instance_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instances_user ON instances(user_id);
