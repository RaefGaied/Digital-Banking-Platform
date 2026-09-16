-- V26__add_support_ticket_attachment_columns.sql
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS attachment_data BYTEA;
