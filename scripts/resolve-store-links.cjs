// Resolves the direct product page for every store row in the catalog.
//
//   node scripts/resolve-store-links.cjs             # refresh catalog.json + SQL
//   node scripts/resolve-store-links.cjs --apply     # ...and write D1
//   node scripts/resolve-store-links.cjs --dry-run   # report only
//
// Steam, Nintendo and Xbox IDs already live in scripts/store-ids.json. The
// stores without a price API are resolved here by their own public endpoints:
//
//   GOG          product page lookup from the title slug
//   Epic         store-content products endpoint
//   PlayStation  legacy Chihiro search, matched by title
//
// Every candidate has to match the catalog title, so a row that is not really
// sold on that store (there are a few in the imported snapshot) stays without a
// `product_url` and keeps its search fallback.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { normalize, score, NOISE } = require('./lib/matching.cjs');

const ROOT = path.join(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'src', 'data', 'catalog.json');
const STORE_IDS_PATH = path.join(__dirname, 'store-ids.json');
const LINKS_PATH = path.join(__dirname, 'store-links.json');
const OVERRIDES_PATH = path.join(__dirname, 'store-link-overrides.json');
const SQL_PATH = path.join(ROOT, 'db', 'store-links.sql');
const APPLY = process.argv.includes('--apply');
const DRY_RUN = process.argv.includes('--dry-run');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const storeIds = JSON.parse(fs.readFileSync(STORE_IDS_PATH, 'utf8'));
const overrides = fs.existsSync(OVERRIDES_PATH)
  ? JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8')).links ?? {}
  : {};
const platformById = new Map(catalog.platforms.map((p) => [p.id, p.slug]));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function slugify(value, separator = '-') {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');
}

function stripParenthetical(value) {
  return String(value ?? '').replace(/\s*\([^)]*\)\s*/g, ' ').trim();
}

function beforeColon(value) {
  return String(value ?? '').split(':')[0].trim();
}

function dropPublisher(value) {
  return String(value ?? '')
    .replace(/^[A-Za-z0-9.'’&-]+['’]s\s+/i, '')
    .trim();
}

function titleVariants(title) {
  return [
    ...new Set([title, stripParenthetical(title), beforeColon(title), dropPublisher(title)]),
  ].filter(Boolean);
}

function decodeEntities(value) {
  return String(value ?? '')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

async function fetchJson(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': UA, accept: 'application/json' },
      });
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      await sleep(800);
    }
  }
  return null;
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();
    const raw = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '';
    return { finalUrl: res.url, title: decodeEntities(raw).trim() };
  } catch {
    return null;
  }
}

// --- deterministic links ---------------------------------------------------

const steamUrl = (id) => `https://store.steampowered.com/app/${id}/`;
const nintendoUrl = (id) => `https://www.nintendo.com/us/store/products/${id}/`;
const gogUrl = (slug) => `https://www.gog.com/en/game/${slug}`;
const epicUrl = (slug) => `https://store.epicgames.com/en-US/p/${slug}`;
const playstationUrl = (id) => `https://store.playstation.com/en-us/product/${id}`;

function xboxUrl(id, title) {
  const slug = slugify(title) || '-';
  return `https://www.xbox.com/en-US/games/store/${slug}/${id}`;
}

// --- GOG -------------------------------------------------------------------

