// Adds a batch of new games to src/data/catalog.json.
//
//   node scripts/add-games.cjs                # all files in scripts/new-games/
//   node scripts/add-games.cjs --limit 3      # try the first three entries
//   node scripts/add-games.cjs --slug celeste # a single entry
//
// Every fact that a store can tell us is fetched instead of typed: the Steam
// app details give the title, price, release date, studios and categories, the
// Steam review summary gives the review label, and each console store is asked
// for its own price before a price row is written. Store pages that cannot be
// verified simply get no row, so nothing is invented.
//
// The script also downloads cover art into public/covers/ and writes
// db/new-games.sql with idempotent inserts for Cloudflare D1.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { normalize, score } = require('./lib/matching.cjs');

const ROOT = path.join(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'src', 'data', 'catalog.json');
const NEW_GAMES_DIR = path.join(__dirname, 'new-games');
const COVERS_DIR = path.join(ROOT, 'public', 'covers');
const SQL_PATH = path.join(ROOT, 'db', 'new-games.sql');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

const STORE_URL = {
  steam: 'https://store.steampowered.com',
  'epic-games-store': 'https://store.epicgames.com',
  xbox: 'https://www.xbox.com/store',
  playstation: 'https://store.playstation.com',
  'nintendo-switch': 'https://www.nintendo.com/us/store',
  gog: 'https://www.gog.com',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const platformBySlug = new Map(catalog.platforms.map((p) => [p.slug, p]));
const existingSlugs = new Set(catalog.games.map((g) => g.slug));

// Hand-picked product ids for games whose store listing the matcher cannot
// find reliably (edition suffixes, bundles, a different subtitle).
const PINS_PATH = path.join(__dirname, 'store-pins.json');
const pins = fs.existsSync(PINS_PATH)
  ? JSON.parse(fs.readFileSync(PINS_PATH, 'utf8'))
  : {};

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripParenthetical(value) {
  return String(value ?? '').replace(/\s*\([^)]*\)\s*/g, ' ').trim();
}

function beforeColon(value) {
  return String(value ?? '').split(':')[0].trim();
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

async function getJson(url, attempt = 0) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
    if (res.status === 404) return null;
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      await sleep(1500 * (attempt + 1));
      return getJson(url, attempt + 1);
    }
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      // A store occasionally answers with a truncated or HTML body; treat it
      // as "no data" so one bad response cannot abort the whole batch.
      if (attempt < 2) {
        await sleep(1200);
        return getJson(url, attempt + 1);
      }
      return null;
    }
  } catch (error) {
    if (attempt < 2) {
      await sleep(1000);
      return getJson(url, attempt + 1);
    }
    console.warn(`  ! request failed: ${url.slice(0, 90)} (${error.message})`);
    return null;
  }
}

// Steam answers the plain request with an age gate / redirect loop, so the
// cookie that says "I am old enough" travels with every page request.
const STEAM_COOKIE =
  'birthtime=283993201; lastagecheckage=1-0-1990; wants_mature_content=1; Steam_Language=english';

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9',
        cookie: STEAM_COOKIE,
      },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    return { finalUrl: res.url, html: await res.text() };
  } catch {
    return null;
  }
}

async function download(url, file) {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) return false;
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 5000) return false;
  fs.writeFileSync(file, buffer);
  return true;
}

// --- Steam -----------------------------------------------------------------

async function steamDetails(appId) {
  const data = await getJson(
    `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us&l=english`
  );
  const app = data?.[String(appId)];
  if (!app?.success) return null;
  return app.data;
}

// Steam's own label, read from the store page. The appreviews JSON endpoint
// now serves the app page instead of JSON, so the visible summary is the
// reliable source. Returns null when a game has too few reviews.
const REVIEW_LABELS = new Set([
  'Overwhelmingly Positive',
  'Very Positive',
  'Mostly Positive',
  'Mixed',
  'Mostly Negative',
  'Very Negative',
  'Overwhelmingly Negative',
]);

