/*
# Add wiki fields to games

1. Modified Tables
- `games`: adds nullable columns so every game can become a full wiki entry:
  - `platforms_released` (text array): systems the game can be played on.
  - `game_modes` (text array): e.g. Single-player, Co-op, PvP.
  - `esrb_rating` (text): age/content rating such as "M (Mature 17+)".
  - `engine` (text): game engine used.
  - `series` (text): franchise/series the game belongs to.
  - `metacritic_score` (integer, 0-100): Metacritic critic score.
  - `steam_reviews_label` (text): Steam review summary, e.g. "Overwhelmingly Positive".
  - `player_count` (text): estimated lifetime player base description.
  - `main_story_hours` (numeric): typical hours to finish the main story.
  - `completionist_hours` (numeric): hours for full completion.
  - `awards` (text array): notable industry awards.
  - `trivia` (text array): interesting facts for the wiki trivia section.
2. Security
- No changes: columns live on the existing publicly readable `games` table.
3. Notes
- All new columns are nullable so existing rows remain valid.
- Data will be filled by a follow-up UPDATE migration.
*/

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS platforms_released text[],
  ADD COLUMN IF NOT EXISTS game_modes text[],
  ADD COLUMN IF NOT EXISTS esrb_rating text,
  ADD COLUMN IF NOT EXISTS engine text,
  ADD COLUMN IF NOT EXISTS series text,
  ADD COLUMN IF NOT EXISTS metacritic_score integer,
  ADD COLUMN IF NOT EXISTS steam_reviews_label text,
  ADD COLUMN IF NOT EXISTS player_count text,
  ADD COLUMN IF NOT EXISTS main_story_hours numeric,
  ADD COLUMN IF NOT EXISTS completionist_hours numeric,
  ADD COLUMN IF NOT EXISTS awards text[],
  ADD COLUMN IF NOT EXISTS trivia text[];

GRANT SELECT ON games TO anon, authenticated;
