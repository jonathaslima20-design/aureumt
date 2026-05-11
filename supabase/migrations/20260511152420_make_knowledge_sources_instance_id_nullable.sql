/*
  # Make instance_id nullable in knowledge_sources

  The knowledge_sources table previously required instance_id (NOT NULL),
  but sources are now linked via knowledge_base_id. Making instance_id
  nullable allows inserts that only specify knowledge_base_id.
*/

ALTER TABLE knowledge_sources ALTER COLUMN instance_id DROP NOT NULL;
