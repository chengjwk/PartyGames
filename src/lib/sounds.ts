// Tiny WebAudio cues. No asset files — synthesized tones.
//
// Browsers block AudioContext until a user gesture. State changes from the
// realtime server arrive without any gesture, so a fanfare triggered by a
// phase transition would be silent. We register a one-shot gesture listener
// at module load that resumes (and lazy-creates) the context on the first
// click/keypress/touch — after that, all sound calls play normally.

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

if (typeof window !== "undefined") {
  const unlock = () => {
    const c = getCtx();
    if (c && c.state === "suspended") {
      c.resume().catch(() => {});
    }
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: false });
  window.addEventListener("keydown", unlock, { once: false });
  window.addEventListener("touchstart", unlock, { once: false });
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

// Buzzing sound: sawtooth with frequency sweep + LFO vibrato.
// Mimics a wing-flap (real bees buzz around 200Hz).
function buzz(opts: {
  startFreq: number;
  midFreq?: number;
  endFreq: number;
  durationMs: number;
  gain?: number;
  vibratoHz?: number; // wingbeat frequency
  vibratoDepth?: number; // ± Hz around the carrier
}) {
  const c = getCtx();
  if (!c) return;
  const start = c.currentTime;
  const dur = opts.durationMs / 1000;
  const peak = opts.gain ?? 0.08;

  const osc = c.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(opts.startFreq, start);
  if (opts.midFreq !== undefined) {
    osc.frequency.linearRampToValueAtTime(opts.midFreq, start + dur * 0.6);
    osc.frequency.linearRampToValueAtTime(opts.endFreq, start + dur);
  } else {
    osc.frequency.linearRampToValueAtTime(opts.endFreq, start + dur);
  }

  const g = c.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(peak, start + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = opts.vibratoHz ?? 18;
  lfoGain.gain.value = opts.vibratoDepth ?? 20;
  lfo.connect(lfoGain).connect(osc.frequency);

  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
  lfo.start(start);
  lfo.stop(start + dur + 0.05);
}

export const sounds = {
  setMuted(m: boolean) {
    muted = m;
  },
  isMuted() {
    return muted;
  },
  // "running" once unlocked; "suspended" until a user gesture happens on this
  // tab. Host TVs commonly never get a gesture (host clicks Start from their
  // phone), so the UI shows a prompt until this flips to "running".
  audioState(): AudioContextState | "no-context" {
    return ctx ? ctx.state : "no-context";
  },
  // Must be called inside a user-gesture handler. Lazy-creates the context if
  // needed and resumes it. Resolves to true when the context is running.
  async tryUnlock(): Promise<boolean> {
    const c = getCtx();
    if (!c) return false;
    if (c.state === "running") return true;
    try {
      await c.resume();
    } catch {
      // ignore
    }
    // Cast: TS narrows AudioContextState after `await resume()` in a way that
    // excludes "running", but in practice that's exactly what we're testing.
    return (c.state as string) === "running";
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
  // Worker bee buzzing in to land on a hex.
  beeIn() {
    buzz({ startFreq: 140, midFreq: 250, endFreq: 210, durationMs: 360, gain: 0.09 });
  },
  // Bee flying off — descending pitch.
  beeOut() {
    buzz({ startFreq: 220, endFreq: 70, durationMs: 420, gain: 0.06 });
  },
  // Queen makes an entrance: low buzz + brass triad + sparkle.
  queenIn() {
    // Heavy low buzz (big bee)
    buzz({
      startFreq: 70,
      midFreq: 130,
      endFreq: 100,
      durationMs: 600,
      gain: 0.1,
      vibratoHz: 14,
      vibratoDepth: 35,
    });
    // Royal triad + sparkle layered on top
    const g = 0.18;
    tone(196, 280, { gain: g, type: "triangle", delayMs: 80 }); // G3
    tone(294, 280, { gain: g, type: "triangle", delayMs: 80 }); // D4
    tone(392, 380, { gain: g + 0.04, type: "triangle", delayMs: 240 }); // G4
    tone(880, 260, { gain: 0.12, delayMs: 360 }); // A5
    tone(1175, 320, { gain: 0.12, delayMs: 460 }); // D6
  },
  // Subtle "freeze" cue when the game pauses (downward slide).
  pauseDown() {
    tone(660, 100, { gain: 0.12, type: "triangle" });
    tone(440, 220, { gain: 0.1, type: "triangle", delayMs: 80 });
  },
  // "Unfreeze" cue when the game resumes (upward slide).
  pauseUp() {
    tone(440, 100, { gain: 0.1, type: "triangle" });
    tone(660, 220, { gain: 0.12, type: "triangle", delayMs: 80 });
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
