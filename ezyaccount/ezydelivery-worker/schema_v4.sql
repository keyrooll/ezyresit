-- EzyDelivery — schema migration v4 (branch = OnPay form)
ALTER TABLE orders ADD COLUMN form_id TEXT;   -- OnPay sale.form_id (identifies the branch form)

CREATE TABLE IF NOT EXISTS forms (
  form_id     TEXT PRIMARY KEY,   -- OnPay form id
  name        TEXT,               -- branch name (admin-renamable; defaults to "Borang <id>")
  active      INTEGER DEFAULT 1,
  created_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_form ON orders(form_id);
