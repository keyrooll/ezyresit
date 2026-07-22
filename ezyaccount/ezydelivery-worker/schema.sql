-- EzyDelivery — D1 schema (Phase 1)
-- One table. Runner is a free-typed name (rotating runners, no runner records).
-- Rating/follow-up columns (Phase 4) are added later, not now.

CREATE TABLE IF NOT EXISTS orders (
  order_id       TEXT PRIMARY KEY,   -- OnPay sale id / invoice_number
  created_at     TEXT,               -- OnPay payment_at (or received time)
  customer_name  TEXT,
  phone          TEXT,               -- normalised to 60xxxxxxxxx for wa.me
  address        TEXT,               -- combined OnPay address lines + city + state
  products       TEXT,               -- JSON: [{"name":..,"qty":..}]
  total_amount   REAL,
  runner         TEXT,               -- typed name; empty until assigned
  tracking       TEXT,
  est_time       TEXT,
  remark         TEXT,
  status         TEXT DEFAULT 'PENDING',  -- PENDING/ASSIGNED/ON_DELIVERY/DELIVERED/CANCELED
  wa1_sent_at    TEXT,               -- set when staff taps "Hantar WA #1" link
  wa2_sent_at    TEXT,               -- set when staff taps "Hantar WA #2" link
  updated_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
