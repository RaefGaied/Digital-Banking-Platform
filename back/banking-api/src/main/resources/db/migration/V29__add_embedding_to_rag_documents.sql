-- V29__add_embedding_to_rag_documents.sql
-- Adds the pgvector column used by RagKnowledgeService to store locally generated
-- Ollama (nomic-embed-text, 768 dimensions) embeddings for each RAG document, as
-- required by the cahier des charges (section 8.3 / Listing 4).

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS embedding vector(768);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_rag_documents_embedding'
    ) THEN
        EXECUTE 'CREATE INDEX idx_rag_documents_embedding ON rag_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)';
    END IF;
END$$;
