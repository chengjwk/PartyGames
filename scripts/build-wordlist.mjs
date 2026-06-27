// Downloads dwyl/english-words and produces:
//   party/data/words.json    — all valid playable words (≥3 chars, ≤8 distinct letters, alphabetic only)
//   party/data/pangrams.json — 7-letter words with exactly 7 distinct letters (puzzle seeds)
//
// The 8-distinct cap is the ceiling because bee letters add a single extra
// letter to the 7-letter puzzle, so a super pangram is at most 8 distinct
// letters. Words above that could never be played, even with a bee.
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
    // 8 distinct = puzzle's 7 + one bee letter (a super pangram). Anything
    // above 8 still can't be played: more distinct letters than the board.
    if (distinct > 8) continue;
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
