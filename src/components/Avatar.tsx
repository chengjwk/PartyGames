// 20 storybook-illustrated SVG avatars: 12 real animals + 8 fantasy creatures.
// Style D from the comparison page — gradients, drawn texture lines, layered
// shading, eye depth.
//
// Wire format stays a string id like "fox" / "dragon". Old emoji avatars and
// retired ids are migrated below so existing rooms keep working.

import type { ComponentType, SVGProps } from "react";

export interface AvatarProps {
  id: string;
  size?: number;
  bg?: boolean;
}

// Old emoji avatars and id renames map onto the closest current animal.
const LEGACY_MAP: Record<string, string> = {
  // emoji
  "🦊": "fox", "🐻": "bear", "🐼": "panda", "🐯": "tiger", "🦁": "lion",
  "🐸": "frog", "🐵": "bear", "🐨": "koala", "🐶": "fox", "🐱": "cat",
  "🐰": "rabbit", "🐭": "rabbit", "🐹": "rabbit", "🐺": "fox", "🦝": "bear",
  "🦄": "unicorn", "🐢": "frog", "🐙": "octopus", "🦉": "owl", "🦒": "lion",
  "🐳": "whale", "🦕": "dragon", "🦖": "dragon", "🐉": "dragon",
  // retired ids
  monkey: "bear", dog: "fox", mouse: "rabbit", hamster: "rabbit",
  wolf: "fox", raccoon: "bear", turtle: "frog", giraffe: "lion",
  dino: "dragon", trex: "dragon",
};

