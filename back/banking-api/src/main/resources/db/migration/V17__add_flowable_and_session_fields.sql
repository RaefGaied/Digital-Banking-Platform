-- V17__add_flowable_and_session_fields.sql
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS flowable_process_id VARCHAR(255);
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS flowable_process_id VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS session_id UUID;

CREATE INDEX IF NOT EXISTS idx_transactions_flowable_process_id ON transactions(flowable_process_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_flowable_process_id ON support_tickets(flowable_process_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);