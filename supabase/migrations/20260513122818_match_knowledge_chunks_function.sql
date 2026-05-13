/*
  # match_knowledge_chunks function

  Funcao para busca semantica de chunks por similaridade de cosseno.
  Recebe um vetor de embedding e os IDs das knowledge_bases permitidas.
  Retorna os chunks mais similares.
*/

CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(768),
  base_ids uuid[],
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  knowledge_source_id uuid,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    kc.id,
    kc.knowledge_source_id,
    kc.content,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE kc.knowledge_base_id = ANY(base_ids)
    AND kc.embedding IS NOT NULL
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
$$;
