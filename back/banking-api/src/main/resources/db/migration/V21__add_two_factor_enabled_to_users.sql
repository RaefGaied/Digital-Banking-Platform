-- Flyway migration: add two_factor_enabled to users
-- Ensures JPA `twoFactorEnabled` field exists for schema validation
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
