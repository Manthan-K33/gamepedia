// Exports the current catalog from Supabase into src/data/catalog.json so the
// site ships with its own data and does not depend on a live database.
//
//   npm run data:export
//
// Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env (same values the
// app used before). The anon key is public and read-only under RLS.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

async function loadEnv() {
  const env = { ...process.env };
  try {
    const raw = (await readFile(join(root, '.env'), 'utf8')).replace(/^\uFEFF/, '');
    for (const line of raw.split(/\r?\n/)) {
      const i = line.indexOf('=');
      if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  } catch {
    // .env is optional when the variables come from the shell.
  }
  return env;
}

const env = await loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function get(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers });
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

const [games, platforms] = await Promise.all([
  get(
    'games?select=*,game_prices(id,platform_id,price,regular_price,currency,store_url,on_sale,platforms(id,name,slug,color))&order=title'
  ),
  get('platforms?select=id,name,slug,color&order=id'),
]);

if (!Array.isArray(games) || games.length === 0) {
  throw new Error('Refusing to write an empty catalog');
}

const catalog = {
  generated_at: new Date().toISOString(),
  source: new URL(url).host,
  games,
  platforms,
};

const outDir = join(root, 'src', 'data');
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');

const prices = games.reduce((n, g) => n + (g.game_prices?.length ?? 0), 0);
console.log(
  `Wrote src/data/catalog.json: ${games.length} games, ${prices} prices, ${platforms.length} platforms`
);
