ALTER TYPE payment_key_type RENAME TO payment_key_type_old;
CREATE TYPE payment_key_type AS ENUM
('TAX_ID', 'EMAIL', 'PHONE', 'RANDOM');
ALTER TABLE payment_keys ALTER COLUMN key_type TYPE
text USING key_type::text;
UPDATE payment_keys SET key_type = 'TAX_ID' WHERE key_type = 'CPF';
ALTER TABLE payment_keys ALTER COLUMN key_type TYPE
payment_key_type USING key_type::text::payment_key_type;
DROP TYPE payment_key_type_old;
