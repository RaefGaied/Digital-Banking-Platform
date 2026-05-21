CREATE TABLE
IF NOT EXISTS audit_logs
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
    user_email VARCHAR
(150),
    action VARCHAR
(100) NOT NULL,
    entity VARCHAR
(50),
    entity_id VARCHAR
(100),
    details TEXT,
    ip_address VARCHAR
(50),
    status VARCHAR
(20) NOT NULL DEFAULT 'SUCCESS',
    created_at TIMESTAMP NOT NULL DEFAULT NOW
()
);

CREATE INDEX
IF NOT EXISTS idx_audit_logs_user_email ON audit_logs
(user_email);
CREATE INDEX
IF NOT EXISTS idx_audit_logs_action ON audit_logs
(action);
CREATE INDEX
IF NOT EXISTS idx_audit_logs_created_at ON audit_logs
(created_at);