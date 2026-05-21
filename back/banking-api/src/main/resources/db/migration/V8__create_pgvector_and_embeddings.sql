-- Create pgvector extension and embeddings table for RAG
CREATE EXTENSION IF NOT EXISTS vector;

-- Table to store embeddings for RAG (adjust vector dimension if needed)
CREATE TABLE IF NOT EXISTS embeddings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  object_type TEXT,
  object_id BIGINT,
  embedding VECTOR(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast vector similarity search (ivfflat index requires pgvector setup)
-- Use ivfflat for faster searches; adjust lists parameter as needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'embeddings_embedding_idx'
  ) THEN
    EXECUTE 'CREATE INDEX embeddings_embedding_idx ON embeddings USING ivfflat (embedding vector_l2_ops) WITH (lists = 100)';
  END IF;
END$$;
