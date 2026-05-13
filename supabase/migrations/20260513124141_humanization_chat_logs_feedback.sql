/*
  # Humanizacao - Adicionar feedback aos chat_logs

  Adiciona colunas para marcar mensagens como exemplos de treinamento,
  qualidade percebida e correcao manual. Usado pelo painel de treinamento.

  ## Mudancas

  - chat_logs.feedback_quality: text (good, bad, excellent, '')
  - chat_logs.is_training_example: boolean
  - chat_logs.corrected_response: text
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_logs' AND column_name = 'feedback_quality') THEN
    ALTER TABLE public.chat_logs ADD COLUMN feedback_quality text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_logs' AND column_name = 'is_training_example') THEN
    ALTER TABLE public.chat_logs ADD COLUMN is_training_example boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_logs' AND column_name = 'corrected_response') THEN
    ALTER TABLE public.chat_logs ADD COLUMN corrected_response text DEFAULT '';
  END IF;
END $$;
