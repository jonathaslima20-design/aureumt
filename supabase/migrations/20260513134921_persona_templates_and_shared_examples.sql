/*
  # Persona Templates, Shared Examples Library, and Legacy KB Migration

  1. New Tables
    - `persona_templates` - Pre-built persona presets selectable when configuring an agent
      - id, name, description, icon (lucide icon name), category, region, age_range,
        background_story, hobbies, speech_quirks, favorite_phrases, formality_level,
        humanization toggles, is_official, created_by, created_at
    - `shared_examples` - User-level shared library of question/response pairs reusable across their agents
      - id, user_id, label, trigger_keyword, example_question, ideal_response, created_at

  2. Modified Tables
    - `human_examples` - add `source_shared_id` column to track origin from shared library

  3. Data Migration
    - Move legacy knowledge_sources rows that have instance_id but no knowledge_base_id
      into a per-user "Base Legada" knowledge_base, then link via instance_knowledge_bases

  4. Security
    - persona_templates: official templates readable by all authenticated, custom by owner
    - shared_examples: full RLS by user_id ownership
    - human_examples.source_shared_id: no policy change needed

  5. Seed Data
    - Insert 6 official persona templates covering common roles
*/

-- ============================================================================
-- PERSONA TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS persona_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'User',
  category text NOT NULL DEFAULT 'general',
  age_range text NOT NULL DEFAULT '25-35',
  region text NOT NULL DEFAULT 'sudeste',
  background_story text NOT NULL DEFAULT '',
  hobbies text NOT NULL DEFAULT '',
  speech_quirks text NOT NULL DEFAULT '',
  favorite_phrases text NOT NULL DEFAULT '',
  formality_level text NOT NULL DEFAULT 'adaptive',
  use_typos boolean NOT NULL DEFAULT true,
  use_abbreviations boolean NOT NULL DEFAULT true,
  use_hesitations boolean NOT NULL DEFAULT true,
  use_regional_slang boolean NOT NULL DEFAULT false,
  anti_detection_mode boolean NOT NULL DEFAULT true,
  is_official boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE persona_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read official or own templates" ON persona_templates;
CREATE POLICY "Anyone authenticated can read official or own templates"
  ON persona_templates FOR SELECT
  TO authenticated
  USING (is_official = true OR created_by = auth.uid());

DROP POLICY IF EXISTS "Users insert own templates" ON persona_templates;
CREATE POLICY "Users insert own templates"
  ON persona_templates FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid() AND is_official = false);

DROP POLICY IF EXISTS "Users update own templates" ON persona_templates;
CREATE POLICY "Users update own templates"
  ON persona_templates FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND is_official = false)
  WITH CHECK (created_by = auth.uid() AND is_official = false);

DROP POLICY IF EXISTS "Users delete own templates" ON persona_templates;
CREATE POLICY "Users delete own templates"
  ON persona_templates FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() AND is_official = false);

-- ============================================================================
-- SHARED EXAMPLES LIBRARY
-- ============================================================================

CREATE TABLE IF NOT EXISTS shared_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  trigger_keyword text NOT NULL DEFAULT '',
  example_question text NOT NULL,
  ideal_response text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shared_examples_user_id_idx ON shared_examples(user_id);

ALTER TABLE shared_examples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own shared examples" ON shared_examples;
CREATE POLICY "Users read own shared examples"
  ON shared_examples FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own shared examples" ON shared_examples;
CREATE POLICY "Users insert own shared examples"
  ON shared_examples FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own shared examples" ON shared_examples;
CREATE POLICY "Users update own shared examples"
  ON shared_examples FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own shared examples" ON shared_examples;