export default function Avatar({ id, size, bg = true }: AvatarProps) {
  const resolved = AVATAR_MAP[id] ? id : (LEGACY_MAP[id] ?? "fox");
  const Svg = AVATAR_MAP[resolved] ?? Fox;
  const fixed = typeof size === "number";
  return (
    <div
      style={{
        width: fixed ? size : "100%",
        height: fixed ? size : "100%",
        background: bg ? "#2a2a32" : "transparent",
        borderRadius: bg ? (fixed ? size * 0.18 : "18%") : 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <Svg style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

type SvgComp = ComponentType<SVGProps<SVGSVGElement>>;
const VB = "0 0 200 200";

// ───────────────── 1. Fox + party hat ─────────────────
const Fox: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="fox-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d8651e" /><stop offset="100%" stopColor="#e8843e" />
      </linearGradient>
      <linearGradient id="fox-belly" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fff5ea" /><stop offset="100%" stopColor="#f0d8b8" />
      </linearGradient>
    </defs>
    <circle cx="100" cy="22" r="9" fill="#ffd9e2" />
    <path d="M70 64 L100 28 L130 64 Z" fill="#4cc9f0" />
    <path d="M73 60 L100 30 L100 60 Z" fill="#3aa9d6" />
    <circle cx="92" cy="50" r="3.6" fill="#ffe066" /><circle cx="108" cy="55" r="3" fill="#ffe066" />
    <ellipse cx="100" cy="65" rx="36" ry="5" fill="#3aa9d6" />
    <path d="M60 100 L48 58 L82 82 Z" fill="#b85016" /><path d="M140 100 L152 58 L118 82 Z" fill="#b85016" />
    <path d="M65 92 L56 66 L76 82 Z" fill="#f5c8a8" /><path d="M135 92 L144 66 L124 82 Z" fill="#f5c8a8" />
    <ellipse cx="100" cy="124" rx="52" ry="48" fill="url(#fox-body)" />
    <ellipse cx="100" cy="160" rx="38" ry="12" fill="#a04510" opacity="0.3" />
    <ellipse cx="100" cy="140" rx="40" ry="30" fill="url(#fox-belly)" />
    <path d="M85 88 Q100 78 115 88 L113 102 Q100 96 87 102 Z" fill="#fff5ea" />
    <g stroke="#a04510" strokeWidth="1.4" fill="none" strokeLinecap="round">
      <path d="M58 130 q4 -3 8 0" /><path d="M62 142 q4 -3 8 0" />
      <path d="M134 130 q4 -3 8 0" /><path d="M138 142 q4 -3 8 0" />
    </g>
    <path d="M62 108 Q80 100 96 108 Q120 100 138 108" stroke="#a04510" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <ellipse cx="80" cy="118" rx="7" ry="8.5" fill="#1a1a1f" />
    <ellipse cx="120" cy="118" rx="7" ry="8.5" fill="#1a1a1f" />
    <circle cx="82" cy="115" r="2.4" fill="#fff" /><circle cx="122" cy="115" r="2.4" fill="#fff" />
    <ellipse cx="68" cy="142" rx="7" ry="4" fill="#f5b8c5" opacity="0.55" /><ellipse cx="132" cy="142" rx="7" ry="4" fill="#f5b8c5" opacity="0.55" />
    <path d="M92 134 Q100 138 108 134 Q106 144 100 146 Q94 144 92 134 Z" fill="#1a1a1f" />
    <path d="M86 152 Q100 164 114 152" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

// ───────────────── 2. Bear + bowtie ─────────────────
const Bear: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="bear-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7a4d23" /><stop offset="100%" stopColor="#9d6432" />
      </linearGradient>
    </defs>
    <circle cx="55" cy="60" r="20" fill="#7a4d23" /><circle cx="145" cy="60" r="20" fill="#7a4d23" />
    <circle cx="55" cy="62" r="10" fill="#d4a980" /><circle cx="145" cy="62" r="10" fill="#d4a980" />
    <circle cx="100" cy="105" r="60" fill="url(#bear-body)" />
    <ellipse cx="100" cy="138" rx="40" ry="14" fill="#5a3818" opacity="0.35" />
    <ellipse cx="100" cy="125" rx="36" ry="28" fill="#d4a980" />
    <g stroke="#5a3818" strokeWidth="1.3" fill="none" strokeLinecap="round">
      <path d="M55 94 q3 -3 6 0" /><path d="M145 94 q3 -3 6 0" />
      <path d="M68 132 q3 -3 6 0" /><path d="M126 132 q3 -3 6 0" />
    </g>
    <ellipse cx="80" cy="100" rx="6" ry="7.5" fill="#1a1a1f" />
    <ellipse cx="120" cy="100" rx="6" ry="7.5" fill="#1a1a1f" />
    <circle cx="82" cy="97" r="2" fill="#fff" /><circle cx="122" cy="97" r="2" fill="#fff" />
    <ellipse cx="68" cy="128" rx="6" ry="3" fill="#c98060" opacity="0.5" /><ellipse cx="132" cy="128" rx="6" ry="3" fill="#c98060" opacity="0.5" />
    <ellipse cx="100" cy="120" rx="7" ry="4" fill="#1a1a1f" />
    <path d="M100 124 L100 132" stroke="#1a1a1f" strokeWidth="2" />
    <path d="M88 138 Q100 146 112 138" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M100 178 L78 168 L78 188 Z" fill="#d62828" /><path d="M100 178 L122 168 L122 188 Z" fill="#d62828" />
    <path d="M78 168 L78 188 L82 178 Z" fill="#9b1c1c" /><path d="M122 168 L122 188 L118 178 Z" fill="#9b1c1c" />
    <circle cx="100" cy="178" r="6" fill="#9b1c1c" />
    <circle cx="100" cy="178" r="2.5" fill="#7a1010" />
  </svg>
);

// ───────────────── 3. Panda + sunglasses ─────────────────
const Panda: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="panda-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#dcdcdc" /><stop offset="100%" stopColor="#f5f5f5" />
      </linearGradient>
    </defs>
    <circle cx="55" cy="60" r="20" fill="#1a1a1f" /><circle cx="145" cy="60" r="20" fill="#1a1a1f" />
    <circle cx="55" cy="62" r="9" fill="#3a3a44" /><circle cx="145" cy="62" r="9" fill="#3a3a44" />
    <circle cx="100" cy="110" r="60" fill="url(#panda-body)" />
    <ellipse cx="100" cy="146" rx="40" ry="13" fill="#a8a8a8" opacity="0.35" />
    <g stroke="#a8a8a8" strokeWidth="1.2" fill="none" strokeLinecap="round">
      <path d="M58 96 q3 -3 6 0" /><path d="M142 96 q3 -3 6 0" />
      <path d="M68 134 q3 -3 6 0" /><path d="M126 134 q3 -3 6 0" />
    </g>
    <rect x="60" y="100" width="35" height="22" rx="5" fill="#1a1a1f" />
    <rect x="105" y="100" width="35" height="22" rx="5" fill="#1a1a1f" />
    <rect x="93" y="108" width="14" height="4" fill="#1a1a1f" />
    <path d="M64 104 L74 104 L70 116 Z" fill="#3a3a44" opacity="0.6" />
    <path d="M109 104 L119 104 L115 116 Z" fill="#3a3a44" opacity="0.6" />
    <ellipse cx="100" cy="136" rx="7" ry="5" fill="#1a1a1f" />
    <path d="M100 141 L100 148" stroke="#1a1a1f" strokeWidth="2" />
    <path d="M88 152 Q100 160 112 152" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    <ellipse cx="62" cy="130" rx="7" ry="4" fill="#f5b8c5" opacity="0.5" /><ellipse cx="138" cy="130" rx="7" ry="4" fill="#f5b8c5" opacity="0.5" />
  </svg>
);

// ───────────────── 4. Tiger + headphones ─────────────────
const Tiger: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="tiger-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d68a30" /><stop offset="100%" stopColor="#e8a047" />
      </linearGradient>
    </defs>
    <path d="M55 95 L42 50 L80 75 Z" fill="#c5751c" /><path d="M145 95 L158 50 L120 75 Z" fill="#c5751c" />
    <path d="M58 87 L48 60 L74 78 Z" fill="#1a1a1f" /><path d="M142 87 L152 60 L126 78 Z" fill="#1a1a1f" />
    <ellipse cx="100" cy="125" rx="55" ry="50" fill="url(#tiger-body)" />
    <ellipse cx="100" cy="158" rx="40" ry="12" fill="#9d5818" opacity="0.35" />
    <ellipse cx="100" cy="142" rx="36" ry="26" fill="#fff5ea" />
    <g stroke="#1a1a1f" strokeWidth="4" strokeLinecap="round" fill="none">
      <path d="M55 100 Q60 95 64 105" /><path d="M145 100 Q140 95 136 105" />
      <path d="M65 125 Q72 122 78 130" /><path d="M135 125 Q128 122 122 130" />
      <path d="M50 130 Q56 128 60 134" /><path d="M150 130 Q144 128 140 134" />
    </g>
    <path d="M95 88 L98 100" stroke="#1a1a1f" strokeWidth="3" strokeLinecap="round" />
    <path d="M105 88 L102 100" stroke="#1a1a1f" strokeWidth="3" strokeLinecap="round" />
    <path d="M62 108 Q80 100 96 108 Q120 100 138 108" stroke="#9d5818" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <ellipse cx="80" cy="118" rx="6" ry="7.5" fill="#1a1a1f" />
    <ellipse cx="120" cy="118" rx="6" ry="7.5" fill="#1a1a1f" />
    <circle cx="82" cy="115" r="2.2" fill="#fff" /><circle cx="122" cy="115" r="2.2" fill="#fff" />
    <path d="M92 138 Q100 142 108 138 Q106 148 100 150 Q94 148 92 138 Z" fill="#1a1a1f" />
    <path d="M88 156 Q100 164 112 156" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M50 90 Q100 30 150 90" stroke="#3a3a44" strokeWidth="9" fill="none" strokeLinecap="round" />
    <path d="M50 90 Q100 32 150 90" stroke="#5a5a64" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
    <ellipse cx="50" cy="100" rx="14" ry="18" fill="#a01818" />
    <ellipse cx="150" cy="100" rx="14" ry="18" fill="#a01818" />
    <ellipse cx="50" cy="100" rx="9" ry="12" fill="#d62828" />
    <ellipse cx="150" cy="100" rx="9" ry="12" fill="#d62828" />
  </svg>
);

// ───────────────── 5. Lion + crown ─────────────────
const Lion: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="lion-mane" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8a4a18" /><stop offset="100%" stopColor="#b06420" />
      </linearGradient>
      <linearGradient id="lion-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d68a30" /><stop offset="100%" stopColor="#e8a047" />
      </linearGradient>
    </defs>
    <g fill="url(#lion-mane)">
      <circle cx="100" cy="60" r="22" /><circle cx="55" cy="100" r="26" /><circle cx="145" cy="100" r="26" />
      <circle cx="60" cy="155" r="24" /><circle cx="140" cy="155" r="24" /><circle cx="100" cy="180" r="22" />
    </g>
    <g fill="#6a3308" opacity="0.5">
      <path d="M40 110 Q44 100 50 110" /><path d="M150 110 Q156 100 160 110" />
      <path d="M82 50 Q88 42 96 50" /><path d="M104 50 Q112 42 118 50" />
    </g>
    <ellipse cx="100" cy="120" rx="48" ry="46" fill="url(#lion-body)" />
    <ellipse cx="100" cy="156" rx="32" ry="10" fill="#9d5818" opacity="0.4" />
    <ellipse cx="100" cy="142" rx="32" ry="22" fill="#fff5ea" />
    <ellipse cx="82" cy="118" rx="5.5" ry="7" fill="#1a1a1f" /><ellipse cx="118" cy="118" rx="5.5" ry="7" fill="#1a1a1f" />
    <circle cx="84" cy="115" r="1.8" fill="#fff" /><circle cx="120" cy="115" r="1.8" fill="#fff" />
    <ellipse cx="68" cy="138" rx="6" ry="3.5" fill="#f5b8c5" opacity="0.5" /><ellipse cx="132" cy="138" rx="6" ry="3.5" fill="#f5b8c5" opacity="0.5" />
    <path d="M92 134 Q100 138 108 134 Q106 142 100 144 Q94 142 92 134 Z" fill="#1a1a1f" />
    <path d="M88 150 Q100 158 112 150" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M70 60 L80 40 L90 55 L100 35 L110 55 L120 40 L130 60 Z" fill="#ffd166" stroke="#a8851a" strokeWidth="2" strokeLinejoin="round" />
    <path d="M70 60 L80 40 L78 50 L70 56 Z" fill="#fff3a0" />
    <circle cx="80" cy="42" r="3" fill="#d62828" /><circle cx="100" cy="38" r="3" fill="#06d6a0" /><circle cx="120" cy="42" r="3" fill="#4cc9f0" />
    <rect x="68" y="60" width="64" height="6" fill="#a8851a" />
    <rect x="68" y="60" width="64" height="2" fill="#ffd166" />
  </svg>
);

