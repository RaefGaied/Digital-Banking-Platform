ALTER TABLE payment_keys ALTER COLUMN key_type TYPE VARCHAR(20) USING key_type::text;
UPDATE payment_keys SET key_type = 'TAX_ID' WHERE key_type = 'CPF';
