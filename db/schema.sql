-- GamePedia schema for Cloudflare D1 (SQLite).
-- Apply with: wrangler d1 execute game-pedia --remote --file=db/schema.sql

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS platforms (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  slug  TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS games (
  id                 TEXT PRIMARY KEY,
  slug               TEXT NOT NULL UNIQUE,
  title              TEXT NOT NULL,
  short_description  TEXT,
  about              TEXT,
  developer          TEXT,
  publisher          TEXT,
  release_date       TEXT,
  genres             TEXT NOT NULL DEFAULT '[]',   -- JSON array
  tags               TEXT NOT NULL DEFAULT '[]',   -- JSON array
  features           TEXT NOT NULL DEFAULT '[]',   -- JSON array
  hero_image         TEXT,
  box_image          TEXT,
  rating             REAL,
  price_display      TEXT,
  featured           INTEGER NOT NULL DEFAULT 0,
  platforms_released TEXT,                          -- JSON array
  game_modes         TEXT,                          -- JSON array
  esrb_rating        TEXT,
  engine             TEXT,
  series             TEXT,
  metacritic_score   INTEGER,
  steam_reviews_label TEXT,
  player_count       TEXT,
  main_story_hours   REAL,
  completionist_hours REAL,
  awards             TEXT,                          -- JSON array
  trivia             TEXT                           -- JSON array
);

CREATE INDEX IF NOT EXISTS idx_games_title  ON games (title);
CREATE INDEX IF NOT EXISTS idx_games_series ON games (series);
CREATE INDEX IF NOT EXISTS idx_games_featured ON games (featured);

CREATE TABLE IF NOT EXISTS game_prices (
  id            TEXT PRIMARY KEY,
  game_id       TEXT NOT NULL REFERENCES games (id) ON DELETE CASCADE,
  platform_id   INTEGER NOT NULL REFERENCES platforms (id),
  price         REAL,
  regular_price REAL,
  currency      TEXT NOT NULL DEFAULT 'USD',
  store_url     TEXT,
  product_url   TEXT,                              -- direct game page on the store
  on_sale       INTEGER NOT NULL DEFAULT 0,
  updated_at    TEXT                               -- last successful store sync
);

CREATE INDEX IF NOT EXISTS idx_prices_game     ON game_prices (game_id);
CREATE INDEX IF NOT EXISTS idx_prices_platform ON game_prices (platform_id);

CREATE TABLE IF NOT EXISTS catalog_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
