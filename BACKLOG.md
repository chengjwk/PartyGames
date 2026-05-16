# PartyGames backlog

Things we discussed but parked. Revisit after playtest feedback.

## Pollinart — new game spec (third game)

Pictionary-meets-Telephone: each player starts with a word, draws it,
the drawing passes to the next player who guesses, the guess passes to
the next player who draws it, etc. Full circle ending on a guess.

**Locked v1 decisions**

- **Name.** Pollinart (Pollinate + art). Bee tie-in: a bee couriers
  the canvas/word between players as the inter-step transition. Lobby
  picker flower is a daisy (white + yellow center) to differentiate
  from WordHive/MathHive lilies.
- **Min players.** 3. Lobby "Start" gated on `players.size >= 3`.
- **Rounds.** 3 by default, configurable. Each round: every player
  starts a chain, all chains run in parallel.
- **Chain length.** Always full circle for v1 (max funny). Even N →
  length N (originator guesses their own chain at the end). Odd N →
  length N-1 (one "off" player per chain, rotate who's off across the
  N chains so participation evens out per round).
- **Timers.** Word-pick 10s (3 choices per player from current tier),
  Draw 45s, Guess 15s. Phase advances when all submit or timer fires.
- **Word pool.** Hand-curated tiered list shipped as
  `src/data/pollinart-words.ts`. Easy ~250 (everyday concrete nouns),
  Medium ~200 (compound nouns, actions, abstractions), Hard ~150
  (idioms, multi-word concepts, famous things). Complexity picker in
  lobby selects tier.
- **Drawing tools.** Pen with 3 widths, 8-color palette, eraser
  (paints transparent), undo (last 10 strokes), clear-all with
  confirm. No fill bucket, no shapes — keeps skill curve flat.
- **Wire format.** Strokes, not bitmaps:
  `type Stroke = { color: string; width: number; points: {x,y}[] }`.
  Coordinates normalized to 0..1000 so rendering is
  resolution-independent. Touch + pointer events both supported.
- **Scoring.** Pair-fidelity. At each guess step, judge guess vs
  *the word the drawer was given* (not the chain's original word).
  Match = drawer AND guesser both score.
  - Exact match (case-insensitive, trim, Levenshtein ≤ 2): +3 each,
    auto-awarded server-side.
  - Near miss: skipped in v1 — see v1.1 voting below.
  - Optional end-of-chain bonus: +5 to *everyone* in the chain if the
    final guess matches the chain's starting word.
- **Reveal.** All chains play back side-by-side at end of round,
  original → final, animated step-by-step. ❤️ / 🐝 reactions per
  drawing (purely cosmetic, no score impact). "Most-loved drawing"
  shown in final results.
- **Disconnect handling.** Player drops with unsubmitted step → server
  auto-submits empty drawing / empty guess for them, chain continues.

**Server architecture sketch**

New PartyKit room `pollinart`. State shape:

```
phase: LOBBY | WORD_PICK | DRAWING | GUESSING | REVEAL | ROUND_RESULTS | FINAL_RESULTS
round: number
config: { totalRounds, drawSec, guessSec, complexity, chainLengthCap? }
players: Map<id, { name, score, connected }>
roundOrder: playerId[]                       // shuffled per round
chains: Record<chainId, {
  startedBy: playerId
  startingWord: string
  steps: Array<DrawStep | GuessStep>
  playerSequence: playerId[]
}>
stepIndex: number
```

DO alarms drive phase timers (same pattern as MathHive). Drawings
persisted to DO storage so reconnects can replay the in-flight step.
Full per-round chain history kept in `roundArchive` for the reveal.

## Pollinart v1.1 — deferred features

- **Near-miss voting.** *Robin → bird → swallow* type chains hit a
  ton of fuzzy-not-exact guesses in mixed-age crowds. v1.1: when a
  guess doesn't pass the Levenshtein check, the word-giver (the
  player whose word was being drawn — they know what the answer
  should be) gets a yes/no judgment prompt. Yes = +1 each to drawer
  and guesser. Single-judge model avoids the "everyone votes on
  everything" overhead.
- **Chain length cap.** Optional config knob `chainLengthCap` to
  short-circuit the full circle (e.g. cap at 6 even in an 8-player
  lobby). Reveal stays funny but doesn't drag.
- **Reveal reaction summary.** Tally ❤️ / 🐝 reactions in final
  results. Surface "most-loved drawing of the night."

## MathHive v1.1 — deferred features

- **Bees occupying digits.** Server has the `state.bees` wire field for
  forward-compat but no spawning logic. Original spec was "start with
  occupy to limit scope" — bee lands on a pool digit, that digit is
  temporarily unavailable. The new bee-built-hive metaphor at the bottom
  of the screen makes this a natural fit.
- **Hard difficulty mode.** Picker UI reserves the slot but only shows
  Easy / Medium. Hard = Medium operators + target auto-rerolls every
  3s if not solved. Adds time pressure as a difficulty axis.
- **Competitive shared-target mode.** Currently every player has their
  own target stream (relaxed). Competitive = everyone races the same
  target, first-solver gets full points, late solvers get diminishing
  returns. We agreed we'd want both modes eventually.

## Mechanics we explicitly said "later"

- **Skipped-question resurfacing.** Skip costs −1 and target is gone
  forever. Possible v2 — skipped targets re-surface near the end of the
  round at half points as a "second chance."
- **More bee variants.** Beyond "occupy" — bees that *steal* a digit
  (carry it offscreen for N seconds) and bees that act as *bonus
  multipliers* (using their digit doubles points). Roll out in stages.

## Polish / tuning to validate during playtest

- **All-six grace window.** Auto-submit fires the instant a tile equals
  the target, which can lock in a non-all-six solve before the player
  realizes they were close to chaining all six. Options:
  - Add a "1s grace window before auto-submit" with a cancel button, or
  - Defer auto-submit if all-six is still reachable from the current state.
- **Lily petal color tuning.** Current `#f7c850` (yellow) feels fine to
  me but is a guess; if it reads too saturated try `#fad067` or
  `#f0c14b`.
- **BuiltHive procession speed.** `WORKER_DURATION_MS = 1500ms` and
  `WORKER_STAGGER_MS = 240ms`. For 5-6 digit solves that's ~2.5–3s
  total — might feel slow. If so, drop stagger to ~150ms and/or
  duration to ~1100ms.

## Housekeeping

- **Refactor `FullscreenButton` + `ThemeToggle` into a top-right
  toolbar.** Currently `ThemeToggle` uses `right: 156` — a magic number
  tied to the FS button's label width. A flexbox toolbar would absorb
  width changes automatically.
- **Theme toggle in in-game screens.** Currently only in Home, lobby
  phone, lobby TV. If someone realizes mid-game they want to switch,
  they have to back out. Worth adding if it comes up.
