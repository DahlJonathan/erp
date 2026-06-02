CREATE TABLE IF NOT EXISTS purchases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    supplier_name text NOT NULL,
    title text NOT NULL,
    description text NOT NULL DEFAULT '',
    requested_by text NOT NULL DEFAULT '',
    order_number text,
    amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'received', 'paid')),
    expected_date date,
    received_date date,
    invoice_reference text,
    invoice_attachment_name text,
    invoice_attachment_data_url text,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE purchases
    ADD COLUMN IF NOT EXISTS invoice_attachment_name text,
    ADD COLUMN IF NOT EXISTS invoice_attachment_data_url text;

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
    ON purchases FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases"
    ON purchases FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own purchases"
    ON purchases FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own purchases"
    ON purchases FOR DELETE
    USING (auth.uid() = user_id);
