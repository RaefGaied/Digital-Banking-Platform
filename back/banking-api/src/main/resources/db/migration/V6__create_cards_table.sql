DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_type') THEN
        CREATE TYPE card_type AS ENUM ('CREDIT', 'DEBIT');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_brand') THEN
        CREATE TYPE card_brand AS ENUM ('VISA', 'MASTERCARD', 'ELO', 'AMEX');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    card_type card_type NOT NULL,
    brand card_brand NOT NULL,
    holder_name VARCHAR(100) NOT NULL,
    last_four VARCHAR(4) NOT NULL,
    expiry_month INTEGER NOT NULL,
    expiry_year INTEGER NOT NULL,
    credit_limit NUMERIC(19,2),
    available_limit NUMERIC(19,2),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);