/*
  # Estados de Conversa e Índices

  1. Nova Tabela
    - `conversation_states`: controla se uma conversa específica está em modo manual
      - `id` (uuid, PK)
      - `instance_id` (uuid, FK instances)
      - `customer_number` (text)
      - `manual_override` (boolean, default false)
      - `updated_at` (timestamptz)
      - Único por (instance_id, customer_number)

  2. Índices
    - Índice em chat_logs(instance_id, customer_number, created_at desc) para acelerar a página Conversas

  3. Segurança
    - RLS habilitado na nova tabela
    - Usuário só acessa estados de suas próprias instâncias
    - Admin acessa tudo
*/

CREATE TABLE IF NOT EXISTS conversation_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_number text NOT NULL,
  manual_override boolean DEFAULT false NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (instance_id, customer_number)
);

ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chat_logs_instance_customer_created
  ON chat_logs (instance_id, customer_number, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_states_instance
  ON conversation_states (instance_id);

CREATE POLICY "Users read own conversation states"
  ON conversation_states FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM instances i
      WHERE i.id = conversation_states.instance_id
        AND (i.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        ))
    )
  );

CREATE POLICY "Users insert own conversation states"
  ON conversation_states FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM instances i
      WHERE i.id = conversation_states.instance_id
        AND (i.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        ))
    )
  );

CREATE POLICY "Users update own conversation states"
  ON conversation_states FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM instances i
      WHERE i.id = conversation_states.instance_id
        AND (i.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM instances i
      WHERE i.id = conversation_states.instance_id
        AND (i.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        ))
    )
  );

CREATE POLICY "Users delete own conversation states"
  ON conversation_states FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM instances i
      WHERE i.id = conversation_states.instance_id
        AND (i.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        ))
    )
  );
