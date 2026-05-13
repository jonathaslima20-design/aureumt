/*
  # Humanizacao avancada - 8 fases

  ## Resumo
  Adiciona toda a infraestrutura de banco para tornar os agentes indistinguiveis
  de humanos. Cobre persona profunda, memoria de longo prazo, perfil do cliente,
  aprendizado continuo, anti-repeticao, fases de conversa, exemplos few-shot,
  configuracoes de voz e RAG vetorial.

  ## Novas tabelas
  1. agent_personas - personalidade profunda do agente (regiao, hobbies, vicios de linguagem)
  2. customer_memory - memoria de longo prazo por cliente (nome, preferencias, fatos)
  3. customer_profile - perfil detectado automaticamente (idade, classe, formalidade)
  4. agent_learnings - aprendizado a partir de correcoes humanas (few-shot)
  5. response_history_hash - anti-repeticao lexical
  6. conversation_phases - fase atual da conversa por cliente
  7. human_examples - pares pergunta/resposta exemplares
  8. agent_voice_settings - configuracoes de TTS por agente
  9. knowledge_chunks - chunks vetoriais para RAG

  ## Extensao
  - Habilita pgvector para busca semantica
*/

CREATE EXTENSION IF NOT EXISTS vector;

-- 1. agent_personas
CREATE TABLE IF NOT EXISTS agent_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  age_range text DEFAULT '',
  region text DEFAULT '',
  background_story text DEFAULT '',
  hobbies text DEFAULT '',
  speech_quirks text DEFAULT '',
  favorite_phrases text DEFAULT '',
  formality_level text DEFAULT 'adaptive',
  use_typos boolean DEFAULT true,
  use_abbreviations boolean DEFAULT true,
  use_hesitations boolean DEFAULT true,
  use_regional_slang boolean DEFAULT false,
  anti_detection_mode boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(instance_id)
);

ALTER TABLE agent_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own agent personas"
  ON agent_personas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = agent_personas.instance_id AND i.user_id = auth.uid()));

CREATE POLICY "users insert own agent personas"
  ON agent_personas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM instances i WHERE i.id = agent_personas.instance_id AND i.user_id = auth.uid()));

CREATE POLICY "users update own agent personas"
  ON agent_personas FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = agent_personas.instance_id AND i.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM instances i WHERE i.id = agent_personas.instance_id AND i.user_id = auth.uid()));

CREATE POLICY "users delete own agent personas"
  ON agent_personas FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = agent_personas.instance_id AND i.user_id = auth.uid()));

-- 2. customer_memory
CREATE TABLE IF NOT EXISTS customer_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_number text NOT NULL,
  customer_name text DEFAULT '',
  facts jsonb DEFAULT '[]'::jsonb,
  preferences jsonb DEFAULT '{}'::jsonb,
  last_topics text DEFAULT '',
  relationship_level text DEFAULT 'new',
  total_interactions int DEFAULT 0,
  last_interaction_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(instance_id, customer_number)
);

ALTER TABLE customer_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own customer memory"
  ON customer_memory FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = customer_memory.instance_id AND i.user_id = auth.uid()));

CREATE POLICY "users insert own customer memory"
  ON customer_memory FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM instances i WHERE i.id = customer_memory.instance_id AND i.user_id = auth.uid()));

CREATE POLICY "users update own customer memory"
  ON customer_memory FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = customer_memory.instance_id AND i.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM instances i WHERE i.id = customer_memory.instance_id AND i.user_id = auth.uid()));

CREATE POLICY "users delete own customer memory"
  ON customer_memory FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = customer_memory.instance_id AND i.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_customer_memory_lookup ON customer_memory(instance_id, customer_number);

-- 3. customer_profile
CREATE TABLE IF NOT EXISTS customer_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_number text NOT NULL,
  detected_age_range text DEFAULT '',
  formality_preference text DEFAULT 'neutral',
  detected_emotion text DEFAULT 'neutral',
  technical_level text DEFAULT 'medium',
  communication_style text DEFAULT 'text',
  buying_intent text DEFAULT 'unknown',
  preferred_pronoun text DEFAULT 'voce',
  last_updated timestamptz DEFAULT now(),
  UNIQUE(instance_id, customer_number)
);

ALTER TABLE customer_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own customer profile"
  ON customer_profile FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = customer_profile.instance_id AND i.user_id = auth.uid()));

CREATE POLICY "users insert own customer profile"
  ON customer_profile FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM instances i WHERE i.id = customer_profile.instance_id AND i.user_id = auth.uid()));

