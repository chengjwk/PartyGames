// Downloads dwyl/english-words and produces:
//   party/data/words.json    — all valid playable words (≥3 chars, ≤7 distinct letters, alphabetic only)
//   party/data/pangrams.json — 7-letter words with exactly 7 distinct letters (puzzle seeds)
//
// Run with: node scripts/build-wordlist.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt";
const OUT_DIR = fileURLToPath(new URL("../party/data/", import.meta.url));

async function main() {
  console.log(`Fetching ${SOURCE}…`);
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();

  const words = new Set();
  const pangrams = [];
  let scanned = 0;

  for (const raw of text.split(/\r?\n/)) {
    const w = raw.trim().toLowerCase();
    if (!w) continue;
    scanned++;
    if (w.length < 3) continue;
    if (!/^[a-z]+$/.test(w)) continue;
    const distinct = new Set(w).size;
    if (distinct > 7) continue; // could never appear in any 7-letter puzzle
    words.add(w);
    if (w.length === 7 && distinct === 7) pangrams.push(w);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}words.json`, JSON.stringify([...words]));
  writeFileSync(`${OUT_DIR}pangrams.json`, JSON.stringify(pangrams));

  console.log(`Scanned ${scanned} entries`);
  console.log(`Kept ${words.size} playable words, ${pangrams.length} pangrams`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
