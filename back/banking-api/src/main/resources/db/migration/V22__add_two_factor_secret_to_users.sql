-- Flyway migration: add two_factor_secret column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);