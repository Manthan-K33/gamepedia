/*
# Fill wiki data for games (batch 1 of 3)

1. Modified Tables
- `games`: fills the new wiki columns (platforms released, game modes, ESRB rating,
  engine, series, Metacritic score, Steam reviews label, player count, story
  length, completionist length, awards, trivia) for the first 16 games.
2. Security
- No changes.
3. Notes
- UPDATE keyed on slug so it is safe to re-run.
*/

UPDATE games g SET
  platforms_released = p.plats,
  game_modes = p.modes,
  esrb_rating = p.esrb,
  engine = p.eng,
  series = p.ser,
  metacritic_score = p.mc,
  steam_reviews_label = p.srl,
  player_count = p.pc,
  main_story_hours = p.msh,
  completionist_hours = p.ch,
  awards = p.aw,
  trivia = p.tr
FROM (VALUES
  ('elden-ring',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S'],
   ARRAY['Single-player','Online PvP','Online Co-op','Async Multiplayer'],
   'M (Mature 17+)', 'In-house (FromSoftware)', 'Souls', 96, 'Overwhelmingly Positive',
   '25+ million copies sold; one of the best-selling games of all time', 60, 132,
   ARRAY['Game of the Year 2022 (The Game Awards)','Best Art Direction 2022','Best RPG 2022 (Golden Joystick)'],
   ARRAY['Sold 12 million copies in under a month, faster than any FromSoftware game','Hidetaka Miyazaki collaborated with George R. R. Martin on the world''s lore','Its horse, Torrent, cannot die — only be resummoned','Speedrunners have beaten the game in under 3 minutes'])
  ,('red-dead-redemption-2',
   ARRAY['PC','PlayStation 4','Xbox One'],
   ARRAY['Single-player','Online PvP (Red Dead Online)'],
   'M (Mature 17+)', 'RAGE', 'Red Dead', 97, 'Very Positive',
   '65+ million copies sold; one of the best-selling games of all time', 50, 178,
   ARRAY['Best Narrative 2018 (The Game Awards)','Best Score/Music 2018','BAFTA Best Game 2019'],
   ARRAY['Every NPC has a daily routine, including going to work and eating dinner','Animal testicles shrink in cold weather — a detail widely reported by players','Its homage to the original Red Dead Redemption is woven into the story','RDR2''s horse bonding system tracks care, grooming, and rider trust'])
  ,('the-witcher-3-wild-hunt',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch'],
   ARRAY['Single-player'],
   'M (Mature 17+)', 'REDengine 3', 'The Witcher', 93, 'Overwhelmingly Positive',
   '50+ million copies sold; among the best-selling RPGs ever', 105, 189,
   ARRAY['Game of the Year 2015 (The Game Awards)','Golden Joystick Ultimate Game of the Year 2015'],
   ARRAY['CD Projekt Red promised no DRM and delivered','The Bloody Baron questline is taught in writing courses as an example of branching narrative','Gwent, an in-game card game, became its own standalone game','The game''s "Evil Incarnate" ending was voted on by fans in Poland'])
  ,('grand-theft-auto-v',
   ARRAY['PC','PlayStation 3/4/5','Xbox 360/One/Series X|S'],
   ARRAY['Single-player','Online PvP (GTA Online)'],
   'M (Mature 17+)', 'RAGE', 'Grand Theft Auto', 97, 'Very Positive',
   '200+ million copies sold; the second best-selling video game of all time', 31, 97,
   ARRAY['Game of the Year 2013 (multiple outlets, including The Game Awards)'],
   ARRAY['Three protagonists was a first for the series and a technical feat','Its music score blends hip-hop, rock, and electronic for every radio station','GTA Online''s Heists update was delayed so long it became a running joke','The game world, Los Santos, is bigger than the combined maps of GTA IV, San Andreas, and Red Dead Redemption'])
  ,('baldur-s-gate-3',
   ARRAY['PC','PlayStation 5','Xbox Series X|S','macOS'],
   ARRAY['Single-player','Online Co-op','Local Co-op (Split-screen)'],
   'M (Mature 17+)', 'Divinity 4.0', 'Baldur''s Gate', 96, 'Overwhelmingly Positive',
   '15+ million copies sold; a record-breaking turn-based RPG', 75, 159,
   ARRAY['Game of the Year 2023 (The Game Awards)','Best RPG 2023','Best Community Support 2023','BAFTA Best Game 2024'],
   ARRAY['Over 170 hours of cinematic cutscenes — more than any game ever made','It was in early access for nearly 3 years, shaped by millions of player decisions','Larian''s CEO Sven Vincke bought the D&D license personally after Wizards of the Coast passed','The Dark Urge origin can be played as an evil campaign with unique scenes'])
  ,('cyberpunk-2077',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S'],
   ARRAY['Single-player'],
   'M (Mature 17+)', 'REDengine 4', 'Cyberpunk', 86, 'Very Positive',
   '30+ million copies sold; a comeback story after a rocky launch', 103, 170,
   ARRAY['Best RPG 2020 (multiple outlets)','Golden Joystick Most Wanted 2020 (pre-release)'],
   ARRAY['Keanu Reeves'' character Johnny Silverhand was written specifically for him','Its controversial 2020 launch led to class-action lawsuits and a PlayStation Store removal','The Phantom Liberty expansion, released in 2023, was widely praised as a redemption arc','Its Night City map was built with real city-planning software'])
  ,('god-of-war-ragnarok',
   ARRAY['PC','PlayStation 4/5'],
   ARRAY['Single-player'],
   'M (Mature 17+)', 'In-house (Santa Monica Studio)', 'God of War', 94, 'Overwhelmingly Positive',
   '15+ million copies sold; a flagship PlayStation exclusive', 26, 52,
   ARRAY['Best Narrative 2022 (The Game Awards)','Best Score and Music 2022','BAFTA Audio Achievement 2023'],
   ARRAY['Its one-shot camera means the game never cuts during gameplay','Kratos was recast with Christopher Judge, best known as Teal''c in Stargate SG-1','The 2018 prequel won Game of the Year 2018; Ragnarok was its direct sequel','Squirrel Ratatoskr was voiced by Robot Chicken''s Seth Green'])
  ,('sekiro-shadows-die-twice',
   ARRAY['PC','PlayStation 4','Xbox One'],
   ARRAY['Single-player'],
   'M (Mature 17+)', 'In-house (FromSoftware)', 'Souls', 90, 'Overwhelmingly Positive',
   '10+ million copies sold', 35, 70,
   ARRAY['Game of the Year 2019 (The Game Awards)','Best Action/Adventure 2019'],
   ARRAY['It trades Souls games'' RPG builds for pure swordsmanship skill','The resurrection mechanic — literally dying twice — gave the game its title','Shinobi prosthetic tools allow creative playstyles akin to a puzzle box','Its score by Yuka Kitamura and Hiroki Kikuta is considered a modern classic'])
  ,('the-legend-of-zelda-tears-of-the-kingdom',
   ARRAY['Nintendo Switch'],
   ARRAY['Single-player'],
   'E10+ (Everyone 10+)', 'In-house (Nintendo EPD)', 'The Legend of Zelda', 96, 'Positive (not on Steam)',
   '20+ million copies sold; fastest-selling Zelda game ever', 59, 250,
   ARRAY['Best Action/Adventure 2023 (The Game Awards)','Players'' Voice 2023'],
   ARRAY['Its fuse and ultrahand abilities let players build vehicles, machines, and more','The map is roughly triple the size of Breath of the Wild when counting the sky and depths','Nintendo released an official, free trading card of its Master Sword','Players found a way to defeat the final boss in under 2 minutes using creative ability stacking'])
  ,('animal-crossing-new-horizons',
   ARRAY['Nintendo Switch'],
   ARRAY['Single-player','Local Co-op','Online Co-op'],
   'E (Everyone)', 'In-house (Nintendo EPD)', 'Animal Crossing', 90, 'Positive (not on Steam)',
   '45+ million copies sold; best-selling Nintendo Switch exclusive', 60, 350,
   ARRAY['Best Family Game 2020 (The Game Awards)','BAFTA Game of the Year 2021'],
   ARRAY['It became a cultural phenomenon during 2020''s pandemic lockdowns','Players recreated famous museums, fashion shows, and even weddings on their islands','Turnip trading ("the Stalk Market") became a real economic mini-game for fans','A fan-made Animal Crossing run set a world record for most Bells earned'])
  ,('doom-eternal',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch'],
   ARRAY['Single-player','Online PvP (Battlemode)'],
   'M (Mature 17+)', 'id Tech 7', 'Doom', 88, 'Very Positive',
   '10+ million copies sold', 14, 27,
   ARRAY['Best Action Game 2020 (multiple outlets)','Game of the Year 2020 nominee'],
   ARRAY['Its "Demon Slayer" combat loop was designed to feel like a first-person action figure set','Mick Gordon, the composer, built the soundtrack with analog synthesizers and guitar feedback','The Series X/S versions run at 120 fps in performance mode','It runs on Nintendo Switch thanks to a port by Panic Button'])
  ,('minecraft',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch','Mobile (iOS/Android)'],
   ARRAY['Single-player','Online Co-op','Local Co-op','Online PvP'],
   'E10+ (Everyone 10+)', 'In-house (Java / Bedrock Engine)', 'Minecraft', 93, 'Very Positive',
   '300+ million copies sold; the best-selling video game of all time', 0, 3500,
   ARRAY['Named the best-selling game ever by Guinness World Records'],
   ARRAY['Creepers were created by accident when a coding error made a pig too tall and too long','Its soundtrack by C418 is widely considered one of gaming''s most iconic','There are over 140 million monthly active players worldwide','Players have built working computers, hard drives, and even 1-bit CPUs inside the game'])
  ,('overwatch-2',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch'],
   ARRAY['Online PvP','Co-op (PvE missions)'],
   'T (Teen)', 'In-house (Blizzard engine)', 'Overwatch', 80, 'Mixed (Steam) / Positive (Battle.net)',
   '35+ million players in its first year; one of the largest shooter communities', 0, 0,
   ARRAY['Best Multiplayer Game 2022 (The Game Awards, for launch momentum)'],
   ARRAY['It replaced the original Overwatch''s 6v6 format with 5v5 squads','Every hero has a unique ultimate that can change the course of a team fight','It became free-to-play in October 2022 with a seasonal battle pass model','Kiriko''s "Kitsune Rush" ultimate was inspired by Japanese folklore'])
  ,('terraria',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch','Mobile (iOS/Android)'],
   ARRAY['Single-player','Online Co-op','Local Co-op','Online PvP'],
   'T (Teen)', 'In-house (XNA/FNA)', 'Terraria', 83, 'Overwhelmingly Positive',
   '44+ million copies sold; one of the best-selling indie games ever', 0, 0,
   ARRAY['Best Indie Game 2011 (IndieDB)','Golden Joystick indie nominee'],
   ARRAY['It has received over a decade of free content updates — a record for an indie game','The final "Journey''s End" update added over 1,000 new items','The Moon Lord is a reference to the Lovecraftian Cthulhu mythos','It started as a Minecraft-meets-Metroid hybrid proposed on a forum'])
  ,('fortnite',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch','Mobile (via cloud)'],
   ARRAY['Online PvP','Online Co-op','Squad-based (Trios, Duos, Squads)'],
   'T (Teen)', 'Unreal Engine 5', 'Fortnite', 78, 'Positive (not on Steam)',
   '500+ million registered players; one of the most-played games in history', 0, 0,
   ARRAY['Best Multiplayer Game 2018 (The Game Awards)','Best Ongoing Game 2019'],
   ARRAY['Travis Scott''s 2020 in-game concert drew over 12 million live viewers','Its battle royale mode was built in two months by a small internal team','It popularized the "battle pass" model now used across the industry','Players have recreated entire cities, movie sets, and working arcade machines in Creative mode'])
) AS p(slug, plats, modes, esrb, eng, ser, mc, srl, pc, msh, ch, aw, tr)
WHERE g.slug = p.slug;
