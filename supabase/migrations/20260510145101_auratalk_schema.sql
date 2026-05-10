/*
  # Schema Inicial do AuraTalk

  1. Tabelas
    - profiles, api_configs, instances, chat_logs
  2. Segurança
    - RLS habilitado em todas as tabelas
    - Função is_admin() SECURITY DEFINER evita recursão infinita
    - Policies por usuário com fallback para admin
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

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE POLICY "profiles_select_own_or_admin"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own_or_admin"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "api_configs_select"
  ON api_configs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL OR public.is_admin());

CREATE POLICY "api_configs_insert"
  ON api_configs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND public.is_admin()));

CREATE POLICY "api_configs_update"
  ON api_configs FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (user_id IS NULL AND public.is_admin()))
  WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND public.is_admin()));

CREATE POLICY "api_configs_delete"
  ON api_configs FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "instances_select"
  ON instances FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "instances_insert"
  ON instances FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "instances_update"
  ON instances FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "instances_delete"
  ON instances FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "chat_logs_select"
  ON chat_logs FOR SELECT TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM instances i
      WHERE i.id = chat_logs.instance_id AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_logs_insert"
  ON chat_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM instances i
      WHERE i.id = chat_logs.instance_id AND i.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_chat_logs_instance ON chat_logs(instance_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instances_user ON instances(user_id);