// ───────────────── 6. Frog + top hat ─────────────────
const Frog: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="frog-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#5a9a26" /><stop offset="100%" stopColor="#7ab83a" />
      </linearGradient>
    </defs>
    <ellipse cx="100" cy="62" rx="40" ry="6" fill="#0a0a0e" />
    <ellipse cx="100" cy="60" rx="40" ry="6" fill="#1a1a1f" />
    <rect x="72" y="20" width="56" height="42" fill="#1a1a1f" />
    <rect x="72" y="50" width="56" height="6" fill="#c44a3a" />
    <rect x="72" y="20" width="6" height="42" fill="#3a3a44" opacity="0.6" />
    <circle cx="68" cy="80" r="22" fill="url(#frog-body)" /><circle cx="132" cy="80" r="22" fill="url(#frog-body)" />
    <circle cx="68" cy="78" r="14" fill="#fff" /><circle cx="132" cy="78" r="14" fill="#fff" />
    <circle cx="70" cy="80" r="6" fill="#1a1a1f" /><circle cx="130" cy="80" r="6" fill="#1a1a1f" />
    <circle cx="72" cy="78" r="2.2" fill="#fff" /><circle cx="132" cy="78" r="2.2" fill="#fff" />
    <ellipse cx="100" cy="135" rx="62" ry="50" fill="url(#frog-body)" />
    <ellipse cx="100" cy="170" rx="48" ry="14" fill="#3f6f1a" opacity="0.4" />
    <ellipse cx="100" cy="155" rx="40" ry="22" fill="#c8e08a" />
    <g fill="#3f6f1a" opacity="0.6">
      <circle cx="58" cy="125" r="3" /><circle cx="142" cy="125" r="3" />
      <circle cx="50" cy="148" r="2.5" /><circle cx="150" cy="148" r="2.5" />
    </g>
    <path d="M68 145 Q100 175 132 145" stroke="#1a1a1f" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <ellipse cx="65" cy="148" rx="6" ry="3" fill="#f5b8c5" opacity="0.55" /><ellipse cx="135" cy="148" rx="6" ry="3" fill="#f5b8c5" opacity="0.55" />
  </svg>
);

// ───────────────── 7. Koala + beanie ─────────────────
const Koala: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="koala-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8e8e9d" /><stop offset="100%" stopColor="#b0b0bd" />
      </linearGradient>
    </defs>
    <circle cx="48" cy="80" r="26" fill="url(#koala-body)" />
    <circle cx="152" cy="80" r="26" fill="url(#koala-body)" />
    <circle cx="48" cy="84" r="14" fill="#f5dde0" /><circle cx="152" cy="84" r="14" fill="#f5dde0" />
    <g stroke="#5a5a64" strokeWidth="0.8" fill="none">
      <path d="M40 70 q3 4 6 -2" /><path d="M52 65 q3 4 6 -2" /><path d="M148 70 q3 4 6 -2" /><path d="M156 65 q3 4 6 -2" />
    </g>
    <circle cx="100" cy="120" r="56" fill="url(#koala-body)" />
    <ellipse cx="100" cy="158" rx="42" ry="12" fill="#5a5a64" opacity="0.35" />
    <path d="M50 92 Q100 30 150 92 L148 60 Q100 12 52 60 Z" fill="#f7c873" />
    <path d="M50 92 Q100 30 150 92 L148 80 Q100 24 52 80 Z" fill="#d49a3c" opacity="0.5" />
    <ellipse cx="100" cy="92" rx="50" ry="6" fill="#a87420" />
    <g stroke="#a87420" strokeWidth="1.4" fill="none">
      <path d="M55 70 q5 2 9 -1" /><path d="M75 56 q5 2 9 -1" /><path d="M95 50 q5 2 9 -1" /><path d="M115 50 q5 2 9 -1" /><path d="M135 60 q5 2 9 -1" />
    </g>
    <circle cx="100" cy="22" r="12" fill="#fff" />
    <circle cx="97" cy="20" r="4" fill="#e0e0e0" opacity="0.6" />
    <ellipse cx="80" cy="118" rx="5.5" ry="7" fill="#1a1a1f" />
    <ellipse cx="120" cy="118" rx="5.5" ry="7" fill="#1a1a1f" />
    <circle cx="82" cy="115" r="1.8" fill="#fff" /><circle cx="122" cy="115" r="1.8" fill="#fff" />
    <ellipse cx="100" cy="138" rx="14" ry="9" fill="#3a3a44" />
    <ellipse cx="96" cy="135" rx="4" ry="2" fill="#5a5a64" />
    <path d="M88 152 Q100 158 112 152" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

