-- Adds a per-store "last synced" timestamp to game_prices.
-- Apply with: wrangler d1 execute game-pedia --remote --file=db/migrations/001_game_price_updated_at.sql
-- Safe to run once; SQLite has no "ADD COLUMN IF NOT EXISTS".

ALTER TABLE game_prices ADD COLUMN updated_at TEXT;
