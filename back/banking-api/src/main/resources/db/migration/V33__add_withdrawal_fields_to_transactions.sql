ALTER TABLE transactions
    ADD COLUMN withdrawal_code_hash VARCHAR(100),
    ADD COLUMN withdrawal_code_expires_at TIMESTAMP,
    ADD COLUMN withdrawal_redeemed_at TIMESTAMP,
    ADD COLUMN withdrawal_failed_attempts INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_transactions_withdrawal_expiration
    ON transactions (type, status, withdrawal_code_expires_at);
