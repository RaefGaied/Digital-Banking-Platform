-- V30__add_language_and_rag_metadata_to_messages.sql
-- Adds the bilingual/RAG traceability columns required by the cahier des charges
-- (section 8.3, Listing 4): detected_lang, rag_used, rag_source.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS detected_lang VARCHAR(5) DEFAULT 'FR';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS rag_used BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS rag_source VARCHAR(255);
