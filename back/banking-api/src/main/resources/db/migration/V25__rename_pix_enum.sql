ALTER TYPE pix_key_type RENAME TO pix_key_type_old;
CREATE TYPE pix_key_type AS ENUM
('TAX_ID', 'EMAIL', 'PHONE', 'RANDOM');
ALTER TABLE pix_keys ALTER COLUMN key_type TYPE
text USING key_type::text;
UPDATE pix_keys SET key_type = 'TAX_ID' WHERE key_type = 'CPF';
ALTER TABLE pix_keys ALTER COLUMN key_type TYPE
pix_key_type USING key_type::text::pix_key_type;
DROP TYPE pix_key_type_old;