// ───────────────── 8. Cat + flower crown ─────────────────
const Cat: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="cat-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#9898a3" /><stop offset="100%" stopColor="#b8b8c0" />
      </linearGradient>
    </defs>
    <path d="M58 92 L52 50 L84 78 Z" fill="#7878a0" />
    <path d="M142 92 L148 50 L116 78 Z" fill="#7878a0" />
    <path d="M62 86 L58 60 L78 78 Z" fill="#f0c0d0" />
    <path d="M138 86 L142 60 L122 78 Z" fill="#f0c0d0" />
    <ellipse cx="100" cy="120" rx="52" ry="48" fill="url(#cat-body)" />
    <ellipse cx="100" cy="158" rx="40" ry="12" fill="#5a5a78" opacity="0.3" />
    <ellipse cx="100" cy="140" rx="34" ry="22" fill="#fff5ea" />
    <g stroke="#5a5a78" strokeWidth="0.8" fill="none">
      <path d="M62 110 q4 -2 8 0" /><path d="M62 122 q4 -2 8 0" /><path d="M130 110 q4 -2 8 0" /><path d="M130 122 q4 -2 8 0" />
    </g>
    <Flower cx={62} cy={70} color="#f5b8c5" />
    <Flower cx={82} cy={56} color="#ffd166" />
    <Flower cx={100} cy={50} color="#fff" />
    <Flower cx={118} cy={56} color="#dca0e6" />
    <Flower cx={138} cy={70} color="#f5b8c5" />
    <path d="M75 112 Q83 105 91 112" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M109 112 Q117 105 125 112" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M94 132 L106 132 L100 138 Z" fill="#e08eaa" />
    <path d="M100 138 Q100 144 95 146" stroke="#1a1a1f" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M100 138 Q100 144 105 146" stroke="#1a1a1f" strokeWidth="2" fill="none" strokeLinecap="round" />
    <line x1="65" y1="135" x2="80" y2="138" stroke="#1a1a1f" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="65" y1="142" x2="80" y2="142" stroke="#1a1a1f" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="135" y1="135" x2="120" y2="138" stroke="#1a1a1f" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="135" y1="142" x2="120" y2="142" stroke="#1a1a1f" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const Flower = ({ cx, cy, color }: { cx: number; cy: number; color: string }) => (
  <g>
    {[0, 1, 2, 3, 4].map((i) => {
      const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
      return <circle key={i} cx={cx + 6 * Math.cos(a)} cy={cy + 6 * Math.sin(a)} r={5} fill={color} />;
    })}
    <circle cx={cx} cy={cy} r={3} fill="#ffd166" />
  </g>
);

// ───────────────── 9. Rabbit + heart earrings ─────────────────
const Rabbit: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="rabbit-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e8e0d0" /><stop offset="100%" stopColor="#fff8ec" />
      </linearGradient>
    </defs>
    <ellipse cx="78" cy="40" rx="11" ry="35" fill="url(#rabbit-body)" />
    <ellipse cx="122" cy="40" rx="11" ry="35" fill="url(#rabbit-body)" />
    <ellipse cx="78" cy="42" rx="6" ry="26" fill="#f0c0d0" />
    <ellipse cx="122" cy="42" rx="6" ry="26" fill="#f0c0d0" />
    <ellipse cx="78" cy="42" rx="3" ry="22" fill="#ffaab8" opacity="0.5" />
    <ellipse cx="122" cy="42" rx="3" ry="22" fill="#ffaab8" opacity="0.5" />
    <ellipse cx="100" cy="125" rx="50" ry="46" fill="url(#rabbit-body)" />
    <ellipse cx="100" cy="158" rx="40" ry="12" fill="#a89878" opacity="0.3" />
    <ellipse cx="100" cy="140" rx="34" ry="24" fill="#fff" />
    <Heart cx={48} cy={138} fill="#ff5e7e" />
    <Heart cx={152} cy={138} fill="#ff5e7e" />
    <line x1="55" y1="115" x2="51" y2="132" stroke="#9b1c1c" strokeWidth="1.5" />
    <line x1="145" y1="115" x2="149" y2="132" stroke="#9b1c1c" strokeWidth="1.5" />
    <ellipse cx="80" cy="118" rx="5.5" ry="7" fill="#1a1a1f" />
    <ellipse cx="120" cy="118" rx="5.5" ry="7" fill="#1a1a1f" />
    <circle cx="82" cy="115" r="1.8" fill="#fff" /><circle cx="122" cy="115" r="1.8" fill="#fff" />
    <ellipse cx="68" cy="138" rx="6" ry="3.5" fill="#f5b8c5" opacity="0.65" /><ellipse cx="132" cy="138" rx="6" ry="3.5" fill="#f5b8c5" opacity="0.65" />
    <path d="M94 134 Q100 138 106 134 L100 142 Z" fill="#e08eaa" />
    <path d="M100 142 L94 152 M100 142 L106 152" stroke="#1a1a1f" strokeWidth="2" fill="none" strokeLinecap="round" />
    <rect x="96" y="148" width="8" height="10" rx="1" fill="#fff" stroke="#d4d4d4" strokeWidth="1" />
  </svg>
);

const Heart = ({ cx, cy, fill }: { cx: number; cy: number; fill: string }) => (
  <path
    d={`M${cx} ${cy + 6} L${cx - 8} ${cy - 2} A5 5 0 0 1 ${cx} ${cy - 4} A5 5 0 0 1 ${cx + 8} ${cy - 2} Z`}
    fill={fill}
  />
);

// ───────────────── 10. Owl + grad cap ─────────────────
const Owl: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="owl-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7a4a1a" /><stop offset="100%" stopColor="#a26939" />
      </linearGradient>
    </defs>
    <path d="M58 76 L52 50 L72 68 Z" fill="#5a350a" /><path d="M142 76 L148 50 L128 68 Z" fill="#5a350a" />
    <ellipse cx="100" cy="120" rx="58" ry="56" fill="url(#owl-body)" />
    <ellipse cx="100" cy="158" rx="44" ry="14" fill="#3a200a" opacity="0.4" />
    <ellipse cx="100" cy="125" rx="40" ry="38" fill="#f5e0c0" />
    <g stroke="#5a350a" strokeWidth="1.4" fill="none" strokeLinecap="round">
      <path d="M55 100 q4 -3 8 0" /><path d="M68 110 q4 -3 8 0" /><path d="M124 110 q4 -3 8 0" /><path d="M137 100 q4 -3 8 0" />
      <path d="M50 130 q4 -3 8 0" /><path d="M142 130 q4 -3 8 0" />
    </g>
    <circle cx="78" cy="118" r="18" fill="#fff5ea" stroke="#7a4a1a" strokeWidth="2.5" />
    <circle cx="122" cy="118" r="18" fill="#fff5ea" stroke="#7a4a1a" strokeWidth="2.5" />
    <circle cx="78" cy="118" r="9" fill="#1a1a1f" /><circle cx="122" cy="118" r="9" fill="#1a1a1f" />
    <circle cx="80" cy="115" r="3" fill="#fff" /><circle cx="124" cy="115" r="3" fill="#fff" />
    <path d="M92 138 L100 152 L108 138 Z" fill="#ffa94a" />
    <path d="M92 138 L100 152 L100 138 Z" fill="#d68220" />
    <rect x="60" y="60" width="80" height="10" fill="#1a1a1f" />
    <path d="M50 60 L100 38 L150 60 L100 78 Z" fill="#1a1a1f" />
    <path d="M50 60 L100 38 L100 60 Z" fill="#3a3a44" opacity="0.6" />
    <line x1="100" y1="38" x2="148" y2="48" stroke="#ffd166" strokeWidth="2" />
    <circle cx="148" cy="48" r="5" fill="#ffd166" />
    <path d="M148 48 L155 64" stroke="#ffd166" strokeWidth="2" />
  </svg>
);