async function steamReviewLabel(appId) {
  const page = await fetchPage(`https://store.steampowered.com/app/${appId}/?cc=us&l=english`);
  if (!page) return null;
  const match = page.html.match(
    /class="game_review_summary[^"]*"[^>]*>\s*([^<]+?)\s*</i
  );
  const label = match ? match[1].trim() : null;
  return label && REVIEW_LABELS.has(label) ? label : null;
}

function categoriesToModes(categories) {
  const ids = new Set((categories ?? []).map((c) => c.id));
  const modes = [];
  if (ids.has(2)) modes.push('Single-player');
  if (ids.has(1)) modes.push('Multi-player');
  if (ids.has(38)) modes.push('Online Co-op');
  if (ids.has(39)) modes.push('Local Co-op');
  if (ids.has(36)) modes.push('Online PvP');
  if (ids.has(49)) modes.push('PvP');
  return modes;
}

function categoriesToFeatures(categories) {
  const ids = new Set((categories ?? []).map((c) => c.id));
  const features = [];
  if (ids.has(2)) features.push('Single-player');
  if (ids.has(38)) features.push('Online Co-op');
  if (ids.has(39)) features.push('Local Co-op');
  if (ids.has(36)) features.push('Online PvP');
  if (ids.has(28)) features.push('Controller Support');
  if (ids.has(22)) features.push('Achievements');
  if (ids.has(23)) features.push('Cloud Saves');
  if (ids.has(44)) features.push('Remote Play');
  return features.slice(0, 6);
}

// --- Xbox ------------------------------------------------------------------

const XBOX_EDITION_TAIL =
  /^(standard|deluxe|ultimate|definitive|gold|complete|enhanced|digital|premium|legendary|game of the year|goty|remastered|remake|edition|directors cut)\b/;

function scoreXbox(title, name) {
  const value = score(title, name);
  if (value >= 0.9) return value;
  const wanted = normalize(title);
  const candidate = normalize(name);
  if (candidate === wanted.replace(/\s+\d+$/, '')) return 0.9;
  if (wanted && candidate.startsWith(`${wanted} `)) {
    const tail = candidate.slice(wanted.length).trim();
    if (XBOX_EDITION_TAIL.test(tail)) return 0.91;
  }
  return value;
}

async function xboxProduct(title) {
  const words = title.split(/\s+/).filter(Boolean);
  const queries = [
    ...new Set([
      title,
      stripParenthetical(title),
      beforeColon(title),
      words.slice(0, 2).join(' '),
      words.slice(0, 1).join(' '),
    ]),
  ].filter((q) => q && q.length >= 3);

  for (const query of queries) {
    const data = await getJson(
      `https://displaycatalog.mp.microsoft.com/v7.0/productFamilies/autosuggest?market=US&languages=en-us&query=${encodeURIComponent(
        query
      )}&productFamilyNames=Games`
    );
    const products = (data?.Results ?? []).flatMap((family) => family.Products ?? []);
    let best = null;
    for (const product of products) {
      const name = product?.Title;
      if (!name || /\bfor (pc|windows)\b/i.test(name)) continue;
      const value = scoreXbox(title, name);
      if (value < 0.9) continue;
      if (!best || value > best.score || (value === best.score && name.length < best.name.length)) {
        best = { product, name, score: value };
      }
    }
    if (best) return best;
    await sleep(200);
  }
  return null;
}

function xboxPrice(product) {
  let best = null;
  for (const sku of product.DisplaySkuAvailabilities ?? []) {
    for (const availability of sku.Availabilities ?? []) {
      if (!(availability.Actions ?? []).includes('Purchase')) continue;
      const price = availability.OrderManagementData?.Price;
      if (!price) continue;
      const list = Number(price.ListPrice);
      if (!Number.isFinite(list) || list <= 0) continue;
      const msrp = Number(price.MSRP ?? price.ListPrice);
      if (!best || list < best.list) best = { list, msrp };
    }
  }
  if (!best) return null;
  return { price: best.list, regular: Number.isFinite(best.msrp) ? best.msrp : best.list };
}

