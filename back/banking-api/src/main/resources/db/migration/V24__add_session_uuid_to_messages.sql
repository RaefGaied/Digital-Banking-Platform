-- V24__add_session_uuid_to_messages.sql
-- Align messages with UUID session identifiers returned by SessionController.

ALTER TABLE messages ADD COLUMN
IF NOT EXISTS session_uuid UUID;
CREATE INDEX
IF NOT EXISTS idx_messages_session_uuid ON messages
(session_uuid);