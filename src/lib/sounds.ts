// Tiny WebAudio cues. No asset files — synthesized tones.
// First call must be inside a user gesture (browser autoplay policy);
// we lazy-init the AudioContext on first play.

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    try {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    } catch {
      return null;
    }
  }
  return ctx;
}

function tone(freq: number, durationMs: number, opts: { gain?: number; type?: OscillatorType; delayMs?: number } = {}) {
  const c = getCtx();
  if (!c) return;
  const start = c.currentTime + (opts.delayMs ?? 0) / 1000;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.value = freq;
  g.gain.value = 0;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(opts.gain ?? 0.18, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + durationMs / 1000 + 0.05);
}

export const sounds = {
  setMuted(m: boolean) {
    muted = m;
  },
  isMuted() {
    return muted;
  },
  // Soft major-third "ding" for valid words.
  good() {
    tone(660, 110);
    tone(880, 140, { delayMs: 60 });
  },
  // Major triad arpeggio for pangrams — bigger reward.
  pangram() {
    tone(523, 120); // C5
    tone(659, 120, { delayMs: 100 }); // E5
    tone(784, 180, { delayMs: 200 }); // G5
    tone(1046, 240, { delayMs: 320 }); // C6
  },
  // Low minor-second "buzz" for invalid words.
  bad() {
    tone(180, 140, { gain: 0.12, type: "square" });
  },
  // Round-end chime — descending three-note resolve
  roundEnd() {
    tone(659, 180); // E5
    tone(523, 200, { delayMs: 160 }); // C5
    tone(392, 320, { delayMs: 340 }); // G4
  },
  // Soft tick for the last few seconds of a round
  tick() {
    tone(880, 60, { gain: 0.08 });
  },
  // Final tick (last second) — slightly higher and louder than tick
  tickFinal() {
    tone(1046, 80, { gain: 0.14 });
  },
  // Played once when a round actually starts (after countdown)
  roundStart() {
    tone(523, 100);
    tone(659, 100, { delayMs: 90 });
    tone(784, 220, { delayMs: 180 });
  },
};