async function resolveGog(title) {
  for (const base of titleVariants(title)) {
    const slug = slugify(base, '_');
    if (!slug) continue;
    const page = await fetchPage(gogUrl(slug));
    if (!page || !/\/game\//.test(page.finalUrl)) continue;
    const pageTitle = page.title
      // GOG appends both the site name and the current discount: "… | GOG.com"
      // and "… 60% off".
      .replace(/\s*\|\s*GOG\.com\s*$/i, '')
      .replace(/\s+\d+%\s*off\s*$/i, '')
      .trim();
    if (score(title, pageTitle) >= 0.85) {
      return { url: page.finalUrl, id: slug, title: pageTitle, source: 'gog-page' };
    }
  }
  return null;
}

// --- Epic ------------------------------------------------------------------

async function resolveEpic(title) {
  for (const base of titleVariants(title)) {
    const slug = slugify(base);
    if (!slug) continue;
    const data = await fetchJson(
      `https://store-content.ak.epicgames.com/api/en-US/content/products/${slug}`
    );
    if (!data?.productName) {
      // Some products exist as a namespace without a display name. The slug
      // itself is enough when it round-trips through the response.
      if (data && (data._slug === slug || String(data._urlPattern ?? '').includes(`/${slug}`))) {
        return {
          url: epicUrl(slug),
          id: slug,
          title: data._title ?? slug,
          source: 'epic-content',
        };
      }
      continue;
    }
    // Epic occasionally stores lookalike characters (Civilization "Vl"), so the
    // title only has to be close when the slug itself came from the full title.
    if (score(title, data.productName) >= 0.6) {
      return { url: epicUrl(slug), id: slug, title: data.productName, source: 'epic-content' };
    }
  }
  return null;
}

// --- PlayStation -----------------------------------------------------------

function playstationRank(id) {
  const value = String(id ?? '').toUpperCase();
  if (value.includes('-PPSA')) return 0; // PS5
  return 1; // PS4 (CUSA)
}

function isModernPlaystationId(id) {
  const value = String(id ?? '').toUpperCase();
  // PS3 and Vita pages still resolve in search but most are no longer sold and
  // their product route returns an error page.
  return value.includes('-PPSA') || value.includes('-CUSA');
}

// Extra words that describe the same game rather than a different one:
// platform tags, edition names and the like.
const SAME_GAME_TAIL =
  /^(standard|deluxe|ultimate|definitive|gold|complete|enhanced|digital|premium|legendary|special|game of the year|goty|remastered|remake|voidheart|edition|directors|cut|version|console|playstation\d*|vergil|\d+)$/;

function scorePlaystation(title, name) {
  const value = score(title, name);
  if (value >= 0.9) return value;

  const wanted = normalize(title);
  const candidate = normalize(name);
  if (!wanted || !candidate) return value;

  // A store page titled without the sequel number is the same product
  // ("Overwatch" for Overwatch 2).
  if (candidate === wanted.replace(/\s+\d+$/, '')) return 0.9;

  // "Ghost of Tsushima DIRECTOR'S CUT", "Rust Console Edition (PlayStation 5)"
  // and "Hogwarts Legacy PS5 Version" are the same game; "Hollow Knight:
  // Silksong" and "Ghost of Tsushima: Legends" are not.
  if (candidate.startsWith(`${wanted} `)) {
    const tail = candidate.slice(wanted.length).trim().split(/\s+/);
    if (tail.length > 0 && tail.every((word) => SAME_GAME_TAIL.test(word))) return 0.91;
  }

  return value;
}

function pickPlaystation(title, links) {
  let best = null;
  for (const link of links) {
    const name = link?.name;
    if (!name || NOISE.test(name)) continue;
    const value = scorePlaystation(title, name);
    if (value < 0.9) continue;
    const rank = playstationRank(link.id);
    if (
      !best ||
      value > best.score ||
      (value === best.score && rank < best.rank) ||
      (value === best.score && rank === best.rank && name.length < best.name.length)
    ) {
      best = { candidate: link, name, score: value, rank };
    }
  }
  return best;
}

const PLAYSTATION_ALIASES = {
  'monster-hunter-world': ['Iceborne'],
};

function playstationQueries(title, slug) {
  const firstWord = String(title ?? '').split(/\s+/)[0];
  return [
    ...new Set([
      ...titleVariants(title),
      dropPublisher(title),
      ...(firstWord.length >= 3 ? [firstWord] : []),
      ...(PLAYSTATION_ALIASES[slug] ?? []),
    ]),
  ].filter(Boolean);
}

async function resolvePlaystation(title, slug) {
  // Compare every candidate with the title minus metadata like "(2023)".
  // The search query can be shorter ("ARK", "Overwatch"), which is only used
  // to find candidates, never to decide whether they match.
  const wanted = stripParenthetical(title);
  for (const query of playstationQueries(title, slug)) {
    const data = await fetchJson(
      `https://store.playstation.com/store/api/chihiro/00_09_000/tumbler/US/en/19/${encodeURIComponent(
        query
      )}?size=100&start=0`
    );
    const links = (data?.links ?? []).filter((link) => isModernPlaystationId(link.id));
    const rejected = new Set();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const best = pickPlaystation(
        wanted,
        links.filter((link) => !rejected.has(link.id))
      );
      if (!best) break;
      rejected.add(best.candidate.id);

      const url = playstationUrl(best.candidate.id);
      const page = await fetchPage(url);
      // Delisted titles redirect to /error even though search still lists them.
      if (page && !/\/error(\?|$)/.test(page.finalUrl)) {
        return {
          url,
          id: best.candidate.id,
          title: best.name,
          source: 'ps-search',
        };
      }
    }

    await sleep(250);
  }
  return null;
}

