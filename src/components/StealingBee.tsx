// Bee that "steals" a drawing across the screen during Pollinart
// reveal — visual shorthand for "the bee just carried this drawing
// from the previous player to the next." Mounted as a fixed overlay
// (pointer-events: none, so it doesn't block taps), animates a single
// pass left-to-right, then unmounts via the onDone callback.
//
// Trigger: when the host advances reveal and a new (draw, guess) pair
// becomes visible — see ChainPlayback / BigChainPlayback for usage.

import { useEffect } from "react";
import type { Drawing } from "../shared/pollinart-types";
import DrawingReplay from "./DrawingReplay";
import { sounds } from "../lib/sounds";

interface StealingBeeProps {
  drawing: Drawing;
  // Pixel size of the carried drawing thumbnail. Defaults to a
  // phone-friendly 56; bump up for the TV.
  thumbSize?: number;
  // Fires once the animation completes so the caller can unmount.
  onDone: () => void;
}

const DURATION_MS = 1600;

export default function StealingBee({
  drawing,
  thumbSize = 56,
  onDone,
}: StealingBeeProps) {
  useEffect(() => {
    // Audio cue — buzz once on arrival. Plays through the shared
    // sounds module; no-op when the audio context is suspended.
    sounds.beeIn();
    const t = setTimeout(onDone, DURATION_MS);
    return () => clearTimeout(t);
    // onDone is captured at mount intentionally — caller should
    // pass a stable ref or rely on the key to remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bee + drawing fly together along a gentle arc from off-screen
  // right to off-screen left, with the bee bobbing vertically. The
  // wing flap is its own quick keyframe so the bee looks alive even
  // mid-translate.
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 70,
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes steal-bee-fly {
          0%   { transform: translate(110vw, 40vh) rotate(4deg); }
          25%  { transform: translate(72vw, 28vh) rotate(-3deg); }
          50%  { transform: translate(48vw, 44vh) rotate(2deg); }
          75%  { transform: translate(24vw, 30vh) rotate(-4deg); }
          100% { transform: translate(-30vw, 42vh) rotate(2deg); }
        }
        @keyframes steal-bee-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
        @keyframes steal-bee-wings {
          0%, 100% { transform: scaleY(1); }
          50%      { transform: scaleY(0.35); }
        }
        @keyframes steal-thumb-sway {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50%      { transform: translateY(2px) rotate(2deg); }
        }
      `}</style>
      {/* Outer transform: the big screen-crossing flight path. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          animation: `steal-bee-fly ${DURATION_MS}ms ease-in-out forwards`,
        }}
      >
        {/* Inner transform: gentle bob layered onto the flight. */}
        <div
          style={{
            animation: "steal-bee-bob 0.6s ease-in-out infinite",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            // Drop shadow to lift bee + drawing off the underlying UI.
            filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.28))",
          }}
        >
          <BeeSvg />
          {/* The "stolen" drawing — swings slightly under the bee. */}
          <div
            style={{
              marginTop: -6,
              animation: "steal-thumb-sway 0.9s ease-in-out infinite",
              transformOrigin: "top center",
            }}
          >
            {/* Tiny stem connecting bee to drawing */}
            <div
              style={{
                width: 2,
                height: 6,
                background: "rgba(60, 40, 20, 0.55)",
                margin: "0 auto",
              }}
            />
            <div
              style={{
                background: "white",
                padding: 3,
                borderRadius: 4,
                border: "1px solid rgba(60,40,20,0.4)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
              }}
            >
              <DrawingReplay drawing={drawing} size={thumbSize} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact 60×40 bee — yellow body, black stripes, two flapping wings,
// shaded a touch darker than the BuiltHive bee so it reads on a
// bright reveal card background. Drawn as inline SVG so the whole
// flight rig is one DOM subtree without an extra image asset.
function BeeSvg() {
  return (
    <svg width="60" height="40" viewBox="-30 -20 60 40">
      {/* Wings — animate scaleY only so they "flap". */}
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          animation: "steal-bee-wings 0.11s linear infinite",
        }}
      >
        <ellipse cx={-4} cy={-9} rx={7} ry={4} fill="#fbfbf2" opacity={0.85} />
        <ellipse cx={4} cy={-9} rx={7} ry={4} fill="#fbfbf2" opacity={0.85} />
      </g>
      {/* Body */}
      <ellipse cx={0} cy={0} rx={13} ry={9} fill="#f5d040" stroke="#3a2a14" strokeWidth={1.2} />
      {/* Stripes */}
      <rect x={-8} y={-7} width={4} height={14} fill="#3a2a14" />
      <rect x={0} y={-7} width={4} height={14} fill="#3a2a14" />
      {/* Eye + smile so the bee feels mischievous. */}
      <circle cx={-9} cy={-1.5} r={1.6} fill="#1a1a1f" />
      <path d="M -11 2 Q -9 4 -7 2" stroke="#1a1a1f" strokeWidth={1} fill="none" strokeLinecap="round" />
      {/* Stinger tail. */}
      <path d="M 13 0 L 17 -1 L 17 1 Z" fill="#3a2a14" />
    </svg>
  );
}
