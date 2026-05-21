-- V15__create_security_events_table.sql
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL, -- REUSE_DETECTED, BRUTE_FORCE, ACCOUNT_LOCKED, SUSPICIOUS_ACTIVITY
  ip_address VARCHAR(50),
  device_id VARCHAR(255),
  resolved BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(type);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);