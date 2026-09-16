CREATE TYPE payment_key_type AS ENUM
('TAX_ID', 'EMAIL', 'PHONE', 'RANDOM');

CREATE TABLE payment_keys
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    key_type payment_key_type NOT NULL,
    key_value VARCHAR(255) NOT NULL UNIQUE,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_method VARCHAR(100),
    verified_at TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_keys_key_value ON payment_keys(key_value);
CREATE INDEX idx_payment_keys_user_id ON payment_keys(user_id);
