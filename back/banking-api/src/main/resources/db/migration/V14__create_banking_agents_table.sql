-- V14__create_banking_agents_table.sql
CREATE TABLE IF NOT EXISTS banking_agents (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  context JSONB,
  last_transaction_id UUID,
  decision VARCHAR(50), -- AUTO_EXECUTE, TRIGGER_BPMN, REQUEST_INFO, BLOCK
  default_policy VARCHAR(50), -- AUTO_EXECUTE, TRIGGER_BPMN, REQUEST_INFO, BLOCK
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_banking_agents_session_id ON banking_agents(session_id);
CREATE INDEX IF NOT EXISTS idx_banking_agents_user_id ON banking_agents(user_id);
