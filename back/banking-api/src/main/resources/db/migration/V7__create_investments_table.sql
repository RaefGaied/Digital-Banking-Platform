DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'investment_type') THEN
        CREATE TYPE investment_type AS ENUM ('CDB', 'LCI', 'LCA', 'TESOURO_DIRETO', 'ACOES');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'investment_status') THEN
        CREATE TYPE investment_status AS ENUM ('ACTIVE', 'REDEEMED');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    investment_type investment_type NOT NULL,
    amount NUMERIC(19,2) NOT NULL,
    annual_rate NUMERIC(5,2) NOT NULL,
    current_value NUMERIC(19,2) NOT NULL,
    status investment_status NOT NULL DEFAULT 'ACTIVE',
    invested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    redeemed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);