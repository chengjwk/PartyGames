// 24 hand-drawn SVG avatar IDs. Wire format stays a string so existing
// emoji-based player records still round-trip; the Avatar component handles
// the legacy emoji → id migration for rendering.

// 20 avatars: 12 real animals + 8 fantasy creatures. Layout in the picker
// is 5 rows of 4. Order chosen to alternate real/fantasy roughly.
export const AVATARS: ReadonlyArray<string> = [
  "fox", "bear", "panda", "tiger",
  "lion", "frog", "koala", "cat",
  "rabbit", "owl", "octopus", "whale",
  "dragon", "unicorn", "phoenix", "yeti",
  "slime", "ghost", "nessie", "cyclops",
];

export function randomAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}
