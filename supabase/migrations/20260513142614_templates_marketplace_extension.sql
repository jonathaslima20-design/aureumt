/*
  # Templates Marketplace Extension

  ## Summary
  Extends the agent_templates table with marketplace-grade metadata
  (category, tags, tagline, capabilities, example conversation, ideal_for,
  recommended integrations, setup time, featured flag) and introduces a
  template_usage_stats table to power popularity counters and "most used"
  social proof. Also seeds the existing 6 templates with the new fields.

  ## Modified Tables
  - agent_templates: adds 9 new optional columns (no destructive changes)

  ## New Tables
  - template_usage_stats: one row per (template_id, user_id, created_at)
    representing each time a user creates an agent from a template.

  ## Security
  - RLS preserved on agent_templates (existing policies cover new columns)
  - template_usage_stats: RLS enabled
    - INSERT: any authenticated user can record their own usage
    - SELECT: any authenticated user can read aggregated usage (used for
      counters); we expose row-level data only to the same user.
*/

-- ── Extend agent_templates ───────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'agent_templates' AND column_name = 'category') THEN
    ALTER TABLE agent_templates ADD COLUMN category text NOT NULL DEFAULT 'geral';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'agent_templates' AND column_name = 'tagline') THEN
    ALTER TABLE agent_templates ADD COLUMN tagline text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'agent_templates' AND column_name = 'tags') THEN
    ALTER TABLE agent_templates ADD COLUMN tags text[] NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'agent_templates' AND column_name = 'capabilities') THEN
    ALTER TABLE agent_templates ADD COLUMN capabilities jsonb NOT NULL DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'agent_templates' AND column_name = 'example_conversation') THEN
    ALTER TABLE agent_templates ADD COLUMN example_conversation jsonb NOT NULL DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'agent_templates' AND column_name = 'ideal_for') THEN
    ALTER TABLE agent_templates ADD COLUMN ideal_for text[] NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'agent_templates' AND column_name = 'recommended_integrations') THEN
    ALTER TABLE agent_templates ADD COLUMN recommended_integrations text[] NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'agent_templates' AND column_name = 'setup_time_minutes') THEN
    ALTER TABLE agent_templates ADD COLUMN setup_time_minutes int NOT NULL DEFAULT 2;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'agent_templates' AND column_name = 'is_featured') THEN
    ALTER TABLE agent_templates ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ── Usage stats ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS template_usage_stats (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  uuid NOT NULL REFERENCES agent_templates(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_usage_template ON template_usage_stats(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_user     ON template_usage_stats(user_id);

ALTER TABLE template_usage_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can record own template usage" ON template_usage_stats;
CREATE POLICY "Users can record own template usage"
  ON template_usage_stats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own template usage" ON template_usage_stats;
CREATE POLICY "Users can read own template usage"
  ON template_usage_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all template usage" ON template_usage_stats;
CREATE POLICY "Admins can read all template usage"
  ON template_usage_stats FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ── Public counts function (security definer to bypass RLS for aggregates) ──
CREATE OR REPLACE FUNCTION public.template_usage_counts()
RETURNS TABLE(template_id uuid, total bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT template_id, COUNT(*)::bigint AS total
  FROM template_usage_stats
  GROUP BY template_id;
$$;

GRANT EXECUTE ON FUNCTION public.template_usage_counts() TO authenticated;

-- ── Seed metadata for existing templates ─────────────────────────────────
UPDATE agent_templates SET
  category = 'vendas',
  tagline = 'Qualifica leads e fecha vendas no automatico',
  tags = ARRAY['vendas','whatsapp','conversao'],
  capabilities = '["Faz perguntas de qualificacao","Apresenta solucoes sob medida","Conduz ate o fechamento","Envia link de pagamento"]'::jsonb,
  ideal_for = ARRAY['Lojas','SaaS','Servicos'],
  recommended_integrations = ARRAY['whatsapp'],
  setup_time_minutes = 2,
  is_featured = true,
  example_conversation = '[
    {"role":"user","content":"Oi, queria saber mais sobre o produto"},
    {"role":"assistant","content":"Oi! Que bom ter voce aqui. Para eu te ajudar melhor, me conta rapidinho: o que voce esta tentando resolver hoje?"},
    {"role":"user","content":"Preciso organizar atendimento no whatsapp"},
    {"role":"assistant","content":"Show, esse e um problema bem comum. E sozinho ou voce tem time? Quantos atendimentos por dia voces recebem?"}
  ]'::jsonb
WHERE title = 'Vendas';

UPDATE agent_templates SET
  category = 'suporte',
  tagline = 'Atendimento claro, resolutivo e humano',
  tags = ARRAY['suporte','sac','whatsapp'],
  capabilities = '["Identifica o problema rapido","Da solucao passo a passo","Confirma resolucao","Escala para humano quando precisa"]'::jsonb,
  ideal_for = ARRAY['SaaS','Servicos','Clinicas'],
  recommended_integrations = ARRAY['whatsapp'],
  setup_time_minutes = 2,
  is_featured = true,
  example_conversation = '[
    {"role":"user","content":"Nao consigo entrar na minha conta"},
    {"role":"assistant","content":"Vou te ajudar agora. Voce esta vendo alguma mensagem de erro especifica?"},
    {"role":"user","content":"Diz que a senha esta errada"},
    {"role":"assistant","content":"Vamos resolver. Clique em Esqueci minha senha na tela de login - vou te guiar passo a passo se precisar."}
  ]'::jsonb
WHERE title = 'Atendimento';

UPDATE agent_templates SET
  category = 'vendas',
  tagline = 'Pre-vendas que agenda reunioes qualificadas',
  tags = ARRAY['sdr','agendamento','b2b'],
  capabilities = '["Qualifica BANT","Detecta fit comercial","Agenda reunioes no calendario","Repassa contexto para o time"]'::jsonb,
  ideal_for = ARRAY['B2B','Agencias','Consultorias'],
  recommended_integrations = ARRAY['calendario','whatsapp'],
  setup_time_minutes = 3,
  is_featured = true,
  example_conversation = '[
    {"role":"user","content":"Vi seu anuncio, queria saber mais"},
    {"role":"assistant","content":"Que otimo! Para a gente nao perder seu tempo, me conta: qual o tamanho da sua operacao hoje? E ha quanto tempo busca uma solucao?"}
  ]'::jsonb
WHERE title = 'SDR';

UPDATE agent_templates SET
  category = 'ecommerce',
  tagline = 'Assistente de loja que vende e tira duvidas',
  tags = ARRAY['ecommerce','catalogo','pedidos'],
  capabilities = '["Indica produtos do catalogo","Tira duvidas sobre entrega","Explica politica de troca","Recupera carrinho abandonado"]'::jsonb,
  ideal_for = ARRAY['Lojas online','Marketplaces','Boutiques'],
  recommended_integrations = ARRAY['whatsapp','catalogo'],
  setup_time_minutes = 3,
  is_featured = false,
  example_conversation = '[
    {"role":"user","content":"Tem aquela camisa azul tamanho M?"},
    {"role":"assistant","content":"Tenho sim! Posso te enviar o link direto do produto. Quer que eu confirme se tem entrega para sua regiao?"}
  ]'::jsonb
