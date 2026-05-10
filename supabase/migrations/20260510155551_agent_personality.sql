/*
  # Personalidade do agente

  1. Novas colunas em `instances`:
    - display_name: nome amigável mostrado na interface
    - avatar_url: URL pública do avatar do agente
    - persona_name: nome que a IA usa ao se apresentar
    - company_name: empresa representada
    - tone: tom de voz (friendly, professional, casual, technical, warm)
    - language: idioma padrão (pt-BR, en-US, es)
    - color: cor de destaque (hex)
    - emoji_usage: nível de emojis (none, moderate, expressive)
    - signature: assinatura opcional anexada às respostas

  2. Backfill: display_name preenchido a partir de instance_name quando vazio.

  3. Storage:
    - Bucket público `agent-avatars` para armazenar avatares
    - Políticas: leitura pública, upload/update/delete apenas pelo dono autenticado
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instances' AND column_name='display_name') THEN
    ALTER TABLE instances ADD COLUMN display_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instances' AND column_name='avatar_url') THEN
    ALTER TABLE instances ADD COLUMN avatar_url text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instances' AND column_name='persona_name') THEN
    ALTER TABLE instances ADD COLUMN persona_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instances' AND column_name='company_name') THEN
    ALTER TABLE instances ADD COLUMN company_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instances' AND column_name='tone') THEN
    ALTER TABLE instances ADD COLUMN tone text DEFAULT 'friendly';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instances' AND column_name='language') THEN
    ALTER TABLE instances ADD COLUMN language text DEFAULT 'pt-BR';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instances' AND column_name='color') THEN
    ALTER TABLE instances ADD COLUMN color text DEFAULT '#3b82f6';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instances' AND column_name='emoji_usage') THEN
    ALTER TABLE instances ADD COLUMN emoji_usage text DEFAULT 'moderate';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instances' AND column_name='signature') THEN
    ALTER TABLE instances ADD COLUMN signature text DEFAULT '';
  END IF;
END $$;

UPDATE instances SET display_name = instance_name WHERE display_name IS NULL OR display_name = '';

INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-avatars', 'agent-avatars', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Public read agent avatars'
  ) THEN
    CREATE POLICY "Public read agent avatars"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'agent-avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Authenticated upload agent avatars'
  ) THEN
    CREATE POLICY "Authenticated upload agent avatars"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'agent-avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Authenticated update agent avatars'
  ) THEN
    CREATE POLICY "Authenticated update agent avatars"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'agent-avatars')
      WITH CHECK (bucket_id = 'agent-avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Authenticated delete agent avatars'
  ) THEN
    CREATE POLICY "Authenticated delete agent avatars"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'agent-avatars');
  END IF;
END $$;