// --- Nintendo (slug pages for rows without a pinned NSUID) -----------------

async function resolveNintendo(title) {
  const bases = [
    ...new Set([slugify(title), slugify(stripParenthetical(title)), slugify(dropPublisher(title))]),
  ].filter(Boolean);
  for (const base of bases) {
    for (const slug of [`${base}-switch`, base]) {
      const page = await fetchPage(`https://www.nintendo.com/us/store/products/${slug}/`);
      if (!page || !page.finalUrl.includes('/store/products/')) continue;
      const pageTitle = page.title
        .replace(/\s*-\s*Nintendo Official Site\s*$/i, '')
        .replace(/\s+for Nintendo Switch\s*$/i, '')
        .trim();
      if (score(title, pageTitle) >= 0.85) {
        return { url: page.finalUrl, id: slug, title: pageTitle, source: 'nintendo-page' };
      }
    }
  }
  return null;
}

// --- Xbox (fills the rows that store-ids.json could not resolve) -----------

const XBOX_ALIASES = {
  'dark-souls-iii': ['Dark Souls'],
  'sekiro-shadows-die-twice': ['Sekiro'],
  'overwatch-2': ['Overwatch'],
};

function xboxQueries(title, slug) {
  const words = title.split(/\s+/).filter(Boolean);
  return [
    ...new Set([
      title,
      stripParenthetical(title),
      beforeColon(title),
      words.slice(0, 2).join(' '),
      words.slice(0, 1).join(' '),
      ...(XBOX_ALIASES[slug] ?? []),
    ]),
  ].filter((q) => q && q.length >= 3);
}

const XBOX_EDITION_TAIL =
  /^(standard|deluxe|ultimate|definitive|gold|complete|enhanced|digital|premium|legendary|game of the year|goty|remastered|remake|voidheart|edition|directors cut)\b/;

function scoreXbox(title, name) {
  const value = score(title, name);
  if (value >= 0.9) return value;
  const wanted = normalize(title);
  const candidate = normalize(name);
  // A sequel page titled without the number is the same product
  // ("Overwatch" for Overwatch 2).
  if (candidate === wanted.replace(/\s+\d+$/, '')) return 0.9;
  // Accept a base title with an edition/subtitle suffix, but never a sequel
  // ("Hollow Knight" vs "Hollow Knight: Silksong" stays rejected).
  if (wanted && candidate.startsWith(`${wanted} `)) {
    const tail = candidate.slice(wanted.length).trim();
    if (XBOX_EDITION_TAIL.test(tail)) return 0.91;
  }
  return value;
}

function pickXbox(title, products) {
  let best = null;
  for (const product of products) {
    const name = product?.Title;
    if (!name || NOISE.test(name)) continue;
    // The Xbox row is for the console store; a "for PC" listing is a different
    // product page even though the title matches.
    if (/\bfor (pc|windows)\b/i.test(name)) continue;
    const value = scoreXbox(title, name);
    if (value < 0.9) continue;
    if (!best || value > best.score || (value === best.score && name.length < best.name.length)) {
      best = { candidate: product, name, score: value };
    }
  }
  return best;
}

async function resolveXbox(title, slug) {
  for (const query of xboxQueries(title, slug)) {
    const data = await fetchJson(
      `https://displaycatalog.mp.microsoft.com/v7.0/productFamilies/autosuggest?market=US&languages=en-us&query=${encodeURIComponent(
        query
      )}&productFamilyNames=Games`
    );
    const products = (data?.Results ?? []).flatMap((family) => family.Products ?? []);
    const best = pickXbox(title, products);
    if (best) {
      return {
        url: xboxUrl(best.candidate.ProductId, best.name),
        id: best.candidate.ProductId,
        title: best.name,
        source: 'xbox-autosuggest',
      };
    }
    await sleep(250);
  }
  return null;
}

// --- main ------------------------------------------------------------------

