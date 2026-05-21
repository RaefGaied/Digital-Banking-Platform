-- V10__create_messages_table.sql
-- Support Ticket Messages/Chat System

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  support_ticket_id BIGINT NOT NULL,
  sender_id UUID NOT NULL,
  sender_type VARCHAR(50) NOT NULL, -- USER, ADMIN, BOT, SYSTEM
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- If true, only admins see this message
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY (support_ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_support_ticket_id ON messages(support_ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);