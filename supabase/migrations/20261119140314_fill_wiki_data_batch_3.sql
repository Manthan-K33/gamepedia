/*
# Fill wiki data for games (batch 3 of 3)

1. Modified Tables
- `games`: fills the wiki columns for the remaining 16 games
  (wave-one leftovers + wave-three catalog).
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
  ('pubg-battlegrounds',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Mobile (iOS/Android)'],
   ARRAY['Online PvP','Squad-based (Squads, Duos)'],
   'T (Teen)', 'Unreal Engine 4', 'PUBG', 83, 'Mostly Positive',
   '75+ million copies sold; 350+ million mobile players', 0, 0,
   ARRAY['Best Multiplayer Game 2017 nominee (The Game Awards)','Esports Game of the Year 2018 nominee'],
   ARRAY['It popularized the battle royale genre and inspired Fortnite and Apex','Brendan Greene, "PlayerUnknown", created the mode from Arma mods','The blue zone — a shrinking wall of electricity — became genre standard','PUBG Mobile has been downloaded over 1 billion times'])
  ,('portal-2',
   ARRAY['PC','PlayStation 3','Xbox 360','Nintendo Switch (Portal: Companion Collection)'],
   ARRAY['Single-player','Online Co-op','Local Co-op'],
   'E10+ (Everyone 10+)', 'Source', 'Portal', 95, 'Overwhelmingly Positive',
   '10+ million copies sold', 8, 12,
   ARRAY['BAFTA Best Game 2012','Game of the Year 2011 (multiple outlets)'],
   ARRAY['Stephen Merchant and J.K. Simmons voiced key characters','Its co-op campaign has an entirely separate story from the single-player','GLaDOS''s passive-aggressive humor is considered one of gaming''s best-written villains','A Valve engineer once hid a Portal 2 reference in an Arduino firmware update'])
  ,('cities-skylines',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch'],
   ARRAY['Single-player'],
   'E (Everyone)', 'Unity', 'Cities', 85, 'Mostly Positive',
   '12+ million copies sold', 0, 0,
   ARRAY['Best Simulation Game 2015 (multiple outlets)'],
   ARRAY['It was created as the long-awaited successor to SimCity after SimCity''s 2013 flop','Every citizen is individually simulated, with a job, home, and commute','Its traffic system is so accurate it''s used in urban planning lectures','Paradox turned it into a franchise with three major expansions and a sequel'])
  ,('dark-souls-iii',
   ARRAY['PC','PlayStation 4','Xbox One'],
   ARRAY['Single-player','Online PvP','Online Co-op'],
   'M (Mature 17+)', 'In-house (FromSoftware)', 'Souls', 89, 'Very Positive',
   '10+ million copies sold', 32, 60,
   ARRAY['Golden Joystick Ultimate Game of the Year 2016 nominee'],
   ARRAY['Its final DLC, The Ringed City, closes the entire Dark Souls saga','The soul level 1 run — beating the game without leveling — remains a legendary challenge','Firelink Shrine''s music is an orchestral variation of the series'' theme','Its combat is faster than Dark Souls 1 and 2, closer to Bloodborne'])
  ,('monster-hunter-world',
   ARRAY['PC','PlayStation 4','Xbox One'],
   ARRAY['Single-player','Online Co-op'],
   'T (Teen)', 'MT Framework', 'Monster Hunter', 90, 'Very Positive',
   '25+ million copies sold; Capcom''s best-selling game ever', 48, 165,
   ARRAY['Best RPG 2018 nominee (The Game Awards)','Japan Game Awards 2018'],
   ARRAY['It was the first Monster Hunter designed for a global audience','Each monster has an ecosystem — they hunt, eat, and fight each other','Its Palico cat companions can be customized with equipment','The Iceborne expansion added a whole new arctic continent'])
  ,('rocket-league',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch'],
   ARRAY['Online PvP','Local Co-op (Split-screen)'],
   'E (Everyone)', 'Unreal Engine 3/4', 'N/A', 86, 'Very Positive',
   '90+ million players worldwide', 0, 0,
   ARRAY['Best Sports Game 2015 (The Game Awards)','Best Independent Game 2015 nominee'],
   ARRAY['It was made by a small studio in San Diego, later bought by Epic Games','Its "ranked" seasons run in competitive playlists year-round','Cars can be customized with over 1,000 cosmetic items','The rocket-powered car-soccer idea came from a 2008 game called Supersonic Acrobatic Rocket-Powered Battle-Cars'])
  ,('hogwarts-legacy',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch'],
   ARRAY['Single-player'],
   'T (Teen)', 'Unreal Engine 4', 'Wizarding World', 84, 'Mostly Positive',
   '30+ million copies sold', 25, 70,
   ARRAY['Best Fantasy Game 2023 (The Game Awards nominee)','Golden Joystick PlayStation Game of the Year 2023'],
   ARRAY['It is set in the 1890s, long before Harry Potter''s era','Players can tame and ride Hippogriffs and Thestrals','The Room of Requirement serves as a base-building hub','It sold 12 million copies in its first two weeks despite controversy'])
  ,('ghost-of-tsushima',
   ARRAY['PC','PlayStation 4/5'],
   ARRAY['Single-player'],
   'M (Mature 17+)', 'In-house (Sucker Punch engine)', 'N/A', 83, 'Very Positive',
   '13+ million copies sold', 27, 60,
   ARRAY['Players'' Voice 2020 (The Game Awards)','Best Art Direction nominee 2020'],
   ARRAY['The wind literally guides players — no quest markers on screen','A fan petition asked Sony for a God of War-style exploration mode; it got one','Its multiplayer Legends mode was added free post-launch','The island of Iki in the DLC is based on a real Mongol invasion site'])
  ,('persona-5-royal',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch'],
   ARRAY['Single-player'],
   'M (Mature 17+)', 'In-house (Atlus engine)', 'Persona', 95, 'Overwhelmingly Positive',
   '8+ million copies sold (Persona 5 family)', 103, 145,
   ARRAY['Best RPG 2017 (multiple outlets, original release)','NAACP Image Award nominee for its jazz soundtrack'],
   ARRAY['The soundtrack by Shoji Meguro blends acid jazz with rock and opera','Its calendar system means every in-game day matters','Persona 5''s cast became so popular they crossed over into Smash Bros','The Royal version adds 30 hours of new content and a third semester'])
  ,('devil-may-cry-5',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S'],
   ARRAY['Single-player'],
   'M (Mature 17+)', 'RE Engine', 'Devil May Cry', 89, 'Very Positive',
   '8+ million copies sold', 11, 75,
   ARRAY['Best Action Game 2019 nominee (The Game Awards)'],
   ARRAY['Its style meter grades attacks from "D" to "SSS"','V, a new character, fights with summoned beasts instead of weapons','The Special Edition added Vergil as a playable character','Its soundtrack adapts to how stylishly the player fights'])
  ,('death-stranding',
   ARRAY['PC','PlayStation 4/5'],
   ARRAY['Single-player','Async Multiplayer'],
   'M (Mature 17+)', 'Decima', 'Death Stranding', 82, 'Very Positive',
   '10+ million copies sold', 40, 105,
   ARRAY['Best Game Direction 2019 (The Game Awards)','Best Score/Music 2019'],
   ARRAY['Its terrain traversal — balancing cargo while walking — is the core gameplay','Players'' structures appear in each other''s worlds asynchronously','Norman Reedus, Mads Mikkelsen, and Léa Seydoux star in it','A sequel, Death Stranding 2, was announced at The Game Awards 2022'])
  ,('left-4-dead-2',
   ARRAY['PC','Xbox 360'],
   ARRAY['Online Co-op','Local Co-op (Split-screen)','Online PvP'],
   'M (Mature 17+)', 'Source', 'Left 4 Dead', 89, 'Overwhelmingly Positive',
   '15+ million copies sold', 0, 0,
   ARRAY['Best Multiplayer Game 2009 (multiple outlets)'],
   ARRAY['It was released just one year after the original — an unusually fast sequel','The AI "Director" adjusts pacing, spawns, and items to each play session','Its community Workshop adds thousands of custom campaigns','The four survivors of the first game return as playable characters in DLC'])
  ,('team-fortress-2',
   ARRAY['PC','PlayStation 3','Xbox 360'],
   ARRAY['Online PvP'],
   'M (Mature 17+)', 'Source', 'Team Fortress', 92, 'Very Positive',
   'One of the most-played Steam games for 15+ years', 0, 0,
   ARRAY['Best Multiplayer Game 2007 (multiple outlets)','Guinness World Record for most-patched game (2010s)'],
   ARRAY['Its cartoon art style is based on the work of illustrator J.C. Leyendecker','Every class has a rich comic-book backstory, published free online','The Spy can disguise as any enemy class and backstab for instant kills','Its hat economy became a real phenomenon studied by economists'])
  ,('garrys-mod',
   ARRAY['PC','macOS','Linux'],
   ARRAY['Single-player','Online Co-op','Online PvP'],
   'M (Mature 17+)', 'Source', 'N/A', 88, 'Very Positive',
   '20+ million copies sold', 0, 0,
   ARRAY['A cultural institution with over a decade of community content'],
   ARRAY['It started as a free mod called Garry''s Mod 9','The "Trouble in Terrorist Town" mode inspired Among Us'' deduction gameplay','Its Prop Hunt mode became its own standalone game','The iconic "Dr. Kleiner" NPC model is reused in thousands of community videos'])
  ,('rust',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S'],
   ARRAY['Online PvP','Online Co-op'],
   'M (Mature 17+)', 'Unity', 'Rust', 86, 'Very Positive',
   '16+ million copies sold', 0, 0,
   ARRAY['Best Survival Game 2018 (multiple outlets)'],
   ARRAY['Every player''s skin color is assigned randomly and permanently','Its monthly forced server wipes reset the entire world','Raiding other players'' bases is the endgame for most clans','It began as a DayZ-inspired clone, then became its own brutal identity'])
  ,('ark-survival-evolved',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch'],
   ARRAY['Single-player','Online PvP','Online Co-op'],
   'T (Teen)', 'Unreal Engine 4', 'ARK', 76, 'Mostly Positive',
   '35+ million copies sold', 0, 0,
   ARRAY['Best Survival Game 2017 nominee (multiple outlets)'],
   ARRAY['Players can tame and ride over 150 species of dinosaurs','Its lore reveals the island is actually a space station','The ARK survival of the fittest mode became an esports tournament','Vin Diesel narrated the game''s 2023 sequel, ARK 2'])
  ,('dead-by-daylight',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch','Mobile (iOS/Android)'],
   ARRAY['Online PvP (Asymmetric 4v1)'],
   'M (Mature 17+)', 'Unreal Engine 4', 'N/A', 80, 'Mostly Positive',
   '60+ million players', 0, 0,
   ARRAY['Best Multiplayer Game 2016 nominee (The Game Awards)'],
   ARRAY['Licensed killers include Michael Myers, Leatherface, Nemesis, and Vecna','Each match is a slasher film with a different ending','Its fog, generators, and hooks are now genre shorthand','Behavior Interactive added original killers like The Trickster and The Artist'])
  ,('the-sims-4',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S'],
   ARRAY['Single-player'],
   'T (Teen)', 'In-house (Maxis engine)', 'The Sims', 76, 'Mostly Positive',
   '70+ million players worldwide', 0, 0,
   ARRAY['Best Simulation Game 2014 (multiple outlets)'],
   ARRAY['It became free-to-play in October 2022','Its Create-a-Sim introduced customizable body types and skin tones','The Gallery lets players share houses and households worldwide','Emotions — happy, angry, embarrassed — drive its simulation, a first for the series'])
) AS p(slug, plats, modes, esrb, eng, ser, mc, srl, pc, msh, ch, aw, tr)
WHERE g.slug = p.slug;
