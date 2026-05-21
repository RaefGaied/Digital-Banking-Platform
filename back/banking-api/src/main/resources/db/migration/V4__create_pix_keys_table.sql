DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pix_key_type') THEN
        CREATE TYPE pix_key_type AS ENUM ('CPF', 'EMAIL', 'PHONE', 'RANDOM');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS pix_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    key_type pix_key_type NOT NULL,
    key_value VARCHAR(255) NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pix_keys_key_value ON pix_keys(key_value);
CREATE INDEX IF NOT EXISTS idx_pix_keys_user_id ON pix_keys(user_id);