// 24 hand-drawn SVG avatar IDs. Wire format stays a string so existing
// emoji-based player records still round-trip; the Avatar component handles
// the legacy emoji → id migration for rendering.

export const AVATARS: ReadonlyArray<string> = [
  "fox", "bear", "panda", "tiger", "lion", "frog", "monkey", "koala",
  "dog", "cat", "rabbit", "mouse", "hamster", "wolf", "raccoon", "unicorn",
  "turtle", "octopus", "owl", "giraffe", "whale", "dino", "trex", "dragon",
];

export function randomAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}
