DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'investments'
          AND column_name = 'investment_type'
          AND udt_name = 'investment_type'
    ) THEN
        ALTER TABLE investments
            ALTER COLUMN investment_type TYPE VARCHAR(50)
            USING investment_type::TEXT;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'investments'
          AND column_name = 'status'
          AND udt_name = 'investment_status'
    ) THEN
        ALTER TABLE investments
            ALTER COLUMN status TYPE VARCHAR(20)
            USING status::TEXT;
    END IF;

    DROP TYPE IF EXISTS investment_type;
    DROP TYPE IF EXISTS investment_status;
END $$;