WHERE title = 'E-commerce';

UPDATE agent_templates SET
  category = 'suporte',
  tagline = 'Responde duvidas frequentes com precisao',
  tags = ARRAY['faq','suporte','autoatendimento'],
  capabilities = '["Responde duvidas comuns","Cita informacoes oficiais","Encaminha para humano se preciso"]'::jsonb,
  ideal_for = ARRAY['SaaS','Servicos','Educacao'],
  recommended_integrations = ARRAY['base de conhecimento'],
  setup_time_minutes = 2,
  is_featured = false,
  example_conversation = '[
    {"role":"user","content":"Quais formas de pagamento voces aceitam?"},
    {"role":"assistant","content":"Aceitamos cartao de credito, boleto e Pix. Quer que eu envie o link para conferir?"}
  ]'::jsonb
WHERE title = 'FAQ';

UPDATE agent_templates SET
  category = 'geral',
  tagline = 'Comece do zero e personalize tudo',
  tags = ARRAY['blank','custom'],
  capabilities = '["Totalmente personalizavel","Sem restricoes de prompt"]'::jsonb,
  ideal_for = ARRAY['Casos especificos'],
  recommended_integrations = ARRAY[]::text[],
  setup_time_minutes = 5,
  is_featured = false,
  example_conversation = '[]'::jsonb
WHERE title = 'Em branco';
