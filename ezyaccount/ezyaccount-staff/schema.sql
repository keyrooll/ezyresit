-- EzyAccount staff backend (D1 "ezyaccount")
-- Apply:  wrangler d1 execute ezyaccount --remote --file=./schema.sql

-- Staff email/password accounts. Identity = email (same key the Google side uses).
CREATE TABLE IF NOT EXISTS staff_auth (
  email       TEXT PRIMARY KEY,
  pass_hash   TEXT NOT NULL,            -- pbkdf2$iters$salt$hash (never plaintext)
  name        TEXT,
  company     TEXT NOT NULL,            -- COMPANY_CONFIG.id, e.g. ezybakery
  branch      TEXT,
  role        TEXT DEFAULT 'staff',
  status      TEXT DEFAULT 'pending',   -- pending | approved | rejected
  created_at  TEXT,
  approved_at TEXT,
  approved_by TEXT,
  roles       TEXT,                     -- JSON {companyId: role} — multi-company assignment
  branches    TEXT                      -- JSON {companyId:[branch,...]} — admin-locked branches; empty = all allowed
);
CREATE INDEX IF NOT EXISTS idx_staff_company ON staff_auth(company, status);
-- Existing DBs (table already created): add the newer columns once, ignore "duplicate column" if already run:
--   wrangler d1 execute ezyaccount --remote --command "ALTER TABLE staff_auth ADD COLUMN roles TEXT"
--   wrangler d1 execute ezyaccount --remote --command "ALTER TABLE staff_auth ADD COLUMN branches TEXT"

-- Draft receipt uploads from staff (image in R2, metadata here). An accountant's app pulls these
-- and writes them into the Sheet/Drive with their own Google token, then marks them flushed.
CREATE TABLE IF NOT EXISTS pending_uploads (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL,           -- uploader (staff_auth.email)
  company      TEXT NOT NULL,
  branch       TEXT,
  r2_key       TEXT NOT NULL,           -- object key in the RECEIPTS bucket
  content_type TEXT,
  amount       REAL,
  note         TEXT,
  status       TEXT DEFAULT 'pending',  -- pending | flushed
  created_at   TEXT,
  flushed_at   TEXT,
  flushed_by   TEXT
);
CREATE INDEX IF NOT EXISTS idx_pending_company ON pending_uploads(company, status);
CREATE INDEX IF NOT EXISTS idx_pending_email   ON pending_uploads(email);

-- Key/value config: holds the owner's Google refresh token (worker acts as the owner for
-- Sheet/Drive) and the owner email. Sensitive — private to the worker/account.
CREATE TABLE IF NOT EXISTS app_config (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT
);
