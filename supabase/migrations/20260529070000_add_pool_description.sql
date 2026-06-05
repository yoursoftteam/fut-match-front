-- Add description column to bet_pools
-- Date: 2026-05-29
-- Description: Adds optional description field to bet_pools (max 1000 chars)

ALTER TABLE bet_pools ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN bet_pools.description IS 'Optional pool description, max 1000 characters';
