-- V19__fix_messages_table_structure.sql
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_support_ticket_id_fkey;
ALTER TABLE messages DROP COLUMN IF EXISTS support_ticket_id;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS session_id BIGINT NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS intent VARCHAR(100);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS parameters JSONB;

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