// ───────────────── 11. Octopus + star sunglasses ─────────────────
const Octopus: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="octo-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#9450a0" /><stop offset="100%" stopColor="#b56fb8" />
      </linearGradient>
    </defs>
    {[40, 70, 100, 130, 160].map((x, i) => (
      <path
        key={i}
        d={`M${x} 130 Q${x + (i % 2 ? 6 : -6)} 165 ${x + (i % 2 ? 12 : -12)} 188`}
        stroke="url(#octo-body)"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />
    ))}
    {[40, 70, 100, 130, 160].map((x, i) => (
      <g key={`s-${i}`} fill="#dca0e6">
        <circle cx={x + (i % 2 ? 4 : -4)} cy="155" r="2.5" /><circle cx={x + (i % 2 ? 8 : -8)} cy="170" r="2.2" />
      </g>
    ))}
    <ellipse cx="100" cy="100" rx="68" ry="58" fill="url(#octo-body)" />
    <ellipse cx="100" cy="135" rx="48" ry="14" fill="#5a2868" opacity="0.4" />
    <ellipse cx="100" cy="120" rx="40" ry="22" fill="#dca0e6" />
    <Star cx={80} cy={92} size={18} fill="#1a1a1f" />
    <Star cx={120} cy={92} size={18} fill="#1a1a1f" />
    <line x1="92" y1="92" x2="108" y2="92" stroke="#1a1a1f" strokeWidth="3" />
    <circle cx="80" cy="93" r="2.5" fill="#fff" /><circle cx="120" cy="93" r="2.5" fill="#fff" />
    <ellipse cx="100" cy="125" rx="6" ry="4" fill="#1a1a1f" />
    <ellipse cx="100" cy="124" rx="3" ry="2" fill="#ff8aa3" />
  </svg>
);

const Star = ({ cx, cy, size, fill }: { cx: number; cy: number; size: number; fill: string }) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? size : size * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return <polygon points={pts.join(" ")} fill={fill} />;
};

// ───────────────── 12. Whale + sailor hat ─────────────────
const Whale: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="whale-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3a72a8" /><stop offset="100%" stopColor="#5d9bcf" />
      </linearGradient>
    </defs>
    <path d="M96 30 Q92 18 96 8 M104 30 Q108 18 104 8 M100 28 L100 14" stroke="#4cc9f0" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
    <ellipse cx="100" cy="125" rx="68" ry="50" fill="url(#whale-body)" />
    <ellipse cx="100" cy="160" rx="50" ry="14" fill="#1a3858" opacity="0.4" />
    <ellipse cx="100" cy="148" rx="46" ry="28" fill="#82b6db" />
    <path d="M168 110 L188 100 L186 122 Z" fill="#3a72a8" />
    <path d="M168 110 L188 130 L186 118 Z" fill="#3a72a8" />
    <g stroke="#1a3858" strokeWidth="1.4" fill="none">
      <path d="M50 130 q5 -3 10 0" /><path d="M50 140 q5 -3 10 0" />
      <path d="M140 130 q5 -3 10 0" /><path d="M140 140 q5 -3 10 0" />
    </g>
    <ellipse cx="100" cy="78" rx="40" ry="6" fill="#e0e0e0" />
    <ellipse cx="100" cy="76" rx="40" ry="6" fill="#fff" />
    <path d="M64 78 Q70 50 100 50 Q130 50 136 78 Z" fill="#fff" />
    <path d="M64 78 Q70 50 100 50 L100 78 Z" fill="#e8e8e8" opacity="0.7" />
    <rect x="78" y="74" width="44" height="6" fill="#1a1a1f" />
    <circle cx="100" cy="60" r="6" fill="#d62828" />
    <circle cx="98" cy="58" r="2" fill="#ff8888" />
    <ellipse cx="80" cy="120" rx="5.5" ry="7" fill="#1a1a1f" /><ellipse cx="120" cy="120" rx="5.5" ry="7" fill="#1a1a1f" />
    <circle cx="82" cy="117" r="2" fill="#fff" /><circle cx="122" cy="117" r="2" fill="#fff" />
    <path d="M85 145 Q100 158 115 145" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    <ellipse cx="68" cy="138" rx="5" ry="3" fill="#f5b8c5" opacity="0.5" /><ellipse cx="132" cy="138" rx="5" ry="3" fill="#f5b8c5" opacity="0.5" />
  </svg>
);

// ───────────────── 13. Dragon + wizard hat ─────────────────
const Dragon: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="dragon-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#9d3a2a" /><stop offset="100%" stopColor="#c44a3a" />
      </linearGradient>
      <linearGradient id="dragon-belly" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f5b8a8" /><stop offset="100%" stopColor="#e08e7e" />
      </linearGradient>
      <linearGradient id="dragon-hat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7a52b8" /><stop offset="100%" stopColor="#3d2960" />
      </linearGradient>
    </defs>
    <ellipse cx="100" cy="62" rx="44" ry="6" fill="#2c1d44" />
    <ellipse cx="100" cy="60" rx="44" ry="6" fill="#3d2960" />
    <path d="M62 60 L100 4 L138 60 Z" fill="url(#dragon-hat)" />
    <path d="M70 58 L100 12 Q88 30 70 58 Z" fill="#9d76d6" opacity="0.5" />
    <path d="M86 30 l3 6 l6 1 l-4.5 4 l1 6 l-5.5 -3 l-5.5 3 l1 -6 l-4.5 -4 l6 -1 z" fill="#ffd166" />
    <path d="M50 88 L38 56 L66 78 Z" fill="#7a2a20" />
    <path d="M50 88 L48 70 L60 78 Z" fill="#5a1a10" />
    <path d="M150 88 L162 56 L134 78 Z" fill="#7a2a20" />
    <path d="M150 88 L152 70 L140 78 Z" fill="#5a1a10" />
    <ellipse cx="100" cy="124" rx="55" ry="48" fill="url(#dragon-body)" />
    <ellipse cx="100" cy="160" rx="40" ry="14" fill="#7a2a20" opacity="0.4" />
    <ellipse cx="100" cy="148" rx="36" ry="24" fill="url(#dragon-belly)" />
    <g stroke="#7a2a20" strokeWidth="1.6" fill="none">
      <path d="M58 96 q6 -5 12 0" /><path d="M76 92 q6 -5 12 0" /><path d="M94 90 q6 -5 12 0" /><path d="M112 92 q6 -5 12 0" /><path d="M130 96 q6 -5 12 0" />
      <path d="M62 110 q6 -5 12 0" /><path d="M82 108 q6 -5 12 0" /><path d="M104 108 q6 -5 12 0" /><path d="M126 110 q6 -5 12 0" />
    </g>
    <path d="M62 108 Q80 100 96 108 Q120 100 138 108" stroke="#5a1a10" strokeWidth="3" fill="none" strokeLinecap="round" />
    <ellipse cx="80" cy="120" rx="7" ry="9" fill="#fff5d0" />
    <ellipse cx="120" cy="120" rx="7" ry="9" fill="#fff5d0" />
    <ellipse cx="80" cy="120" rx="3" ry="6" fill="#1a1a1f" />
    <ellipse cx="120" cy="120" rx="3" ry="6" fill="#1a1a1f" />
    <circle cx="81" cy="117" r="1.6" fill="#fff" /><circle cx="121" cy="117" r="1.6" fill="#fff" />
    <ellipse cx="92" cy="140" rx="2.5" ry="3" fill="#1a1a1f" />
    <ellipse cx="108" cy="140" rx="2.5" ry="3" fill="#1a1a1f" />
    <path d="M84 152 Q100 166 116 152" stroke="#1a1a1f" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <ellipse cx="55" cy="148" rx="6" ry="3" fill="#a8a8b5" opacity="0.5" />
    <ellipse cx="46" cy="142" rx="4" ry="2.5" fill="#a8a8b5" opacity="0.4" />
    <ellipse cx="40" cy="138" rx="3" ry="2" fill="#a8a8b5" opacity="0.3" />
  </svg>
);

