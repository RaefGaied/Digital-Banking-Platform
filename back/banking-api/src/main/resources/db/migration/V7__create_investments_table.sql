CREATE TABLE IF NOT EXISTS investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    investment_type VARCHAR(50) NOT NULL,
    amount NUMERIC(19,2) NOT NULL,
    annual_rate NUMERIC(5,2) NOT NULL,
    current_value NUMERIC(19,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    invested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    redeemed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);