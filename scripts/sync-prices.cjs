// Refreshes real store prices into the catalog.
//
//   node scripts/sync-prices.cjs            # update catalog.json + db/prices-sync.sql
//   node scripts/sync-prices.cjs --apply    # ...and push the changes to Cloudflare D1
//
// Sources (all public, no API keys):
//   Steam     store.steampowered.com/api/appdetails
//   Nintendo  api.ec.nintendo.com/v1/price
//   Xbox      displaycatalog.mp.microsoft.com
//
// Epic Games Store and PlayStation do not expose a usable public price API, so
// those rows keep the catalog snapshot date and are labelled as such in the UI.
// `scripts/store-ids.json` maps each game to its store product IDs; regenerate
// it with `node scripts/resolve-store-ids.cjs` when the catalog changes.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'src', 'data', 'catalog.json');
const SQL_PATH = path.join(ROOT, 'db', 'prices-sync.sql');
const APPLY = process.argv.includes('--apply');
const DRY_RUN = process.argv.includes('--dry-run');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const storeIds = JSON.parse(fs.readFileSync(path.join(__dirname, 'store-ids.json'), 'utf8'));

const platformById = new Map(catalog.platforms.map((p) => [p.id, p.slug]));
const gameBySlug = new Map(catalog.games.map((g) => [g.slug, g]));

function priceRow(slug, platformSlug) {
  const game = gameBySlug.get(slug);
  if (!game) return null;
  return (
    game.game_prices.find((p) => platformById.get(p.platform_id) === platformSlug) ?? null
  );
}

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}

function normalise(price, regular) {
  if (!Number.isFinite(price) || price < 0) return null;
  const current = round(price);
  const base = Number.isFinite(regular) && regular > 0 ? round(regular) : current;
  return {
    price: current,
    regular_price: base,
    on_sale: base > current,
  };
}

