-- Live runner GPS (latest position per runner) + customer rating
CREATE TABLE IF NOT EXISTS runner_locations (
  runner_id  TEXT PRIMARY KEY,
  lat        REAL,
  lng        REAL,
  updated_at TEXT
);
ALTER TABLE orders ADD COLUMN rating INTEGER;
ALTER TABLE orders ADD COLUMN rating_comment TEXT;
ALTER TABLE orders ADD COLUMN rated_at TEXT;
