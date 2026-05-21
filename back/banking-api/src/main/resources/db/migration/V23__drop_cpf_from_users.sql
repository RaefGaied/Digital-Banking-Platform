-- Drop cpf column from users table (migrating away from CPF at registration)
ALTER TABLE users DROP COLUMN IF EXISTS cpf;