// ───────────────── 14. Unicorn + sparkles/tiara ─────────────────
const Unicorn: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="uni-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e8e0d0" /><stop offset="100%" stopColor="#fff8ec" />
      </linearGradient>
      <linearGradient id="uni-horn" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ff5e7e" /><stop offset="50%" stopColor="#ffd166" /><stop offset="100%" stopColor="#4cc9f0" />
      </linearGradient>
    </defs>
    <path d="M62 80 L52 40 L82 70 Z" fill="#e0d4c0" />
    <path d="M138 80 L148 40 L118 70 Z" fill="#e0d4c0" />
    <path d="M66 76 L58 50 L76 70 Z" fill="#f0c0d0" />
    <path d="M134 76 L142 50 L124 70 Z" fill="#f0c0d0" />
    <path d="M92 70 L100 14 L108 70 Z" fill="url(#uni-horn)" stroke="#a8851a" strokeWidth="1.5" />
    <path d="M95 30 L105 30 M93 50 L107 50" stroke="#fff" strokeWidth="1.5" opacity="0.7" />
    <path d="M62 100 Q42 95 50 75 Q38 60 60 56 Q56 38 80 50 L78 70 Q66 75 64 92 Z" fill="#ff5e7e" />
    <path d="M62 100 Q50 96 56 84" stroke="#c33258" strokeWidth="1.5" fill="none" />
    <path d="M138 100 Q158 95 150 75 Q162 60 140 56 Q144 38 120 50 L122 70 Q134 75 136 92 Z" fill="#4cc9f0" />
    <path d="M138 100 Q150 96 144 84" stroke="#2a8aaa" strokeWidth="1.5" fill="none" />
    <ellipse cx="100" cy="125" rx="52" ry="48" fill="url(#uni-body)" />
    <ellipse cx="100" cy="160" rx="40" ry="12" fill="#a89878" opacity="0.3" />
    <ellipse cx="100" cy="148" rx="32" ry="22" fill="#fff" />
    <Sparkle cx={40} cy={45} /><Sparkle cx={160} cy={45} /><Sparkle cx={50} cy={130} />
    <path d="M76 115 Q84 108 92 115" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M108 115 Q116 108 124 115" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    <ellipse cx="68" cy="138" rx="6" ry="3.5" fill="#f5b8c5" opacity="0.7" />
    <ellipse cx="132" cy="138" rx="6" ry="3.5" fill="#f5b8c5" opacity="0.7" />
    <ellipse cx="100" cy="148" rx="5" ry="3" fill="#e08eaa" />
    <path d="M88 158 Q100 164 112 158" stroke="#1a1a1f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </svg>
);

const Sparkle = ({ cx, cy }: { cx: number; cy: number }) => (
  <path
    d={`M${cx} ${cy - 8} L${cx + 2} ${cy - 2} L${cx + 8} ${cy} L${cx + 2} ${cy + 2} L${cx} ${cy + 8} L${cx - 2} ${cy + 2} L${cx - 8} ${cy} L${cx - 2} ${cy - 2} Z`}
    fill="#ffd166"
  />
);

// ───────────────── 15. Phoenix + tiny crown ─────────────────
const Phoenix: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="phoenix-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ff5e1a" /><stop offset="60%" stopColor="#ff9b1a" /><stop offset="100%" stopColor="#ffd166" />
      </linearGradient>
    </defs>
    <path d="M40 130 Q20 100 30 70 L48 100 Q35 110 40 130 Z" fill="#ff5e1a" />
    <path d="M40 130 Q24 105 32 78 L46 102 Z" fill="#ffb84a" opacity="0.7" />
    <path d="M160 130 Q180 100 170 70 L152 100 Q165 110 160 130 Z" fill="#ff5e1a" />
    <path d="M160 130 Q176 105 168 78 L154 102 Z" fill="#ffb84a" opacity="0.7" />
    <path d="M70 178 Q60 162 70 148 L82 168 Z" fill="#ff5e1a" />
    <path d="M100 188 Q90 168 100 152 L110 168 Q104 180 100 188 Z" fill="#ff5e1a" />
    <path d="M130 178 Q140 162 130 148 L118 168 Z" fill="#ff5e1a" />
    <ellipse cx="100" cy="120" rx="50" ry="48" fill="url(#phoenix-body)" />
    <ellipse cx="100" cy="156" rx="38" ry="12" fill="#a02810" opacity="0.4" />
    <ellipse cx="100" cy="138" rx="34" ry="22" fill="#ffe066" />
    <path d="M70 76 L82 56 L88 76 Z" fill="#ff5e1a" />
    <path d="M88 76 L100 50 L106 76 Z" fill="#ff5e1a" />
    <path d="M106 76 L118 56 L130 76 Z" fill="#ff5e1a" />
    <path d="M86 56 L88 60 L92 60 L89 62 L90 66 L86 64 L82 66 L83 62 L80 60 L84 60 Z" fill="#fff" />
    <ellipse cx="80" cy="115" rx="6" ry="7.5" fill="#1a1a1f" />
    <ellipse cx="120" cy="115" rx="6" ry="7.5" fill="#1a1a1f" />
    <circle cx="82" cy="112" r="2" fill="#fff" /><circle cx="122" cy="112" r="2" fill="#fff" />
    <path d="M88 132 L100 146 L112 132 Z" fill="#ffa94a" />
    <path d="M88 132 L100 146 L100 132 Z" fill="#d6620c" />
    <ellipse cx="68" cy="138" rx="6" ry="3.5" fill="#ffaa88" opacity="0.7" />
    <ellipse cx="132" cy="138" rx="6" ry="3.5" fill="#ffaa88" opacity="0.7" />
    <rect x="80" y="42" width="40" height="5" fill="#a8851a" />
    <path d="M80 42 L84 32 L92 42 L100 30 L108 42 L116 32 L120 42 Z" fill="#ffd166" stroke="#a8851a" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="100" cy="34" r="2.5" fill="#d62828" />
  </svg>
);

