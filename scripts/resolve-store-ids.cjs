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
  'a-way-out': 1222700,
  'age-of-empires-iv': 1466860,
  'among-us': 945360,
  'apex-legends': 1172470,
  'ark-survival-evolved': 346110,
  'assassins-creed-valhalla': 2208920,
  balatro: 2379780,
  'baldur-s-gate-3': 1086940,
  'batman-arkham-knight': 208650,
  'bioshock-infinite': 8870,
  celeste: 504230,
  'cities-skylines': 255710,
  'civilization-vi': 289070,
  control: 870780,
  'counter-strike-2': 730,
  'crusader-kings-iii': 1158310,
  cuphead: 268910,
  'cyberpunk-2077': 1091500,
  'dark-souls-iii': 374320,
  'dark-souls-remastered': 570940,
  'days-gone': 1259420,
  'dead-by-daylight': 381210,
  'dead-cells': 588650,
  'death-stranding': 1190460,
  'destiny-2': 1085660,
  'devil-may-cry-5': 601150,
  'disco-elysium': 632470,
  'dishonored-2': 403640,
  'divinity-original-sin-2': 435150,
  'doom-2016': 379720,
  'doom-eternal': 782330,
  'dragon-quest-xi-s': 1295510,
  'ea-sports-fc-24': 2195250,
  factorio: 427520,
  'fall-guys': 1097150,
  'fallout-new-vegas': 22380,
  'far-cry-6': 2369390,
  'final-fantasy-vii-remake-intergrade': 1462040,
  'final-fantasy-xiv-online': 39210,
  'final-fantasy-xvi': 2515020,
  'forza-horizon-5': 1551360,
  'garrys-mod': 4000,
  'god-of-war': 1593500,
  'grand-theft-auto-v': 3240220,
  hades: 1145360,
  'halo-infinite': 1240440,
  'halo-the-master-chief-collection': 976730,
  'helldivers-2': 553850,
  'hogwarts-legacy': 990080,
  'hollow-knight': 367520,
  'horizon-forbidden-west': 2420110,
  'human-fall-flat': 477160,
  'it-takes-two': 1426210,
  'left-4-dead-2': 550,
  'lethal-company': 1966720,
  'marvels-spider-man-miles-morales': 1817190,
  'marvels-spider-man-remastered': 1817070,
  'mass-effect-legendary-edition': 1328670,
  'metaphor-refantazio': 2679460,
  'microsoft-flight-simulator': 1250410,
  'monster-hunter-rise': 1446780,
  'monster-hunter-wilds': 2246340,
  'monster-hunter-world': 582010,
  'nba-2k24': 2338770,
  'nier-automata': 524220,
  'ori-and-the-will-of-the-wisps': 1057090,
  'outer-wilds': 753640,
  'overcooked-2': 728880,
  'overwatch-2': 2357570,
  palworld: 1623730,
  'path-of-exile': 238960,
  'persona-3-reload': 2161700,
  'persona-5-royal': 1687950,
  phasmophobia: 739630,
  'portal-2': 620,
  'prey-2017': 480490,
  'pubg-battlegrounds': 578080,
  'ratchet-and-clank-rift-apart': 1895880,
  'red-dead-redemption-2': 1174180,
  'resident-evil-2': 883710,
  'resident-evil-4-remake': 2050650,
  'resident-evil-village': 1196590,
  returnal: 1649240,
  'rocket-league': 252950,
  rust: 252490,
  'sekiro-shadows-die-twice': 814380,
  'shadow-of-the-tomb-raider': 750920,
  'slay-the-spire': 646570,
  'sons-of-the-forest': 1326470,
  'stardew-valley': 413150,
  stellaris: 281990,
  'street-fighter-6': 1364780,
  'team-fortress-2': 440,
  'tekken-8': 1778820,
  terraria: 105600,
  'the-elder-scrolls-v-skyrim': 489830,
  'the-last-of-us-part-i': 1888930,
  'the-sims-4': 1222670,
  'the-witcher-3-wild-hunt': 292030,
  'titanfall-2': 1237970,
  'tom-clancys-rainbow-six-siege': 359550,
  'total-war-three-kingdoms': 779340,
  'uncharted-legacy-of-thieves': 1659420,
  valheim: 892970,
  'vampire-survivors': 1794680,
  warframe: 230410,
  'watch-dogs-legion': 2239550,
  'yakuza-like-a-dragon': 1235140,
};

// Verified from the product pages' embedded JSON (see scripts/nintendo-map.json).
const NINTENDO = {
  'among-us': 70010000036098,
  'animal-crossing-new-horizons': 70010000027619,
  'ark-survival-evolved': 70010000010940,
  balatro: 70010000072051,
  celeste: 70010000006442,
  'civilization-vi': 70010000013704,
  cuphead: 70010000016330,
  'dark-souls-remastered': 70010000008122,
  'dead-by-daylight': 70010000016124,
  'dead-cells': 70010000007706,
  'doom-2016': 70010000001367,
  'dragon-quest-xi-s': 70010000021451,
  factorio: 70010000056818,
  fortnite: 70010000010192,
  hades: 70010000033131,
  'hogwarts-legacy': 70010000014724,
  'hollow-knight': 70010000003208,
  'human-fall-flat': 70010000001204,
  'it-takes-two': 70070000014924,
  minecraft: 70010000000964,
  'monster-hunter-rise': 70010000029016,
  'nier-automata': 70010000045182,
  'ori-and-the-will-of-the-wisps': 70010000034725,
  'outer-wilds': 70010000038712,
  'overcooked-2': 70010000003402,
  'persona-5-royal': 70010000043147,
  'rocket-league': 70010000000457,
  'slay-the-spire': 70010000012389,
  'stardew-valley': 70010000001801,
  terraria: 70010000001702,
  'the-elder-scrolls-v-skyrim': 70010000001369,
  'the-legend-of-zelda-tears-of-the-kingdom': 70010000063714,
  'vampire-survivors': 70010000059002,
};

