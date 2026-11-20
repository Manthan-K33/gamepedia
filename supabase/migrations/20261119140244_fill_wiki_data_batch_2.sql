/*
# Fill wiki data for games (batch 2 of 3)

1. Modified Tables
- `games`: fills the wiki columns for the next 16 games (wave-two catalog).
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
  ('stardew-valley',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch','Mobile (iOS/Android)'],
   ARRAY['Single-player','Online Co-op','Local Co-op'],
   'E10+ (Everyone 10+)', 'MonoGame (C#)', 'Stardew Valley', 89, 'Overwhelmingly Positive',
   '41+ million copies sold; one of the best-selling indie games ever', 80, 160,
   ARRAY['Golden Joystick Breakthrough 2016','BAFTA nominee 2017'],
   ARRAY['It was created by a single developer, Eric Barone, over four years','Barone drew all the pixel art and wrote all the music himself','The game''s community center replaced a last-minute "Joja warehouse" ending','Jas, one of the town''s children, is named after Barone''s sister'])
  ,('hades',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch'],
   ARRAY['Single-player'],
   'T (Teen)', 'In-house (Cheats & Engines / custom C#)', 'Hades', 93, 'Overwhelmingly Positive',
   '10+ million copies sold; a genre-defining roguelike', 21, 99,
   ARRAY['Best Action Game 2020 (The Game Awards)','Best Indie Game 2020','Hugo Award for Best Interactive Media 2021'],
   ARRAY['It was the first video game ever to win a Hugo Award','Every death triggers new dialogue — over 20,000 voice lines total','The story of escaping the underworld is drawn straight from Greek mythology','Its voice cast included Logan Cunningham, long-time Supergiant collaborator'])
  ,('hollow-knight',
   ARRAY['PC','PlayStation 4','Xbox One','Nintendo Switch'],
   ARRAY['Single-player'],
   'E10+ (Everyone 10+)', 'Unity', 'Hollow Knight', 90, 'Overwhelmingly Positive',
   '15+ million copies sold', 27, 55,
   ARRAY['Best Indie Game 2017 (multiple outlets)','GDC Award for Best Visual Art 2018'],
   ARRAY['It was funded on Kickstarter in 2014 with just $57,000','Team Cherry, the developer, is a three-person studio from Adelaide, Australia','Its hand-drawn art took years and inspired thousands of fan animations','The game''s lore is deliberately left for players to piece together'])
  ,('forza-horizon-5',
   ARRAY['PC','PlayStation 5','Xbox One/Series X|S'],
   ARRAY['Single-player','Online PvP','Online Co-op'],
   'E (Everyone)', 'ForzaTech', 'Forza', 92, 'Very Positive',
   '40+ million players; the biggest launch in Xbox history', 20, 120,
   ARRAY['Best Sports/Racing 2021 (The Game Awards)','BAFTA nominee 2022'],
   ARRAY['Its Mexico map is one of the most diverse racing game worlds ever, with volcano, jungle, and desert','The Forzavista mode lets players explore every car in photorealistic detail','It supports ray tracing on console and PC','Its festival hub lets players build custom courses for friends'])
  ,('resident-evil-4-remake',
   ARRAY['PC','PlayStation 4/5','Xbox Series X|S'],
   ARRAY['Single-player'],
   'M (Mature 17+)', 'RE Engine', 'Resident Evil', 93, 'Overwhelmingly Positive',
   '7+ million copies sold within a year', 16, 30,
   ARRAY['Best VR/Action Game 2023 (The Game Awards)','Golden Joystick Ultimate Game of the Year 2023'],
   ARRAY['The original 2005 Resident Evil 4 is widely considered one of the greatest games ever','The remake overhauls combat with modern parries and knife durability','Ashley''s AI companion was rebuilt to feel like a real partner, not a burden','Ada Wong''s Separate Ways campaign was re-released as DLC in 2023'])
  ,('it-takes-two',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch'],
   ARRAY['Local Co-op','Online Co-op (Friend''s Pass)'],
   'T (Teen)', 'Unreal Engine 4', 'N/A', 89, 'Very Positive',
   '20+ million copies sold', 12, 15,
   ARRAY['Game of the Year 2021 (The Game Awards)','Best Multiplayer 2021','BAFTA Best Game 2022'],
   ARRAY['It can only be played in co-op — no single-player mode exists','The Friend''s Pass lets one buyer play with a friend for free','Its story is about a married couple turned into dolls working through divorce','A companion book, "It Takes Two: An Adventure in Creativity", accompanied its release'])
  ,('counter-strike-2',
   ARRAY['PC','PlayStation (via streaming)','Xbox (via streaming)'],
   ARRAY['Online PvP'],
   'M (Mature 17+)', 'Source 2', 'Counter-Strike', 83, 'Very Positive',
   '1.8+ million peak concurrent players on Steam; one of the most-played PC shooters', 0, 0,
   ARRAY['Esports Game of the Year 2023 nominee','Longest-running competitive FPS franchise in history'],
   ARRAY['Counter-Strike began as a Half-Life mod by Minh Le and Jess Cliffe in 1999','Its competitive format is still the industry''s default for 5v5 shooters','Every map was rebuilt from scratch for Source 2','The economy system — earning money each round — remains a genre innovation'])
  ,('the-last-of-us-part-i',
   ARRAY['PC','PlayStation 5'],
   ARRAY['Single-player'],
   'M (Mature 17+)', 'In-house (Naughty Dog engine)', 'The Last of Us', 88, 'Very Positive',
   'Original sold 20+ million; Part I remake sold millions more', 13, 24,
   ARRAY['Original won Game of the Year 2013; remake nominated for accessibility awards'],
   ARRAY['The remake was rebuilt from scratch with modern lighting and animations','Its infected enemies are based on real Cordyceps fungi','The story of Joel and Ellie is considered a high-water mark for narrative games','The HBO adaptation, starring Pedro Pascal and Bella Ramsey, premiered in 2023'])
  ,('ea-sports-fc-24',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch'],
   ARRAY['Single-player','Online PvP','Online Co-op'],
   'E (Everyone)', 'In-house (EA Frostbite)', 'FIFA / EA Sports FC', 62, 'Mostly Negative (Steam) / Positive (console)',
   'The best-selling sports game franchise in history', 0, 0,
   ARRAY['Guinness World Record for best-selling sports game franchise (as FIFA)'],
   ARRAY['It was the first entry after EA and FIFA ended their 30-year partnership','HyperMotionV technology captures real match data from 180 pro matches','Its "Ultimate Team" mode remains one of gaming''s largest economies','The switch from FIFA to FC cost EA the World Cup license but freed it to rename clubs'])
  ,('apex-legends',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch','Mobile (iOS/Android)'],
   ARRAY['Online PvP','Squad-based (Trios, Duos)'],
   'T (Teen)', 'Source (Respawn fork)', 'Titanfall', 88, 'Mostly Positive',
   '130+ million players worldwide', 0, 0,
   ARRAY['Best Multiplayer Game 2019 (The Game Awards)','Best Ongoing Game 2020 nominee'],
   ARRAY['It launched with zero marketing and hit 25 million players in one week','Its ping system revolutionized communication in shooters','Characters like Wraith and Octane became pop-culture icons','Titanfall''s wall-running movement was refined into Apex''s slide and climb system'])
  ,('valheim',
   ARRAY['PC','Xbox One/Series X|S'],
   ARRAY['Single-player','Online Co-op (up to 10 players)'],
   'T (Teen)', 'Unity', 'N/A', 93, 'Overwhelmingly Positive',
   '12+ million copies sold', 60, 150,
   ARRAY['Best Debut Game 2021 nominee (The Game Awards)','Golden Joystick Breakthrough 2021'],
   ARRAY['It was made by a five-person studio in Sweden','Its procedural worlds are inspired by Norse mythology','Building, farming, and sailing are as important as combat','The name "Valheim" refers to the tenth world in Norse mythology'])
  ,('among-us',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch','Mobile (iOS/Android)'],
   ARRAY['Online Co-op','Online PvP','Local Co-op'],
   'E10+ (Everyone 10+)', 'Unity', 'N/A', 85, 'Very Positive',
   '500+ million players at its 2020 peak', 0, 0,
   ARRAY['Best Mobile Game 2020 (The Game Awards)','Best Multiplayer 2020 nominee'],
   ARRAY['It was released in 2018 but exploded in popularity in mid-2020','Congresswoman Alexandria Ocasio-Cortez played it live on Twitch to encourage voting','The words "sus" and "impostor" entered internet slang worldwide','Its crewmate design was inspired by a doodle of a jelly bean'])
  ,('fall-guys',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch'],
   ARRAY['Online PvP','Online Co-op'],
   'E (Everyone)', 'Unreal Engine 4', 'N/A', 80, 'Mostly Positive',
   '50+ million players in its first two weeks', 0, 0,
   ARRAY['Best Multiplayer Game 2020 nominee (The Game Awards)'],
   ARRAY['Its bean-shaped characters became instant memes','It launched free on PlayStation Plus, boosting it to record players','Mediatonic was acquired by Epic Games in 2021','Its crossover skins include Sonic, Godzilla, and Spider-Man'])
  ,('civilization-vi',
   ARRAY['PC','PlayStation 4','Xbox One','Nintendo Switch','Mobile (iOS/Android)'],
   ARRAY['Single-player','Online PvP','Online Co-op'],
   'E10+ (Everyone 10+)', 'In-house (Firaxis engine)', 'Civilization', 88, 'Very Positive',
   '11+ million copies sold', 0, 0,
   ARRAY['Best Strategy Game 2016 nominee (The Game Awards)'],
   ARRAY['Sean Bean narrates the tech tree — quoting actual historical figures','Every leader has an AI personality that shapes diplomacy','Its "one more turn" design is legendary among strategy fans','The Rise and Fall expansion introduced loyal and rebellious cities'])
  ,('nba-2k24',
   ARRAY['PC','PlayStation 4/5','Xbox One/Series X|S','Nintendo Switch'],
   ARRAY['Single-player','Online PvP','Online Co-op'],
   'E (Everyone)', 'In-house (Visual Concepts engine)', 'NBA 2K', 67, 'Mostly Negative (Steam)',
   'The best-selling basketball video game franchise', 0, 0,
   ARRAY['Sports Game of the Year nominee (multiple outlets, historic)'],
   ARRAY['Kobe Bryant graces the cover for the Mamba Moments mode','ProPLAY technology animates real NBA footage into gameplay','Its MyCareer mode lets players live out an NBA story from high school to the Hall of Fame','The W mode focuses on WNBA careers for the first time in the series'])
) AS p(slug, plats, modes, esrb, eng, ser, mc, srl, pc, msh, ch, aw, tr)
WHERE g.slug = p.slug;