async function getJson(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// --- Steam ---------------------------------------------------------------

// The appdetails endpoint honors only one `appids` parameter per request (extra
// ones are ignored), so each game needs its own call. Keep the pace under the
// documented 200 requests / 5 minutes limit.
async function steamApp(appId, attempt = 0) {
  const data = await getJson(
    `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us&l=english`
  );
  const app = data[String(appId)];
  if (!app?.success && attempt < 2) {
    await sleep(2500);
    return steamApp(appId, attempt + 1);
  }
  return app;
}

async function syncSteam(log) {
  const entries = Object.entries(storeIds.steam ?? {});
  const results = [];
  for (const [slug, info] of entries) {
    const app = await steamApp(info.id);
    if (!app?.success) {
      log.push(`${slug}: Steam app ${info.id} not available`);
      await sleep(800);
      continue;
    }
    const overview = app.data.price_overview;
    if (overview) {
      results.push({
        slug,
        platform: 'steam',
        value: normalise(overview.final / 100, overview.initial / 100),
        label: app.data.name,
      });
    } else if (app.data.is_free) {
      results.push({ slug, platform: 'steam', value: normalise(0, 0), label: app.data.name });
    } else {
      log.push(`${slug}: Steam app ${info.id} has no store price`);
    }
    await sleep(800);
  }
  return results;
}

// --- Nintendo ------------------------------------------------------------

async function syncNintendo(log) {
  const entries = Object.entries(storeIds['nintendo-switch'] ?? {});
  if (entries.length === 0) return [];
  const ids = entries.map(([, info]) => info.id);
  const data = await getJson(
    `https://api.ec.nintendo.com/v1/price?country=US&lang=en&ids=${ids.join(',')}`
  );
  const byId = new Map((data.prices ?? []).map((p) => [String(p.title_id), p]));

  const results = [];
  for (const [slug, info] of entries) {
    const price = byId.get(info.id);
    if (!price?.regular_price) {
      log.push(`${slug}: Nintendo product ${info.id} has no price`);
      continue;
    }
    const regular = Number(price.regular_price.raw_value);
    const sale = price.discount_price ? Number(price.discount_price.raw_value) : null;
    results.push({
      slug,
      platform: 'nintendo-switch',
      value: normalise(sale ?? regular, regular),
      label: price.regular_price.amount,
    });
  }
  return results;
}

// --- Xbox ----------------------------------------------------------------

// A product can carry several SKUs and availability variants (gift, region,
// entitlement). The real storefront price is the cheapest positive `ListPrice`
// on an availability that can be purchased.
function xboxPrice(product, { freeByCatalog = false } = {}) {
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
  if (!best) return freeByCatalog ? normalise(0, 0) : null;
  return normalise(best.list, Number.isFinite(best.msrp) ? best.msrp : best.list);
}

async function syncXbox(log) {
  const entries = Object.entries(storeIds.xbox ?? {});
  const results = [];
  for (const [slug, info] of entries) {
    const game = gameBySlug.get(slug);
    const freeByCatalog =
      game?.price_display === 'Free' || (game?.game_prices ?? []).some((p) => p.price === 0);
    try {
      const data = await getJson(
        `https://displaycatalog.mp.microsoft.com/v7.0/products/${info.id}?market=US&languages=en-us`
      );
      const value = xboxPrice(data.Product ?? {}, { freeByCatalog });
      if (!value) {
        log.push(`${slug}: Xbox product ${info.id} has no purchasable SKU`);
      } else {
        results.push({ slug, platform: 'xbox', value, label: info.title });
      }
    } catch (error) {
      log.push(`${slug}: Xbox lookup failed (${error.message})`);
    }
    await sleep(200);
  }
  return results;
}

// --- main ----------------------------------------------------------------

// A wildly different *regular* price means we probably matched a different SKU
// (a DLC, a remaster, a bundle) rather than that the game went on sale.
function suspicious(row, next) {
  const oldRegular = row.regular_price ?? row.price;
  if (oldRegular === null || oldRegular === 0 || next.regular_price === 0) return false;
  const regularRatio = next.regular_price / oldRegular;
  return regularRatio < 0.2 || regularRatio > 5;
}

(async () => {
  const log = [];
  const updates = [];
  let failedSources = 0;

  const sources = [
    ['steam', syncSteam],
    ['nintendo-switch', syncNintendo],
    ['xbox', syncXbox],
  ];

  for (const [name, source] of sources) {
    try {
      const results = await source(log);
      updates.push(...results);
      console.error(`[sync] ${name}: ${results.length} prices fetched`);
    } catch (error) {
      failedSources += 1;
      console.error(`[sync] ${name}: FAILED (${error.message})`);
    }
  }

  const applied = [];
  for (const update of updates) {
    if (!update.value) continue;
    const row = priceRow(update.slug, update.platform);
    if (!row) {
      log.push(`${update.slug}: no ${update.platform} row in the catalog`);
      continue;
    }
    if (suspicious(row, update.value)) {
      log.push(
        `${update.slug}: ${update.platform} jumped $${row.price} -> $${update.value.price}, skipped for review`
      );
      continue;
    }
    applied.push({ ...update, row });
  }

  const now = new Date().toISOString();
  if (!DRY_RUN) {
    for (const update of applied) {
      update.row.price = update.value.price;
      update.row.regular_price = update.value.regular_price;
      update.row.on_sale = update.value.on_sale;
      update.row.updated_at = now;
    }
    catalog.prices_updated_at = now;
    fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`);

    const lines = [
      '-- Generated by scripts/sync-prices.cjs. Do not edit by hand.',
      `-- Run at ${now}`,
      '-- D1 does not allow BEGIN/COMMIT in executed files.',
    ];
    for (const update of applied) {
      const { price, regular_price, on_sale } = update.value;
      lines.push(
        `UPDATE game_prices SET price = ${price}, regular_price = ${regular_price}, on_sale = ${
          on_sale ? 1 : 0
        }, currency = 'USD', updated_at = '${now}' WHERE id = '${update.row.id}';`
      );
    }
    lines.push(
      `INSERT INTO catalog_meta (key, value) VALUES ('prices_updated_at', '${now}') ON CONFLICT (key) DO UPDATE SET value = excluded.value;`
    );
    fs.writeFileSync(SQL_PATH, `${lines.join('\n')}\n`);
  }

  const byPlatform = {};
  for (const update of applied) byPlatform[update.platform] = (byPlatform[update.platform] ?? 0) + 1;

  console.log('');
  console.log(`Synced ${applied.length} prices at ${now}`);
  for (const [platform, count] of Object.entries(byPlatform)) {
    console.log(`  ${platform.padEnd(16)} ${count}`);
  }
  if (log.length) {
    console.log('\nSkipped:');
    for (const line of log) console.log(`  ${line}`);
  }

  if (DRY_RUN) {
    console.log('\nDry run: catalog.json and the SQL file were not written.');
    return;
  }

  if (APPLY) {
    console.log('\nApplying to Cloudflare D1...');
    // Run the project's wrangler directly (no shell) so this works the same on
    // Windows and CI, where `npx` is not always on PATH.
    const wranglerBin = path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
    const result = spawnSync(
      process.execPath,
      [wranglerBin, 'd1', 'execute', 'game-pedia', '--remote', '--file=db/prices-sync.sql'],
      { cwd: ROOT, stdio: 'inherit' }
    );
    if (result.error) console.error('[sync]', result.error.message);
    if (result.status !== 0) {
      console.error('[sync] D1 update failed');
      process.exit(1);
    }
    console.log('[sync] D1 updated');
  }

  if (applied.length === 0 && failedSources > 0) {
    console.error('[sync] No prices were updated and at least one source failed');
    process.exit(1);
  }
})().catch((error) => {
  console.error('[sync] fatal:', error);
  process.exit(1);
});