CREATE POLICY "users update own customer profile"
  ON customer_profile FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = customer_profile.instance_id AND i.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM instances i WHERE i.id = customer_profile.instance_id AND i.user_id = auth.uid()));

CREATE POLICY "users delete own customer profile"
  ON customer_profile FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = customer_profile.instance_id AND i.user_id = auth.uid()));

-- 4. agent_learnings
CREATE TABLE IF NOT EXISTS agent_learnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_number text DEFAULT '',
  user_message text NOT NULL,
  bot_response text DEFAULT '',
  human_correction text NOT NULL,
  rating text DEFAULT 'corrected',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agent_learnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own learnings"
  ON agent_learnings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = agent_learnings.instance_id AND i.user_id = auth.uid()));

CREATE POLICY "users insert own learnings"
  ON agent_learnings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM instances i WHERE i.id = agent_learnings.instance_id AND i.user_id = auth.uid()));

CREATE POLICY "users update own learnings"
  ON agent_learnings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = agent_learnings.instance_id AND i.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM instances i WHERE i.id = agent_learnings.instance_id AND i.user_id = auth.uid()));

CREATE POLICY "users delete own learnings"
  ON agent_learnings FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = agent_learnings.instance_id AND i.user_id = auth.uid()));

-- 5. response_history_hash
CREATE TABLE IF NOT EXISTS response_history_hash (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_number text NOT NULL,
  response_hash text NOT NULL,
  response_preview text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE response_history_hash ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own response hashes"
  ON response_history_hash FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = response_history_hash.instance_id AND i.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_response_hash_lookup ON response_history_hash(instance_id, customer_number, created_at DESC);

-- 6. conversation_phases
CREATE TABLE IF NOT EXISTS conversation_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_number text NOT NULL,
  phase text DEFAULT 'discovery',
  last_intent text DEFAULT '',
  detected_emotion text DEFAULT 'neutral',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(instance_id, customer_number)
);

ALTER TABLE conversation_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own phases"
  ON conversation_phases FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = conversation_phases.instance_id AND i.user_id = auth.uid()));

-- 7. human_examples (curated few-shot exemplares pelo dono)
CREATE TABLE IF NOT EXISTS human_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  trigger_keyword text DEFAULT '',
  example_question text NOT NULL,
  ideal_response text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE human_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own examples"
  ON human_examples FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = human_examples.instance_id AND i.user_id = auth.uid()));

CREATE POLICY "users insert own examples"
  ON human_examples FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM instances i WHERE i.id = human_examples.instance_id AND i.user_id = auth.uid()));

CREATE POLICY "users update own examples"
  ON human_examples FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = human_examples.instance_id AND i.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM instances i WHERE i.id = human_examples.instance_id AND i.user_id = auth.uid()));

CREATE POLICY "users delete own examples"
  ON human_examples FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = human_examples.instance_id AND i.user_id = auth.uid()));

-- 8. agent_voice_settings
CREATE TABLE IF NOT EXISTS agent_voice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  enabled boolean DEFAULT false,
  voice_id text DEFAULT '',
  voice_provider text DEFAULT 'elevenlabs',
  audio_response_rate numeric DEFAULT 0.0,
  mirror_audio boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(instance_id)
);

ALTER TABLE agent_voice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own voice settings"
  ON agent_voice_settings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = agent_voice_settings.instance_id AND i.user_id = auth.uid()));

CREATE POLICY "users insert own voice settings"
  ON agent_voice_settings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM instances i WHERE i.id = agent_voice_settings.instance_id AND i.user_id = auth.uid()));

CREATE POLICY "users update own voice settings"
  ON agent_voice_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = agent_voice_settings.instance_id AND i.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM instances i WHERE i.id = agent_voice_settings.instance_id AND i.user_id = auth.uid()));

CREATE POLICY "users delete own voice settings"
  ON agent_voice_settings FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM instances i WHERE i.id = agent_voice_settings.instance_id AND i.user_id = auth.uid()));

-- 9. knowledge_chunks (RAG vetorial)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_source_id uuid NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  knowledge_base_id uuid REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  chunk_index int DEFAULT 0,
  content text NOT NULL,
  token_count int DEFAULT 0,
  embedding vector(768),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own chunks via base"
  ON knowledge_chunks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM knowledge_bases kb
      WHERE kb.id = knowledge_chunks.knowledge_base_id AND kb.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_base ON knowledge_chunks(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source ON knowledge_chunks(knowledge_source_id);