// --- PlayStation -----------------------------------------------------------

const SAME_GAME_TAIL =
  /^(standard|deluxe|ultimate|definitive|gold|complete|enhanced|digital|premium|legendary|special|game of the year|goty|remastered|remake|voidheart|edition|directors|cut|version|console|playstation\d*|\d+)$/;

function scorePlaystation(title, name) {
  const value = score(title, name);
  if (value >= 0.9) return value;
  const wanted = normalize(title);
  const candidate = normalize(name);
  if (!wanted || !candidate) return value;
  if (candidate === wanted.replace(/\s+\d+$/, '')) return 0.9;
  if (candidate.startsWith(`${wanted} `)) {
    const tail = candidate.slice(wanted.length).trim().split(/\s+/);
    if (tail.length > 0 && tail.every((word) => SAME_GAME_TAIL.test(word))) return 0.91;
  }
  return value;
}

function playstationRank(id) {
  const value = String(id ?? '').toUpperCase();
  if (value.includes('-PPSA')) return 0;
  return 1;
}

function isModernPlaystationId(id) {
  const value = String(id ?? '').toUpperCase();
  return value.includes('-PPSA') || value.includes('-CUSA');
}

async function playstationProduct(title) {
  const words = title.split(/\s+/).filter(Boolean);
  const queries = [
    ...new Set([title, stripParenthetical(title), beforeColon(title), words[0]]),
  ].filter((q) => q && q.length >= 3);

  for (const query of queries) {
    const data = await getJson(
      `https://store.playstation.com/store/api/chihiro/00_09_000/tumbler/US/en/19/${encodeURIComponent(
        query
      )}?size=100&start=0`
    );
    const links = (data?.links ?? []).filter((link) => isModernPlaystationId(link.id));
    let best = null;
    for (const link of links) {
      if (!link?.name) continue;
      const value = scorePlaystation(title, link.name);
      if (value < 0.9) continue;
      const rank = playstationRank(link.id);
      if (
        !best ||
        value > best.score ||
        (value === best.score && rank < best.rank) ||
        (value === best.score && rank === best.rank && link.name.length < best.name.length)
      ) {
        best = { link, name: link.name, score: value, rank };
      }
    }
    if (best) return best;
    await sleep(250);
  }
  return null;
}

async function playstationPrice(productId) {
  const data = await getJson(
    `https://store.playstation.com/store/api/chihiro/00_09_000/container/US/en/19/${productId}/0`
  );
  const sku = data?.default_sku;
  const display = sku?.display_price;
  const value = display ? Number(String(display).replace(/[^0-9.]/g, '')) : NaN;
  if (Number.isFinite(value) && value > 0) return { price: value, regular: value };

  // Newer products answer the old container API with 204. Their page still
  // publishes the offer as JSON-LD, which is the product's own price.
  const page = await fetchPage(`https://store.playstation.com/en-us/product/${productId}`);
  if (!page) return null;
  const offer = page.html.match(
    /"offers":\{"@type":"Offer","price":([0-9.]+),"priceCurrency":"USD"\}/
  );
  const sale = offer ? Number(offer[1]) : NaN;
  if (!Number.isFinite(sale) || sale <= 0) return null;
  const base = page.html
    .slice(offer.index ?? 0)
    .match(/"basePrice":"\$([0-9.]+)"/);
  const regular = base ? Number(base[1]) : sale;
  return {
    price: sale,
    regular: Number.isFinite(regular) && regular >= sale ? regular : sale,
  };
}

// --- Nintendo --------------------------------------------------------------