// ───────────────── 16. Yeti + winter scarf ─────────────────
const Yeti: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="yeti-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#dee5f0" /><stop offset="100%" stopColor="#fff" />
      </linearGradient>
    </defs>
    <g fill="url(#yeti-body)">
      <circle cx="55" cy="80" r="18" /><circle cx="145" cy="80" r="18" />
      <circle cx="38" cy="120" r="14" /><circle cx="162" cy="120" r="14" />
    </g>
    <ellipse cx="100" cy="118" rx="62" ry="56" fill="url(#yeti-body)" />
    <ellipse cx="100" cy="155" rx="48" ry="14" fill="#a8b8d0" opacity="0.45" />
    <g fill="#c8d4e6" opacity="0.7">
      <circle cx="58" cy="100" r="6" /><circle cx="142" cy="100" r="6" />
      <circle cx="50" cy="135" r="5" /><circle cx="150" cy="135" r="5" />
      <circle cx="100" cy="65" r="6" />
    </g>
    <ellipse cx="100" cy="140" rx="40" ry="22" fill="#f5f5fa" />
    <path d="M40 65 q4 6 -2 12" stroke="#a8b8d0" strokeWidth="1.5" fill="none" />
    <path d="M160 65 q-4 6 2 12" stroke="#a8b8d0" strokeWidth="1.5" fill="none" />
    <ellipse cx="80" cy="120" rx="6" ry="8" fill="#1a1a1f" />
    <ellipse cx="120" cy="120" rx="6" ry="8" fill="#1a1a1f" />
    <circle cx="82" cy="117" r="2.2" fill="#fff" /><circle cx="122" cy="117" r="2.2" fill="#fff" />
    <ellipse cx="68" cy="138" rx="7" ry="4" fill="#a4d0f0" opacity="0.55" />
    <ellipse cx="132" cy="138" rx="7" ry="4" fill="#a4d0f0" opacity="0.55" />
    <ellipse cx="100" cy="138" rx="5" ry="3" fill="#3a3a44" />
    <path d="M82 152 Q100 168 118 152" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    <rect x="86" y="158" width="3" height="8" fill="#fff" stroke="#a8a8b5" strokeWidth="1" />
    <rect x="111" y="158" width="3" height="8" fill="#fff" stroke="#a8a8b5" strokeWidth="1" />
    <path d="M40 168 Q100 152 160 168 L160 188 L40 188 Z" fill="#c44a3a" />
    <path d="M40 168 Q100 152 160 168" stroke="#9b1c1c" strokeWidth="2" fill="none" />
    <g stroke="#9b1c1c" strokeWidth="2" fill="none">
      <path d="M50 175 L60 188" /><path d="M70 173 L80 188" /><path d="M90 172 L100 188" /><path d="M110 173 L120 188" /><path d="M130 175 L140 188" />
    </g>
    <path d="M150 168 L172 175 L160 188 Z" fill="#9b1c1c" />
  </svg>
);

// ───────────────── 17. Slime + bowler hat ─────────────────
const Slime: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="slime-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#5fa12c" /><stop offset="100%" stopColor="#7ab83a" />
      </linearGradient>
    </defs>
    <ellipse cx="100" cy="62" rx="34" ry="5" fill="#2a2228" />
    <ellipse cx="100" cy="60" rx="34" ry="5" fill="#3a3242" />
    <path d="M70 62 Q70 40 100 36 Q130 40 130 62 Z" fill="#3a3242" />
    <path d="M70 62 Q70 40 100 36 L100 62 Z" fill="#5a4862" opacity="0.6" />
    <rect x="74" y="56" width="52" height="4" fill="#c44a3a" />
    <path d="M40 175 Q35 140 65 100 Q90 70 100 70 Q110 70 135 100 Q165 140 160 175 Q150 188 100 188 Q50 188 40 175 Z" fill="url(#slime-body)" />
    <path d="M100 70 Q90 70 75 90 Q60 110 60 130 Q60 110 75 95 Q90 80 100 80 Z" fill="#a8d878" opacity="0.65" />
    <path d="M50 168 Q35 175 50 188" stroke="#3f6f1a" strokeWidth="2" fill="none" />
    <path d="M150 168 Q165 175 150 188" stroke="#3f6f1a" strokeWidth="2" fill="none" />
    <circle cx="55" cy="172" r="6" fill="url(#slime-body)" />
    <circle cx="145" cy="172" r="6" fill="url(#slime-body)" />
    <circle cx="100" cy="186" r="6" fill="url(#slime-body)" />
    <ellipse cx="80" cy="130" rx="10" ry="13" fill="#fff" />
    <ellipse cx="120" cy="130" rx="10" ry="13" fill="#fff" />
    <circle cx="80" cy="132" r="5" fill="#1a1a1f" /><circle cx="120" cy="132" r="5" fill="#1a1a1f" />
    <circle cx="82" cy="129" r="2" fill="#fff" /><circle cx="122" cy="129" r="2" fill="#fff" />
    <ellipse cx="62" cy="150" rx="8" ry="4" fill="#a8d878" opacity="0.7" />
    <ellipse cx="138" cy="150" rx="8" ry="4" fill="#a8d878" opacity="0.7" />
    <path d="M88 158 Q100 170 112 158" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

