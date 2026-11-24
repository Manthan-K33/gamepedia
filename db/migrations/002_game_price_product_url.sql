-- Direct product page for each store row, so "Visit" opens the game itself
-- instead of a search results page.
ALTER TABLE game_prices ADD COLUMN product_url TEXT;
