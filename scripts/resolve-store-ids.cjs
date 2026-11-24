// Resolves the per-store product IDs used by scripts/sync-prices.cjs.
//
//   node scripts/resolve-store-ids.cjs
//
// Steam app IDs and Nintendo eShop NSUIDs are stable and mostly known, so they
// are pinned below. Xbox product IDs are resolved through the Store
// autosuggest endpoint and written to scripts/store-ids.json.
//
// Re-run this when a game is added to the catalog or a store relists a game.

const fs = require('node:fs');
const path = require('node:path');
const { pickBest, score } = require('./lib/matching.cjs');

const catalog = require('../src/data/catalog.json');
const platformSlug = new Map(catalog.platforms.map((p) => [p.id, p.slug]));

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

// Verified by hand (see scripts/steam-candidates.json for the search results).
// Games that are not sold on Steam (Fortnite, Minecraft) are intentionally absent.
const STEAM = {
  'among-us': 945360,
  'apex-legends': 1172470,
  'ark-survival-evolved': 346110,
  'baldur-s-gate-3': 1086940,
  'cities-skylines': 255710,
  'counter-strike-2': 730,
  'cyberpunk-2077': 1091500,
  'dark-souls-iii': 374320,
  'dead-by-daylight': 381210,
  'death-stranding': 1190460,
  'devil-may-cry-5': 601150,
  'doom-eternal': 782330,
  'ea-sports-fc-24': 2195250,
  'fall-guys': 1097150,
  'forza-horizon-5': 1551360,
  'garrys-mod': 4000,
  'grand-theft-auto-v': 3240220,
  hades: 1145360,
  'hogwarts-legacy': 990080,
  'hollow-knight': 367520,
  'it-takes-two': 1426210,
  'left-4-dead-2': 550,
  'monster-hunter-world': 582010,
  'nba-2k24': 2338770,
  'overwatch-2': 2357570,
  'persona-5-royal': 1687950,
  'portal-2': 620,
  'pubg-battlegrounds': 578080,
  'red-dead-redemption-2': 1174180,
  'resident-evil-4-remake': 2050650,
  'rocket-league': 252950,
  rust: 252490,
  'sekiro-shadows-die-twice': 814380,
  'civilization-vi': 289070,
  'stardew-valley': 413150,
  'team-fortress-2': 440,
  terraria: 105600,
  'the-last-of-us-part-i': 1888930,
  'the-sims-4': 1222670,
  'the-witcher-3-wild-hunt': 292030,
  valheim: 892970,
};

// Verified from the product pages' embedded JSON (see scripts/nintendo-map.json).
const NINTENDO = {
  'among-us': 70010000036098,
  'animal-crossing-new-horizons': 70010000027619,
  'ark-survival-evolved': 70010000010940,
  'dead-by-daylight': 70010000016124,
  fortnite: 70010000010192,
  hades: 70010000033131,
  'hogwarts-legacy': 70010000014724,
  'hollow-knight': 70010000003208,
  'it-takes-two': 70070000014924,
  minecraft: 70010000000964,
  'persona-5-royal': 70010000043147,
  'rocket-league': 70010000000457,
  'civilization-vi': 70010000013704,
  'stardew-valley': 70010000001801,
  terraria: 70010000001702,
  'the-legend-of-zelda-tears-of-the-kingdom': 70010000063714,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function resolveXbox(game) {
  const url = `https://displaycatalog.mp.microsoft.com/v7.0/productFamilies/autosuggest?market=US&languages=en-us&query=${encodeURIComponent(
    game.title
  )}&productFamilyNames=Games`;
  const data = await getJson(url);
  const products = (data.Results ?? []).flatMap((family) => family.Products ?? []);
  const best = pickBest(game.title, products, { nameOf: (p) => p.Title });
  if (!best) return null;
  return { id: best.candidate.ProductId, title: best.candidate.Title, score: best.score };
}

(async () => {
  const out = { generated_at: new Date().toISOString(), steam: {}, 'nintendo-switch': {}, xbox: {} };
  const unresolved = [];

  for (const game of catalog.games) {
    const stores = new Set(
      game.game_prices.map((p) => platformSlug.get(p.platform_id)).filter(Boolean)
    );

    if (stores.has('steam') && STEAM[game.slug]) {
      out.steam[game.slug] = { id: String(STEAM[game.slug]) };
    }
    if (stores.has('nintendo-switch') && NINTENDO[game.slug]) {
      out['nintendo-switch'][game.slug] = { id: String(NINTENDO[game.slug]) };
    }

    if (stores.has('xbox')) {
      try {
        const match = await resolveXbox(game);
        if (match) out.xbox[game.slug] = match;
        else unresolved.push(`xbox:${game.slug}`);
      } catch (error) {
        unresolved.push(`xbox:${game.slug} (${error.message})`);
      }
      await sleep(250);
    }
  }

  fs.writeFileSync(path.join(__dirname, 'store-ids.json'), JSON.stringify(out, null, 2));

  for (const store of ['steam', 'nintendo-switch', 'xbox']) {
    console.log(`${store.padEnd(16)} ${Object.keys(out[store]).length} resolved`);
  }
  if (unresolved.length) {
    console.log('\nunresolved (left on the snapshot):');
    for (const line of unresolved) console.log(`  ${line}`);
  }
})();
