-- V20__add_support_tickets_extra_fields.sql
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS flowable_process_id VARCHAR(255);

-- Add the missing sender_type value to support messages table
UPDATE messages SET sender_type = 'SYSTEM' WHERE sender_type = 'ADMIN';