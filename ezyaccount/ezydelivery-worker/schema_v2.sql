-- EzyDelivery — schema migration v2 (Phase 2/3: roles, runners, claims)
-- Additive. Run ONCE on the existing DB. Does not touch existing orders rows.

-- Freelance runner records (outsource/Lalamove runners have NO record).
CREATE TABLE IF NOT EXISTS runners (
  id          TEXT PRIMARY KEY,   -- e.g. 'r_' + timestamp/random
  name        TEXT,
  phone       TEXT,
  email       TEXT,               -- Google login email (nullable until granted access)
  active      INTEGER DEFAULT 1,
  created_at  TEXT
);

-- Who may log in + their role. Authoritative access list (replaces STAFF_EMAILS env).
CREATE TABLE IF NOT EXISTS users (
  email       TEXT PRIMARY KEY,
  role        TEXT,               -- 'admin' | 'staff' | 'account' | 'runner'
  runner_id   TEXT,               -- links runners.id when role='runner'
  active      INTEGER DEFAULT 1,
  created_at  TEXT
);

-- New order columns (assign fork + freelance claim).
ALTER TABLE orders ADD COLUMN delivery_type TEXT;   -- 'lalamove' | 'freelance'
ALTER TABLE orders ADD COLUMN runner_id     TEXT;   -- links runners.id (freelance)
ALTER TABLE orders ADD COLUMN claim_amount  REAL;   -- RM owed to freelance runner
ALTER TABLE orders ADD COLUMN claim_status  TEXT;   -- 'pending' | 'paid'
ALTER TABLE orders ADD COLUMN claim_paid_at TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_runner ON orders(runner_id);
CREATE INDEX IF NOT EXISTS idx_orders_claim  ON orders(claim_status);

-- Seed the super admin so login is never locked out.
INSERT OR IGNORE INTO users (email, role, active, created_at)
VALUES ('keyrooll@gmail.com', 'admin', 1, datetime('now'));
