UPDATE games SET
  hero_image = '/covers/' || slug || CASE
    WHEN slug IN ('baldur-s-gate-3','cyberpunk-2077','minecraft','grand-theft-auto-v','the-witcher-3-wild-hunt','god-of-war-ragnarok','sekiro-shadows-die-twice','doom-eternal','animal-crossing-new-horizons','overwatch-2','terraria','the-legend-of-zelda-tears-of-the-kingdom','fortnite')
      THEN CASE WHEN slug IN ('minecraft','grand-theft-auto-v','fortnite') THEN '.png' ELSE '.jpg' END
    ELSE '.hero.jpg' END,
  box_image = '/covers/' || slug || CASE
    WHEN slug IN ('baldur-s-gate-3','cyberpunk-2077','minecraft','grand-theft-auto-v','the-witcher-3-wild-hunt','god-of-war-ragnarok','sekiro-shadows-die-twice','doom-eternal','animal-crossing-new-horizons','overwatch-2','terraria','the-legend-of-zelda-tears-of-the-kingdom','fortnite')
      THEN CASE WHEN slug IN ('minecraft','grand-theft-auto-v','fortnite') THEN '.png' ELSE '.jpg' END
    ELSE '.box.jpg' END
WHERE slug IN ('elden-ring','red-dead-redemption-2','stardew-valley','hollow-knight','forza-horizon-5','resident-evil-4-remake','hades','it-takes-two','counter-strike-2','the-last-of-us-part-i','ea-sports-fc-24','baldur-s-gate-3','cyberpunk-2077','minecraft','grand-theft-auto-v','the-witcher-3-wild-hunt','god-of-war-ragnarok','sekiro-shadows-die-twice','doom-eternal','animal-crossing-new-horizons','overwatch-2','terraria','the-legend-of-zelda-tears-of-the-kingdom','fortnite');
