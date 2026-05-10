// Hits the Free Dictionary API for every entry in party/data/pangrams.json
// and writes:
//   party/data/pangrams.json     — words that have a definition (overwrites)
//   party/data/pangram-defs.json — { word: definition } so the server can
//                                  pre-populate its cache and avoid runtime
//                                  fetches for the puzzle's seed pangram.
//
// Resumable via party/data/pangram-defs.partial.json.
// Usage: node scripts/filter-pangrams.mjs

import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DATA_DIR = fileURLToPath(new URL("../party/data/", import.meta.url));
const SOURCE_BACKUP = `${DATA_DIR}pangrams-source.json`; // unfiltered seed list
const SOURCE = `${DATA_DIR}pangrams.json`;
const OUT_DEFS = `${DATA_DIR}pangram-defs.json`;
const PROGRESS = `${DATA_DIR}pangram-defs.partial.json`;

// Conservative settings — Free Dictionary API rate-limits aggressive use.
const CONCURRENCY = 4;
const MAX_RETRIES = 4;
const TIMEOUT_MS = 8000;
const RETRY_BASE_MS = 800; // exponential: 800, 1600, 3200, 6400

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Returns string (def), null (confirmed no entry), or "RETRY" (transient error).
async function fetchOnce(word) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: ctrl.signal },
    );
    if (res.status === 404) return null; // genuinely no entry
    if (!res.ok) return "RETRY"; // 429, 5xx, etc
    const data = await res.json();
    const meaning = data?.[0]?.meanings?.[0];
    const def = meaning?.definitions?.[0]?.definition;
    if (!def) return null;
    return meaning?.partOfSpeech ? `(${meaning.partOfSpeech}) ${def}` : def;
  } catch {
    return "RETRY";
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDef(word) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const result = await fetchOnce(word);
    if (result !== "RETRY") return result;
    await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
  }
  return null; // give up after retries
}

async function main() {
  // Keep an unfiltered backup once, so re-runs don't lose the source.
  if (!existsSync(SOURCE_BACKUP)) {
    const src = JSON.parse(readFileSync(SOURCE, "utf8"));
    if (src.length > 1000) {
      // looks unfiltered — back it up
      writeFileSync(SOURCE_BACKUP, JSON.stringify(src));
      console.log(`Backed up source to ${SOURCE_BACKUP} (${src.length} words)`);
    }
  }
  const allWords = JSON.parse(readFileSync(SOURCE_BACKUP, "utf8"));
  console.log(`Source: ${allWords.length} pangrams to check`);

  const defs = existsSync(PROGRESS) ? JSON.parse(readFileSync(PROGRESS, "utf8")) : {};
  // Re-check anything previously marked null — last run had bogus rate-limit nulls.
  const remaining = allWords.filter((w) => !(w in defs) || defs[w] === "BOGUS");
  console.log(`Already done: ${Object.keys(defs).length}, remaining: ${remaining.length}`);

  let scanned = 0;
  const start = Date.now();
  const flushEvery = 200;

  const queue = remaining.slice();
  async function worker() {
    while (queue.length) {
      const w = queue.shift();
      if (!w) return;
      const def = await fetchDef(w);
      defs[w] = def;
      scanned++;
      if (scanned % flushEvery === 0) {
        writeFileSync(PROGRESS, JSON.stringify(defs));
        const rate = scanned / ((Date.now() - start) / 1000);
        const eta = Math.round(queue.length / rate);
        const yes = Object.values(defs).filter((v) => v !== null).length;
        console.log(`progress: ${scanned}/${remaining.length}  (~${rate.toFixed(1)}/s, ETA ${Math.floor(eta / 60)}m${eta % 60}s, kept ${yes})`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const defined = Object.entries(defs).filter(([, d]) => d !== null);
  const wordsKept = defined.map(([w]) => w).sort();
  const defsKept = Object.fromEntries(defined);

  writeFileSync(SOURCE, JSON.stringify(wordsKept));
  writeFileSync(OUT_DEFS, JSON.stringify(defsKept));
  if (existsSync(PROGRESS)) unlinkSync(PROGRESS);

  console.log(`\nKept ${wordsKept.length} of ${allWords.length} pangrams (${Math.round((wordsKept.length / allWords.length) * 100)}%)`);
  console.log(`Wrote ${SOURCE}`);
  console.log(`Wrote ${OUT_DEFS}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
