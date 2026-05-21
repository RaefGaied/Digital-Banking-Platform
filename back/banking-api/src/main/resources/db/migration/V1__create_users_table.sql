CREATE TABLE
IF NOT EXISTS users
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
    name VARCHAR
(100) NOT NULL,
    email VARCHAR
(150) NOT NULL UNIQUE,
    cpf VARCHAR
(11) NOT NULL UNIQUE,
    password VARCHAR
(255) NOT NULL,
    role VARCHAR
(20) NOT NULL DEFAULT 'USER',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW
(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW
()
);

CREATE TABLE
IF NOT EXISTS accounts
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
    user_id UUID NOT NULL REFERENCES users
(id),
    agency VARCHAR
(10) NOT NULL,
    number VARCHAR
(20) NOT NULL UNIQUE,
    balance NUMERIC
(19, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR
(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW
(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW
()
);

CREATE TABLE
IF NOT EXISTS transactions
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
    source_account_id UUID REFERENCES accounts
(id),
    target_account_id UUID REFERENCES accounts
(id),
    amount NUMERIC
(19, 2) NOT NULL,
    type VARCHAR
(30) NOT NULL,
    status VARCHAR
(20) NOT NULL DEFAULT 'PENDING',
    description VARCHAR
(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW
()
);

CREATE INDEX
IF NOT EXISTS idx_accounts_user_id ON accounts
(user_id);
CREATE INDEX
IF NOT EXISTS idx_transactions_source ON transactions
(source_account_id);
CREATE INDEX
IF NOT EXISTS idx_transactions_target ON transactions
(target_account_id);
CREATE INDEX
IF NOT EXISTS idx_transactions_created ON transactions
(created_at);