(async () => {
  const links = {};
  const unresolved = [];
  let resolved = 0;
  let total = 0;

  const setLink = (slug, platform, link) => {
    links[slug] = links[slug] ?? {};
    links[slug][platform] = link;
    resolved += 1;
  };

  for (const game of catalog.games) {
    const rows = game.game_prices ?? [];
    if (rows.length === 0) continue;

    for (const row of rows) {
      const platform = platformById.get(row.platform_id);
      if (!platform) continue;
      total += 1;

      let link = null;
      const override = overrides[game.slug]?.[platform];
      if (override?.url) {
        link = { ...override, source: override.source ?? 'manual' };
      } else if (platform === 'steam' && storeIds.steam?.[game.slug]) {
        link = {
          url: steamUrl(storeIds.steam[game.slug].id),
          id: storeIds.steam[game.slug].id,
          title: game.title,
          source: 'store-id',
        };
      } else if (platform === 'nintendo-switch' && storeIds['nintendo-switch']?.[game.slug]) {
        link = {
          url: nintendoUrl(storeIds['nintendo-switch'][game.slug].id),
          id: storeIds['nintendo-switch'][game.slug].id,
          title: game.title,
          source: 'store-id',
        };
      } else if (platform === 'nintendo-switch') {
        link = await resolveNintendo(game.title);
      } else if (platform === 'xbox' && storeIds.xbox?.[game.slug]) {
        const info = storeIds.xbox[game.slug];
        link = {
          url: xboxUrl(info.id, info.title ?? game.title),
          id: info.id,
          title: info.title ?? game.title,
          source: 'store-id',
        };
      } else if (platform === 'gog') {
        link = await resolveGog(game.title);
      } else if (platform === 'epic-games-store') {
        link = await resolveEpic(game.title);
      } else if (platform === 'playstation') {
        link = await resolvePlaystation(game.title, game.slug);
      } else if (platform === 'xbox') {
        link = await resolveXbox(game.title, game.slug);
      }

      if (link) {
        setLink(game.slug, platform, link);
      } else {
        unresolved.push(`${platform}:${game.slug} (${game.title})`);
      }

      if (DRY_RUN) console.log(`  ${link ? 'ok  ' : 'miss'} ${platform.padEnd(16)} ${game.slug}`);
    }
  }

  // Write the resolved page back onto each catalog row so the snapshot, the
  // seed and the API all agree.
  if (!DRY_RUN) {
    for (const game of catalog.games) {
      for (const row of game.game_prices ?? []) {
        const platform = platformById.get(row.platform_id);
        const link = links[game.slug]?.[platform];
        if (link) row.product_url = link.url;
        else delete row.product_url;
      }
    }
    fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`);

    fs.writeFileSync(
      LINKS_PATH,
      `${JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          links,
          unresolved,
        },
        null,
        2
      )}\n`
    );

    const lines = [
      '-- Generated by scripts/resolve-store-links.cjs. Do not edit by hand.',
      '-- D1 does not allow BEGIN/COMMIT in executed files.',
    ];
    for (const game of catalog.games) {
      for (const row of game.game_prices ?? []) {
        const platform = platformById.get(row.platform_id);
        const link = links[game.slug]?.[platform];
        lines.push(
          `UPDATE game_prices SET product_url = ${
            link ? `'${link.url.replace(/'/g, "''")}'` : 'NULL'
          } WHERE id = '${row.id}';`
        );
      }
    }
    fs.writeFileSync(SQL_PATH, `${lines.join('\n')}\n`);
  }

  const byPlatform = {};
  for (const game of Object.values(links)) {
    for (const [platform, link] of Object.entries(game)) {
      byPlatform[platform] = byPlatform[platform] ?? { resolved: 0 };
      byPlatform[platform].resolved += 1;
      byPlatform[platform].source = byPlatform[platform].source ?? link.source;
    }
  }

  console.log(
    `\nResolved ${resolved} of ${total} store rows${
      DRY_RUN ? ' (dry run, nothing written)' : ''
    }`
  );
  for (const [platform, info] of Object.entries(byPlatform)) {
    console.log(`  ${platform.padEnd(16)} ${String(info.resolved).padStart(3)}`);
  }
  if (unresolved.length) {
    console.log('\nNo direct page (search fallback stays):');
    for (const line of unresolved) console.log(`  ${line}`);
  }

  if (DRY_RUN) return;

  if (APPLY) {
    console.log('\nApplying product links to Cloudflare D1...');
    const wranglerBin = path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
    const result = spawnSync(
      process.execPath,
      [wranglerBin, 'd1', 'execute', 'game-pedia', '--remote', '--file=db/store-links.sql'],
      { cwd: ROOT, stdio: 'inherit' }
    );
    if (result.error) console.error('[links]', result.error.message);
    if (result.status !== 0) {
      console.error('[links] D1 update failed');
      process.exit(1);
    }
    console.log('[links] D1 updated');
  }
})().catch((error) => {
  console.error('[links] fatal:', error);
  process.exit(1);
});
