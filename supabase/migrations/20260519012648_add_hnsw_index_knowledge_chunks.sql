/*
  # Add HNSW vector index for semantic search on knowledge_chunks

  1. Changes
    - Adds an HNSW index on the `embedding` column of `knowledge_chunks` using cosine distance operator
    - This dramatically improves vector similarity search performance for the RAG pipeline
    - HNSW (Hierarchical Navigable Small World) provides fast approximate nearest neighbor search
      with good recall and no need for periodic rebuilds

  2. Important Notes
    - The index uses `vector_cosine_ops` to match the cosine similarity used in `match_knowledge_chunks()`
    - HNSW parameters: m=16 (connections per layer), ef_construction=64 (build-time search width)
    - These are balanced defaults suitable for datasets up to ~100K vectors
*/

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_hnsw
  ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