// ───────────────── 18. Ghost + pirate bandana ─────────────────
const Ghost: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="ghost-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e8edf5" /><stop offset="100%" stopColor="#fff" />
      </linearGradient>
    </defs>
    <path d="M40 110 Q40 50 100 50 Q160 50 160 110 L160 175 L150 165 L135 178 L120 165 L105 178 L95 165 L80 178 L65 165 L50 178 L40 168 Z"
      fill="url(#ghost-body)" />
    <path d="M40 110 Q40 50 100 50 L100 175 Z" fill="#d8dde8" opacity="0.45" />
    <path d="M44 75 Q40 70 48 65" stroke="#a8b0bd" strokeWidth="1.5" fill="none" opacity="0.7" />
    <path d="M156 75 Q160 70 152 65" stroke="#a8b0bd" strokeWidth="1.5" fill="none" opacity="0.7" />
    <path d="M40 70 Q100 30 160 70 Q140 50 130 60 L120 56 Q100 42 80 56 L70 60 Q60 50 40 70 Z" fill="#1a1a1f" />
    <path d="M40 70 Q100 30 160 70 Q140 50 130 60 L120 56 Q100 42 100 70 Z" fill="#3a3a44" opacity="0.5" />
    <path d="M40 70 Q34 60 22 64 Q28 80 36 76 Z" fill="#1a1a1f" />
    <path d="M85 56 L92 50 M108 50 L115 56 M100 48 L100 54" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <ellipse cx="80" cy="96" rx="9" ry="11" fill="#1a1a1f" />
    <ellipse cx="120" cy="96" rx="9" ry="11" fill="#1a1a1f" />
    <circle cx="82" cy="93" r="3" fill="#fff" /><circle cx="122" cy="93" r="3" fill="#fff" />
    <ellipse cx="68" cy="118" rx="7" ry="3.5" fill="#f5b8c5" opacity="0.6" />
    <ellipse cx="132" cy="118" rx="7" ry="3.5" fill="#f5b8c5" opacity="0.6" />
    <ellipse cx="100" cy="120" rx="9" ry="13" fill="#1a1a1f" />
    <ellipse cx="100" cy="116" rx="6" ry="3" fill="#fff5ea" />
  </svg>
);

// ───────────────── 19. Nessie + monocle ─────────────────
const Nessie: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="ness-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3a8868" /><stop offset="100%" stopColor="#5fa18a" />
      </linearGradient>
    </defs>
    <path d="M0 175 Q20 165 40 175 Q60 165 80 175 Q100 165 120 175 Q140 165 160 175 Q180 165 200 175 L200 200 L0 200 Z" fill="#1a3858" opacity="0.5" />
    <path d="M0 178 Q20 168 40 178 Q60 168 80 178" stroke="#82b6db" strokeWidth="1.5" fill="none" opacity="0.7" />
    <ellipse cx="160" cy="155" rx="22" ry="14" fill="url(#ness-body)" />
    <ellipse cx="40" cy="155" rx="20" ry="12" fill="url(#ness-body)" />
    <rect x="80" y="100" width="22" height="80" fill="url(#ness-body)" rx="8" />
    <ellipse cx="100" cy="100" rx="44" ry="40" fill="url(#ness-body)" />
    <ellipse cx="100" cy="125" rx="32" ry="18" fill="#a8d4c0" />
    <g fill="#1a584a">
      <circle cx="70" cy="92" r="3" /><circle cx="100" cy="78" r="3" /><circle cx="130" cy="92" r="3" />
      <circle cx="86" cy="142" r="2.5" /><circle cx="114" cy="142" r="2.5" />
    </g>
    <path d="M88 70 L92 60 L96 70 L100 58 L104 70 L108 60 L112 70" stroke="#1a584a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <ellipse cx="84" cy="98" rx="6" ry="7.5" fill="#1a1a1f" />
    <ellipse cx="116" cy="98" rx="6" ry="7.5" fill="#1a1a1f" />
    <circle cx="86" cy="95" r="2" fill="#fff" /><circle cx="118" cy="95" r="2" fill="#fff" />
    <circle cx="116" cy="98" r="14" fill="none" stroke="#a8851a" strokeWidth="3" />
    <line x1="130" y1="108" x2="142" y2="125" stroke="#a8851a" strokeWidth="2" strokeLinecap="round" />
    <ellipse cx="68" cy="116" rx="5" ry="3" fill="#f5b8c5" opacity="0.55" />
    <ellipse cx="132" cy="118" rx="3" ry="2" fill="#f5b8c5" opacity="0.45" />
    <path d="M86 118 Q100 130 114 120" stroke="#1a1a1f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </svg>
);

// ───────────────── 20. Cyclops + propeller beanie ─────────────────
const Cyclops: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    <defs>
      <linearGradient id="cyc-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8a5cb6" /><stop offset="100%" stopColor="#a87cd6" />
      </linearGradient>
    </defs>
    <line x1="100" y1="20" x2="100" y2="40" stroke="#5a3a8a" strokeWidth="3" />
    <circle cx="100" cy="18" r="6" fill="#ff5e7e" />
    <path d="M100 18 m-6 0 a6 6 0 1 0 12 0" stroke="#ffd166" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M70 50 Q100 30 130 50 L130 60 Q100 50 70 60 Z" fill="#4cc9f0" />
    <path d="M70 60 Q100 70 130 60 L130 70 Q100 80 70 70 Z" fill="#3aa3c4" />
    <ellipse cx="100" cy="78" rx="32" ry="6" fill="#2a8ab0" />
    <ellipse cx="100" cy="125" rx="58" ry="52" fill="url(#cyc-body)" />
    <ellipse cx="100" cy="160" rx="44" ry="14" fill="#5a3a8a" opacity="0.4" />
    <ellipse cx="100" cy="148" rx="40" ry="22" fill="#c8a4e0" />
    <g fill="#5a3a8a" opacity="0.6">
      <circle cx="65" cy="115" r="3" /><circle cx="135" cy="115" r="3" />
      <circle cx="55" cy="140" r="2.5" /><circle cx="145" cy="140" r="2.5" />
    </g>
    <path d="M64 100 Q100 92 136 100" stroke="#5a3a8a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <circle cx="100" cy="120" r="22" fill="#fff" />
    <circle cx="100" cy="120" r="14" fill="#4cc9f0" />
    <circle cx="100" cy="120" r="7" fill="#1a1a1f" />
    <circle cx="103" cy="116" r="3" fill="#fff" />
    <ellipse cx="68" cy="148" rx="7" ry="4" fill="#ffaad0" opacity="0.55" />
    <ellipse cx="132" cy="148" rx="7" ry="4" fill="#ffaad0" opacity="0.55" />
    <path d="M82 158 Q100 174 118 158" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M88 164 L90 174 L94 164 Z" fill="#fff" />
  </svg>
);

const AVATAR_MAP: Record<string, SvgComp> = {
  fox: Fox,
  bear: Bear,
  panda: Panda,
  tiger: Tiger,
  lion: Lion,
  frog: Frog,
  koala: Koala,
  cat: Cat,
  rabbit: Rabbit,
  owl: Owl,
  octopus: Octopus,
  whale: Whale,
  dragon: Dragon,
  unicorn: Unicorn,
  phoenix: Phoenix,
  yeti: Yeti,
  slime: Slime,
  ghost: Ghost,
  nessie: Nessie,
  cyclops: Cyclops,
};

export const AVATAR_IDS = Object.keys(AVATAR_MAP);
