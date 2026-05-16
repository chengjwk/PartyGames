# PartyGames backlog

Things we discussed but parked. Revisit after playtest feedback.

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

- **`tsconfig.tsbuildinfo` should be in `.gitignore`.** It's a TS
  incremental build cache; shows up as untracked after every build.
- **Refactor `FullscreenButton` + `ThemeToggle` into a top-right
  toolbar.** Currently `ThemeToggle` uses `right: 156` — a magic number
  tied to the FS button's label width. A flexbox toolbar would absorb
  width changes automatically.
- **Theme toggle in in-game screens.** Currently only in Home, lobby
  phone, lobby TV. If someone realizes mid-game they want to switch,
  they have to back out. Worth adding if it comes up.
