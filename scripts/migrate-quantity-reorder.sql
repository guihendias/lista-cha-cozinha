-- Add new columns to gifts
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- Create gift_reservations table
CREATE TABLE IF NOT EXISTS gift_reservations (
  id SERIAL PRIMARY KEY,
  gift_id INTEGER NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  reserved_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gift_reservations_gift_id_idx ON gift_reservations(gift_id);

-- Backfill reservations from old columns
INSERT INTO gift_reservations (gift_id, name, reserved_at)
SELECT id, reserved_by, COALESCE(reserved_at, NOW())
FROM gifts
WHERE reserved_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM gift_reservations r WHERE r.gift_id = gifts.id
  );

-- Backfill display_order with current id (chronological order)
UPDATE gifts SET display_order = id WHERE display_order = 0;
