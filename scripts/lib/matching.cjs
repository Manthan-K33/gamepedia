// Title matching helpers shared by the store-ID resolver and the price sync.
// Store search endpoints are fuzzy, so every candidate is scored against the
// catalog title and low-confidence matches are rejected instead of guessed.

const NOISE =
  /\b(dlc|soundtrack|ost|bundle|upgrade|expansion|season pass|pass|skin|currency|points|bonus content|artbook|demo|trial|avatar|theme|costume|add-on|addon|starter pack|deluxe edition upgrade|friend s pass)\b/i;

// Edition and platform suffixes do not change which game a listing is for, but
// they do make simple string comparison fail ("DOOM Eternal" vs "DOOM Eternal
// Standard Edition"). Strip them before scoring.
const EDITION_NOISE =
  /\b(standard|deluxe|ultimate|definitive|gold|complete|enhanced|digital|premium|legendary|game of the year|goty|remastered|remake)\s+edition\b|\bremastered\b|\bpc\b|\bwindows\b|\bxbox one\b|\bxbox series x s\b|\bps4\b|\bps5\b|\bnintendo switch\b/g;

function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(EDITION_NOISE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value) {
  return new Set(normalize(value).split(' ').filter(Boolean));
}

function jaccard(a, b) {
  const setA = tokens(a);
  const setB = tokens(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared += 1;
  return shared / (setA.size + setB.size - shared);
}

// Exact match after normalizing edition/platform suffixes wins. Anything else
// must share almost every word, which rejects spin-offs, sequels and DLC.
function score(title, candidate) {
  const a = normalize(title);
  const b = normalize(candidate);
  if (!a || !b) return 0;
  if (a === b) return 1;
  return jaccard(a, b);
}

/**
 * Pick the best candidate for `title`.
 * `nameOf` extracts the display name from a candidate object.
 * Returns null when nothing reaches `threshold`.
 */
function pickBest(title, candidates, { nameOf = (c) => c.name, threshold = 0.9 } = {}) {
  const editionRank = (name) => {
    const lower = name.toLowerCase();
    if (/\bstandard edition\b/.test(lower)) return 1;
    if (/\bedition\b/.test(lower)) return 2;
    return 0;
  };

  let best = null;
  for (const candidate of candidates) {
    const name = nameOf(candidate);
    if (!name || NOISE.test(name)) continue;
    const value = score(title, name);
    // Ties go to the plainest title: "Forza Horizon 5" beats "Standard
    // Edition", which beats "Deluxe Edition" and "Premium Edition".
    const rank = editionRank(name);
    const length = name.length;
    if (
      !best ||
      value > best.score ||
      (value === best.score && rank < best.rank) ||
      (value === best.score && rank === best.rank && length < best.length)
    ) {
      best = { candidate, name, score: value, rank, length };
    }
  }
  if (!best || best.score < threshold) return null;
  return best;
}

module.exports = { normalize, score, pickBest, NOISE };
