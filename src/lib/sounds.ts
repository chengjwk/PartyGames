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
  // Pangram fanfare — louder, two-octave triumphal arpeggio.
  pangram() {
    const g = 0.26;
    tone(523, 130, { gain: g }); // C5
    tone(659, 130, { delayMs: 110, gain: g }); // E5
    tone(784, 160, { delayMs: 220, gain: g }); // G5
    tone(1046, 200, { delayMs: 320, gain: g + 0.04 }); // C6
    tone(784, 120, { delayMs: 460, gain: g - 0.04 }); // G5
    tone(1046, 280, { delayMs: 560, gain: g + 0.06 }); // C6
    tone(1318, 360, { delayMs: 700, gain: g + 0.04, type: "triangle" }); // E6 — sparkle
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
  // Tick for countdown moments — bumped up so it carries across the room.
  tick() {
    tone(880, 70, { gain: 0.22 });
  },
  // Final tick (last second / GO moment) — higher and louder still.
  tickFinal() {
    tone(1046, 90, { gain: 0.32 });
  },
  // Played once when a round actually starts (after countdown).
  roundStart() {
    tone(523, 100);
    tone(659, 100, { delayMs: 90 });
    tone(784, 220, { delayMs: 180 });
  },
  // Big celebratory fanfare for the winner reveal at the end of a game.
  fanfare() {
    const g = 0.3;
    // Triumphal triad → two-octave run → sustain
    tone(392, 200, { gain: g, type: "triangle" }); // G4
    tone(523, 200, { delayMs: 160, gain: g, type: "triangle" }); // C5
    tone(659, 200, { delayMs: 320, gain: g, type: "triangle" }); // E5
    tone(784, 280, { delayMs: 480, gain: g + 0.04, type: "triangle" }); // G5
    tone(1046, 380, { delayMs: 720, gain: g + 0.06, type: "triangle" }); // C6
    // sparkle layer
    tone(2093, 200, { delayMs: 720, gain: 0.08 }); // C7
    tone(2637, 320, { delayMs: 880, gain: 0.08 }); // E7
  },
};