// Verified Xbox product IDs (the autosuggest result was missing or wrong).
const XBOX = {
  'a-way-out': 'BWVBNCMF22ZK',
  'apex-legends': 'BV9ML45J2Q5V',
  'ark-survival-evolved': 'BNBLC4ZGFNKB',
  'assassins-creed-valhalla': '9P4NJFH17MRT',
  balatro: '9PK087LNGJC5',
  'baldur-s-gate-3': '9ND58LQTG09T',
  'batman-arkham-knight': 'C3DRG5G7FCB5',
  'bioshock-infinite': 'C4XX6JL0N0DM',
  'civilization-vi': '9N4RSG99KV1X',
  control: 'BZ6W9LRPC26W',
  'crusader-kings-iii': '9MZ8RZSD0NFQ',
  cuphead: '9NJRX71M5X9P',
  'cyberpunk-2077': 'BX3M8L83BBRW',
  'dark-souls-iii': 'BW2XDRNSCCPZ',
  'dark-souls-remastered': 'BS18VCF4NLQ9',
  'dead-by-daylight': 'C0N22P73QZ60',
  'dead-cells': 'BQSCNS1T8PHQ',
  'death-stranding': '9NQGN8TGNT8P',
  'devil-may-cry-5': 'BNLG5J5KDVJ3',
  'dishonored-2': 'BSZM480TSWGP',
  'divinity-original-sin-2': 'BW8PVL4CJ2Q6',
  'doom-2016': 'C3QH42WRGM3R',
  'doom-eternal': '9P5S26314HWQ',
  'dragon-quest-xi-s': '9PBDC0XZ8TXK',
  'elden-ring': '9P3J32CTXLRZ',
  'fall-guys': '9PMXH5249DG5',
  'fallout-new-vegas': 'BX3JNK07Z6QK',
  fortnite: 'BT5P2X999VH2',
  'forza-horizon-5': '9NNX1VVR3KNQ',
  'grand-theft-auto-v': 'BPJ686W6S0NH',
  hades: '9P8DL6W0JBB8',
  'halo-infinite': '9NP1P1WFS0LB',
  'halo-the-master-chief-collection': '9MT8PTGVHX2P',
  'hogwarts-legacy': '9MT5NJ5W7B8Z',
  'hollow-knight': '9MW9469V91LM',
  'human-fall-flat': 'BSMZH25V6V46',
  'it-takes-two': '9NKJ0VZQ4N0L',
  'mass-effect-legendary-edition': '9PKWHT7G60WQ',
  'metaphor-refantazio': '9N5DV8310XP7',
  'monster-hunter-rise': '9N1VP8WDQK4D',
  'monster-hunter-wilds': '9NMT6XFN0LVD',
  'monster-hunter-world': 'BNG91PT95LQN',
  'nier-automata': 'BPPZVT8BZ15N',
  'ori-and-the-will-of-the-wisps': '9N8CD0XZKLP4',
  'outer-wilds': 'C596FKDKMQN7',
  'overcooked-2': 'BVJLKDG2TX8H',
  'overwatch-2': 'C1C4DZJPBC2V',
  palworld: '9NKV34XDW014',
  'persona-3-reload': '9NKK6Z0K3RH2',
  'persona-5-royal': '9NZDHXL9SJJ8',
  'prey-2017': 'BVPGZMMDDZ0M',
  'resident-evil-2': 'BWMH951M3G3P',
  'resident-evil-4-remake': '9N7JCPPCPN37',
  'resident-evil-village': '9N2S04LGXXH4',
  'rocket-league': 'C125W9BG2K0V',
  rust: '9NPHHZBV60B4',
  'sekiro-shadows-die-twice': 'BQD5WRRP2D6Q',
  'slay-the-spire': '9P6W46XMDJM5',
  'stardew-valley': 'C3D891Z6TNQM',
  stellaris: '9NXQPGMR917R',
  'street-fighter-6': '9NM79B7N9JM6',
  'tekken-8': '9PPSM14VKCLW',
  terraria: 'BTNPS60N3114',
  'the-elder-scrolls-v-skyrim': 'BQ1W1T1FC14W',
  'the-witcher-3-wild-hunt': 'C261457LCNMJ',
  'titanfall-2': 'C0X2HNVH08FB',
  valheim: '9NCBL78CG9N7',
  'vampire-survivors': '9PD5BM2Z8C4L',
  'watch-dogs-legion': 'C1WRX8ZD77M9',
  'yakuza-like-a-dragon': '9NXCSWCQTNFG',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function resolveXbox(game) {
  if (XBOX[game.slug]) {
    return { id: XBOX[game.slug], title: game.title, score: 1 };
  }
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
