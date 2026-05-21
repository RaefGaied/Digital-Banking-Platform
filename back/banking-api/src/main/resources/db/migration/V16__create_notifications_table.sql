-- V16__create_notifications_table.sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL, -- TICKET_CREATED, TICKET_UPDATED, TICKET_RESOLVED, etc.
  channel VARCHAR(50) NOT NULL, -- IN_APP, EMAIL
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  reference_id BIGINT,
  reference_type VARCHAR(100),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);