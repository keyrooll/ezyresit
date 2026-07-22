-- EzyDelivery — schema migration v3
-- Delivery session from the OnPay Sheet ("Tambahan #2"): sesi1 | sesi2 | pickup | null
ALTER TABLE orders ADD COLUMN delivery_session TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(delivery_session);