async function nintendoProduct(title) {
  const bases = [
    ...new Set([slugify(title), slugify(stripParenthetical(title)), slugify(beforeColon(title))]),
  ].filter(Boolean);
  for (const base of bases) {
    for (const slug of [`${base}-switch`, base]) {
      const page = await fetchPage(`https://www.nintendo.com/us/store/products/${slug}/`);
      if (!page || !page.finalUrl.includes('/store/products/')) continue;
      const pageTitle = decodeEntities((page.html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '')
        .replace(/\s*-\s*Nintendo Official Site\s*$/i, '')
        .replace(/\s+for Nintendo Switch.*$/i, '')
        .trim();
      if (score(title, pageTitle) < 0.85) continue;
      const nsuid = (page.html.match(/"nsuid"\s*:\s*"?(\d{14})"?/) || [])[1];
      if (!nsuid) continue;
      return { nsuid, url: `https://www.nintendo.com/us/store/products/${nsuid}/` };
    }
  }
  return null;
}

async function nintendoPrice(nsuid) {
  const data = await getJson(
    `https://api.ec.nintendo.com/v1/price?country=US&lang=en&ids=${nsuid}`
  );
  const price = data?.prices?.[0];
  if (!price?.regular_price) return null;
  const regular = Number(price.regular_price.raw_value);
  const sale = price.discount_price ? Number(price.discount_price.raw_value) : null;
  if (!Number.isFinite(regular) || regular <= 0) return null;
  return { price: Number.isFinite(sale) ? sale : regular, regular };
}

// --- rows ------------------------------------------------------------------

function makeRow(platformSlug, { price, regular, productUrl, updatedAt }) {
  const platform = platformBySlug.get(platformSlug);
  if (!platform) throw new Error(`Unknown platform ${platformSlug}`);
  const row = {
    id: crypto.randomUUID(),
    price,
    on_sale: regular > price,
    currency: 'USD',
    platforms: platform,
    store_url: STORE_URL[platformSlug],
    platform_id: platform.id,
    regular_price: regular,
  };
  if (updatedAt) row.updated_at = updatedAt;
  if (productUrl) row.product_url = productUrl;
  return row;
}

const clean = (value) => (value === undefined ? null : value);

function toIsoDate(text) {
  const date = new Date(text ?? '');
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

// --- SQL -------------------------------------------------------------------

const q = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/'/g, "''")}'`;
};
const json = (v) => (v === null || v === undefined ? 'NULL' : q(JSON.stringify(v)));

const GAME_COLUMNS = [
  'id', 'slug', 'title', 'short_description', 'about', 'developer', 'publisher',
  'release_date', 'genres', 'tags', 'features', 'hero_image', 'box_image',
  'rating', 'price_display', 'featured', 'platforms_released', 'game_modes',
  'esrb_rating', 'engine', 'series', 'metacritic_score', 'steam_reviews_label',
  'player_count', 'main_story_hours', 'completionist_hours', 'awards', 'trivia',
];
const JSON_COLUMNS = new Set([
  'genres', 'tags', 'features', 'platforms_released', 'game_modes', 'awards', 'trivia',
]);

const gameRowSql = (g) =>
  '(' + GAME_COLUMNS.map((c) => (JSON_COLUMNS.has(c) ? json(g[c]) : q(g[c]))).join(', ') + ')';

const priceRowSql = (p, gameId) =>
  '(' +
  [
    q(p.id),
    q(gameId),
    q(p.platform_id),
    q(p.price),
    q(p.regular_price),
    q(p.currency),
    q(p.store_url),
    q(p.product_url ?? null),
    q(p.on_sale),
    q(p.updated_at ?? null),
  ].join(', ') +
  ')';

// --- main ------------------------------------------------------------------

(async () => {
  if (!fs.existsSync(NEW_GAMES_DIR)) throw new Error(`Missing ${NEW_GAMES_DIR}`);
  const files = fs
    .readdirSync(NEW_GAMES_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort();
  let additions = files.flatMap((file) =>
    JSON.parse(fs.readFileSync(path.join(NEW_GAMES_DIR, file), 'utf8')).games
  );

  const limitIndex = process.argv.indexOf('--limit');
  if (limitIndex >= 0) additions = additions.slice(0, Number(process.argv[limitIndex + 1]));

  const onlyIndex = process.argv.indexOf('--slug');
  if (onlyIndex >= 0) {
    const wanted = new Set(process.argv[onlyIndex + 1].split(','));
    additions = additions.filter((a) => wanted.has(a.slug));
  }
  if (additions.length === 0) throw new Error('No entries to add');

  // --redo rebuilds catalog entries that already exist (handy when a store
  // match was wrong or a pinned product was added later).
  const redoIndex = process.argv.indexOf('--redo');
  const redo = new Set(
    redoIndex >= 0 ? String(process.argv[redoIndex + 1] ?? '').split(',').filter(Boolean) : []
  );
  if (redo.size > 0) additions = additions.filter((a) => redo.has(a.slug));

  const today = new Date().toISOString();
  const added = [];
  const warnings = [];

  for (const addition of additions) {
    const existing = catalog.games.find((g) => g.slug === addition.slug);
    if (existing && !redo.has(addition.slug)) {
      warnings.push(`${addition.slug}: already in the catalog, skipped`);
      continue;
    }
    if (!addition.steam_app_id) {
      warnings.push(`${addition.slug}: steam_app_id is required, skipped`);
      continue;
    }

    process.stdout.write(`\n[${addition.slug}] ${addition.title}\n`);
    const steam = await steamDetails(addition.steam_app_id);
    if (!steam) {
      warnings.push(`${addition.slug}: Steam app ${addition.steam_app_id} could not be read, skipped`);
      continue;
    }
    const steamName = normalize(steam.name);
    const wantedName = normalize(addition.title);
    const nameMatches =
      score(addition.title, steam.name) >= 0.6 ||
      (wantedName.length > 6 && steamName.startsWith(wantedName));
    if (!nameMatches) {
      warnings.push(
        `${addition.slug}: Steam app ${addition.steam_app_id} is "${steam.name}", not "${addition.title}", skipped`
      );
      continue;
    }
    console.log(`  steam  ${steam.name} | ${steam.release_date?.date}`);

    const reviewLabelValue = await steamReviewLabel(addition.steam_app_id);
    await sleep(400);

    // Covers: the wide header and the portrait library capsule.
    fs.mkdirSync(COVERS_DIR, { recursive: true });
    const heroFile = path.join(COVERS_DIR, `${addition.slug}.hero.jpg`);
    const boxFile = path.join(COVERS_DIR, `${addition.slug}.box.jpg`);
    const heroOk = steam.header_image ? await download(steam.header_image, heroFile) : false;
    let boxOk = await download(
      `https://cdn.akamai.steamstatic.com/steam/apps/${addition.steam_app_id}/library_600x900.jpg`,
      boxFile
    );
    if (!boxOk) {
      boxOk = await download(
        `https://cdn.akamai.steamstatic.com/steam/apps/${addition.steam_app_id}/library_600x900_2x.jpg`,
        boxFile
      );
    }
    if (!heroOk) warnings.push(`${addition.slug}: no hero image`);
    if (!boxOk) warnings.push(`${addition.slug}: no portrait cover, cards fall back to generated art`);
    console.log(`  covers hero=${heroOk ? 'ok' : 'missing'} box=${boxOk ? 'ok' : 'missing'}`);

    const rows = [];
    const stores = new Set(addition.stores ?? ['steam']);
    const searchTitle = addition.title;

    if (stores.has('steam')) {
      if (steam.price_overview) {
        rows.push(
          makeRow('steam', {
            price: steam.price_overview.final / 100,
            regular: steam.price_overview.initial / 100,
            productUrl: `https://store.steampowered.com/app/${addition.steam_app_id}/`,
            updatedAt: today,
          })
        );
      } else if (steam.is_free) {
        rows.push(
          makeRow('steam', {
            price: 0,
            regular: 0,
            productUrl: `https://store.steampowered.com/app/${addition.steam_app_id}/`,
            updatedAt: today,
          })
        );
      } else {
        warnings.push(`${addition.slug}: Steam has no store price, row skipped`);
      }
    }

    if (stores.has('xbox')) {
      const pinned = pins[addition.slug]?.xbox;
      let found = null;
      if (pinned) {
        const data = await getJson(
          `https://displaycatalog.mp.microsoft.com/v7.0/products/${pinned}?market=US&languages=en-us`
        );
        const value = data?.Product ? xboxPrice(data.Product) : null;
        if (value) {
          found = {
            name: data.Product.LocalizedProperties?.[0]?.ProductTitle ?? searchTitle,
            productId: pinned,
            value,
          };
        } else {
          warnings.push(`${addition.slug}: pinned Xbox product ${pinned} has no purchasable price`);
        }
      } else {
        const match = await xboxProduct(searchTitle);
        if (match) {
          const product = await getJson(
            `https://displaycatalog.mp.microsoft.com/v7.0/products/${match.product.ProductId}?market=US&languages=en-us`
          );
          const value = product?.Product ? xboxPrice(product.Product) : null;
          if (value) {
            found = { name: match.name, productId: match.product.ProductId, value };
          } else {
            warnings.push(`${addition.slug}: Xbox listing ${match.name} has no purchasable price`);
          }
        } else {
          warnings.push(`${addition.slug}: no Xbox listing found`);
        }
      }
      if (found) {
        rows.push(
          makeRow('xbox', {
            price: found.value.price,
            regular: found.value.regular,
            productUrl: `https://www.xbox.com/en-US/games/store/${slugify(found.name)}/${found.productId}`,
            updatedAt: today,
          })
        );
        console.log(`  xbox   ${found.name} | $${found.value.price}`);
      }
    }

    if (stores.has('playstation')) {
      const pinned = pins[addition.slug]?.playstation;
      let found = null;
      if (pinned) {
        const page = await fetchPage(`https://store.playstation.com/en-us/product/${pinned}`);
        const value =
          page && !/\/error(\?|$)/.test(page.finalUrl) ? await playstationPrice(pinned) : null;
        if (value) {
          found = { productId: pinned, value };
        } else {
          warnings.push(`${addition.slug}: pinned PlayStation product ${pinned} has no price`);
        }
      } else {
        const match = await playstationProduct(searchTitle);
        if (match) {
          const value = await playstationPrice(match.link.id);
          if (value) {
            found = { name: match.name, productId: match.link.id, value };
          } else {
            warnings.push(`${addition.slug}: PlayStation page not purchasable`);
          }
        } else {
          warnings.push(`${addition.slug}: no PlayStation listing found`);
        }
      }
      if (found) {
        rows.push(
          makeRow('playstation', {
            price: found.value.price,
            regular: found.value.regular,
            productUrl: `https://store.playstation.com/en-us/product/${found.productId}`,
          })
        );
        console.log(`  ps     ${found.name ?? found.productId} | $${found.value.price}`);
      }
    }

    if (stores.has('nintendo')) {
      const pinned = pins[addition.slug]?.['nintendo-switch'];
      let found = null;
      if (pinned) {
        const value = await nintendoPrice(pinned);
        if (value) {
          found = { nsuid: pinned, value };
        } else {
          warnings.push(`${addition.slug}: pinned Nintendo product ${pinned} has no price`);
        }
      } else {
        const match = await nintendoProduct(searchTitle);
        if (match) {
          const value = await nintendoPrice(match.nsuid);
          if (value) {
            found = { nsuid: match.nsuid, value };
          } else {
            warnings.push(`${addition.slug}: Nintendo ${match.nsuid} has no price`);
          }
        } else {
          warnings.push(`${addition.slug}: no Nintendo listing found`);
        }
      }
      if (found) {
        rows.push(
          makeRow('nintendo-switch', {
            price: found.value.price,
            regular: found.value.regular,
            productUrl: `https://www.nintendo.com/us/store/products/${found.nsuid}/`,
            updatedAt: today,
          })
        );
        console.log(`  switch ${found.nsuid} | $${found.value.price}`);
      }
    }

    const priced = rows.filter((r) => Number.isFinite(r.price));
    const cheapest = priced.length ? Math.min(...priced.map((r) => r.price)) : null;

    const game = {
      id: existing?.id ?? crypto.randomUUID(),
      slug: addition.slug,
      title: addition.title,
      short_description: addition.short_description ?? steam.short_description ?? null,
      about: addition.about ?? null,
      developer: addition.developer ?? steam.developers?.[0] ?? null,
      publisher: addition.publisher ?? steam.publishers?.[0] ?? null,
      release_date: addition.release_date ?? toIsoDate(steam.release_date?.date),
      genres: addition.genres ?? [],
      tags: addition.tags ?? [],
      features: categoriesToFeatures(steam.categories),
      hero_image: heroOk ? `/covers/${addition.slug}.hero.jpg` : null,
      box_image: boxOk ? `/covers/${addition.slug}.box.jpg` : null,
      rating: addition.metacritic_score ?? null,
      price_display: cheapest === null ? null : cheapest === 0 ? 'Free' : `$${cheapest.toFixed(2)}`,
      featured: existing?.featured ?? false,
      created_at: existing?.created_at ?? today,
      platforms_released: addition.platforms_released ?? ['PC'],
      game_modes: categoriesToModes(steam.categories),
      esrb_rating: clean(addition.esrb_rating),
      engine: clean(addition.engine),
      series: addition.series ?? 'N/A',
      metacritic_score: addition.metacritic_score ?? null,
      steam_reviews_label: reviewLabelValue,
      player_count: clean(addition.player_count),
      main_story_hours: addition.main_story_hours ?? null,
      completionist_hours: addition.completionist_hours ?? null,
      awards: addition.awards ?? [],
      trivia: addition.trivia ?? [],
      game_prices: rows,
    };

    added.push(game);
    const index = catalog.games.findIndex((g) => g.slug === game.slug);
    if (index >= 0) catalog.games[index] = game;
    else catalog.games.push(game);
    // Save after each game so a failure later in a long batch cannot throw
    // away the entries that already resolved.
    fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
    console.log(`  rows   ${rows.map((r) => boardSlug(r)).join(', ') || 'none'}`);
  }

  if (added.length === 0) {
    console.log('\nNothing added.');
    return;
  }

  const lines = [
    '-- Generated by scripts/add-games.cjs. Do not edit by hand.',
    `-- ${added.length} games, ${added.reduce((n, g) => n + g.game_prices.length, 0)} price rows`,
    '-- Idempotent: re-running replaces the same ids.',
  ];
  for (let i = 0; i < added.length; i += 20) {
    lines.push(
      `INSERT OR REPLACE INTO games (${GAME_COLUMNS.join(', ')}) VALUES\n` +
        added.slice(i, i + 20).map(gameRowSql).join(',\n') +
        ';'
    );
  }
  for (const game of added) {
    const prices = game.game_prices;
    lines.push(`DELETE FROM game_prices WHERE game_id = ${q(game.id)};`);
    for (let i = 0; i < prices.length; i += 25) {
      lines.push(
        'INSERT OR REPLACE INTO game_prices (id, game_id, platform_id, price, regular_price, currency, store_url, product_url, on_sale, updated_at) VALUES\n' +
          prices.slice(i, i + 25).map((p) => priceRowSql(p, game.id)).join(',\n') +
          ';'
      );
    }
  }
  fs.writeFileSync(SQL_PATH, `${lines.join('\n')}\n`);

  console.log(`\nAdded ${added.length} games to src/data/catalog.json`);
  console.log(`Wrote ${path.relative(ROOT, SQL_PATH)}`);
  if (warnings.length) {
    console.log('\nWarnings:');
    for (const line of warnings) console.log(`  ${line}`);
  }
})().catch((error) => {
  console.error('\n[add-games] fatal:', error.message);
  process.exit(1);
});

function boardSlug(row) {
  return catalog.platforms.find((p) => p.id === row.platform_id)?.slug;
}