CREATE POLICY "Users delete own shared examples"
  ON shared_examples FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- LINK human_examples TO SHARED LIBRARY
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'human_examples' AND column_name = 'source_shared_id'
  ) THEN
    ALTER TABLE human_examples ADD COLUMN source_shared_id uuid REFERENCES shared_examples(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- LEGACY KB MIGRATION
-- For each instance with knowledge_sources rows that lack a knowledge_base_id,
-- create (or reuse) a per-user "Base Legada" knowledge_base, link the instance
-- to it, and assign the orphan sources to that base.
-- ============================================================================

DO $$
DECLARE
  inst RECORD;
  kb_id uuid;
BEGIN
  FOR inst IN
    SELECT DISTINCT i.id AS instance_id, i.user_id
    FROM instances i
    INNER JOIN knowledge_sources ks ON ks.instance_id = i.id
    WHERE ks.knowledge_base_id IS NULL
  LOOP
    SELECT id INTO kb_id
    FROM knowledge_bases
    WHERE user_id = inst.user_id AND name = 'Base Legada'
    LIMIT 1;

    IF kb_id IS NULL THEN
      INSERT INTO knowledge_bases (user_id, name, description)
      VALUES (inst.user_id, 'Base Legada', 'Migracao automatica de fontes vinculadas diretamente a agentes.')
      RETURNING id INTO kb_id;
    END IF;

    INSERT INTO instance_knowledge_bases (instance_id, knowledge_base_id)
    VALUES (inst.instance_id, kb_id)
    ON CONFLICT DO NOTHING;

    UPDATE knowledge_sources
    SET knowledge_base_id = kb_id
    WHERE instance_id = inst.instance_id AND knowledge_base_id IS NULL;
  END LOOP;
END $$;

-- ============================================================================
-- SEED OFFICIAL TEMPLATES
-- ============================================================================

INSERT INTO persona_templates (name, description, icon, category, age_range, region, background_story, hobbies, speech_quirks, favorite_phrases, formality_level, use_typos, use_abbreviations, use_hesitations, use_regional_slang, anti_detection_mode, is_official)
VALUES
  ('Vendedora SDR Animada', 'Energia alta, simpatica, foca em qualificar leads.', 'Smile', 'sales', '24-30', 'sudeste', 'Trabalha ha 2 anos como SDR. Antes era promotora de eventos. Mora em Sao Paulo.', 'Festas, viagens, treinos', 'Usa "amooor" e "que delicia"', 'que delicia, amooor, conta tudo, ai que demais', 'informal', true, true, true, true, true, true),
  ('Atendente de Suporte Calmo', 'Paciente, didatico, foca em resolver problemas.', 'Headphones', 'support', '30-40', 'sul', 'Atendente tecnico ha 5 anos. Formacao em sistemas.', 'Leitura, jogos, cinema', 'Fala "tranquilo" e "vamos por partes"', 'tranquilo, vamos por partes, sem stress, opa beleza', 'adaptive', false, true, true, false, true, true),
  ('Closer de Alta Conversao', 'Direto, confiante, foca em fechamento.', 'Target', 'sales', '32-42', 'sudeste', 'Vendedor B2B ha 8 anos. Especialista em fechamento.', 'Esportes, networking, livros de negocio', 'Direto ao ponto, faz perguntas de fechamento', 'bora fechar, faz sentido, vamos la, top', 'adaptive', false, true, false, false, true, true),
  ('Recepcionista Acolhedora', 'Calorosa, cuidadosa, ideal para clinicas e estetica.', 'Heart', 'reception', '28-38', 'nordeste', 'Recepcionista ha 4 anos. Curso de atendimento e empatia.', 'Bem-estar, jardinagem, cozinha', 'Carinhosa no tratamento', 'meu bem, com carinho, fica tranquila, imagina', 'adaptive', true, true, true, true, true, true),
  ('Tecnico Especialista', 'Preciso, jargao tecnico moderado, ideal para B2B.', 'Wrench', 'technical', '35-45', 'sudeste', 'Engenheiro ha 12 anos. Especialista em integracoes.', 'Tecnologia, fotografia', 'Preciso e detalhado', 'segue o protocolo, conforme spec, basicamente', 'formal', false, false, false, false, true, true),
  ('Consultora de Beleza', 'Animada com produtos, conhece tendencias, ideal para cosmeticos.', 'Sparkles', 'beauty', '22-32', 'sudeste', 'Trabalhou em loja de cosmeticos por 3 anos.', 'Skincare, moda, tendencias', 'Usa muitos diminutivos', 'um luxoo, perfeitinho, divino, arrasoou', 'informal', true, true, true, true, true, true)
ON CONFLICT DO NOTHING;
