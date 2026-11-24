// Applies the SQL files in db/migrations that have not run yet.
//
//   node scripts/migrate.cjs           # remote D1
//   node scripts/migrate.cjs --local   # local D1 (wrangler pages dev)
//
// Each migration is checked against the live table definition first, so running
// the command twice is safe: SQLite has no `ALTER TABLE ... ADD COLUMN IF NOT
// EXISTS`.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const MIGRATIONS = path.join(ROOT, 'db', 'migrations');
const LOCAL = process.argv.includes('--local');
const WRANGLER = path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

function wrangler(args, { capture = false } = {}) {
  return spawnSync(process.execPath, [WRANGLER, ...args], {
    cwd: ROOT,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
  });
}

function columnsFor(table) {
  const result = wrangler(
    [
      'd1',
      'execute',
      'game-pedia',
      ...(LOCAL ? ['--local'] : ['--remote']),
      '--command',
      `PRAGMA table_info(${table})`,
      '--json',
    ],
    { capture: true }
  );
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `Could not read ${table} schema`);
  }
  // wrangler prints a JSON array; keep only the JSON if it prepends logs.
  const start = result.stdout.indexOf('[');
  const payload = JSON.parse(result.stdout.slice(start));
  const rows = payload.flatMap((entry) => entry.results ?? []);
  return new Set(rows.map((row) => row.name));
}

const files = fs
  .readdirSync(MIGRATIONS)
  .filter((file) => file.endsWith('.sql'))
  .sort();

const known = new Map();
let applied = 0;
let skipped = 0;

for (const file of files) {
  const sql = fs.readFileSync(path.join(MIGRATIONS, file), 'utf8');
  const alter = sql.match(/ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/i);
  if (alter) {
    const [, table, column] = alter;
    if (!known.has(table)) known.set(table, columnsFor(table));
    if (known.get(table).has(column)) {
      console.log(`skip  ${file} (${table}.${column} already exists)`);
      skipped += 1;
      continue;
    }
  }

  console.log(`apply ${file}`);
  const result = wrangler([
    'd1',
    'execute',
    'game-pedia',
    ...(LOCAL ? ['--local'] : ['--remote']),
    `--file=${path.join('db', 'migrations', file)}`,
  ]);
  if (result.status !== 0) process.exit(result.status ?? 1);
  applied += 1;
}

console.log(`\n${applied} migration(s) applied, ${skipped} already in place.`);
