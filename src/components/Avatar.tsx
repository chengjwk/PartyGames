// 24 hand-drawn SVG avatars in a consistent flat-color cartoon style.
// Each animal has a unique accessory. Players store an id like "fox" or
// "wizard" — the wire format stays a string, so existing emoji avatars are
// migrated below.

import type { ComponentType, SVGProps } from "react";

export interface AvatarProps {
  id: string;
  // Pixel size; omit to let the avatar fill its parent.
  size?: number;
  // false = no rounded backdrop tile (e.g. for already-tinted contexts)
  bg?: boolean;
}

// Migration: players who picked an emoji before this change get the matching
// drawn avatar.
const LEGACY_EMOJI_MAP: Record<string, string> = {
  "🦊": "fox", "🐻": "bear", "🐼": "panda", "🐯": "tiger", "🦁": "lion",
  "🐸": "frog", "🐵": "monkey", "🐨": "koala", "🐶": "dog", "🐱": "cat",
  "🐰": "rabbit", "🐭": "mouse", "🐹": "hamster", "🐺": "wolf", "🦝": "raccoon",
  "🦄": "unicorn", "🐢": "turtle", "🐙": "octopus", "🦉": "owl", "🦒": "giraffe",
  "🐳": "whale", "🦕": "dino", "🦖": "trex", "🐉": "dragon",
};

export default function Avatar({ id, size, bg = true }: AvatarProps) {
  const animalId = LEGACY_EMOJI_MAP[id] ?? id;
  const Svg = AVATAR_MAP[animalId] ?? Fox;
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

// ───────────────────────── 1. Fox + party hat ─────────────────────────
const Fox: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* party hat */}
    <circle cx="100" cy="22" r="9" fill="#ffd9e2" />
    <path d="M70 64 L100 28 L130 64 Z" fill="#4cc9f0" />
    <path d="M73 60 L100 30 L100 60 Z" fill="#3aa9d6" />
    <circle cx="92" cy="50" r="3.6" fill="#ffe066" />
    <circle cx="108" cy="55" r="3" fill="#ffe066" />
    <circle cx="100" cy="40" r="2.5" fill="#fff" />
    <ellipse cx="100" cy="65" rx="36" ry="5" fill="#3aa9d6" />
    {/* ears */}
    <path d="M60 100 L48 58 L82 82 Z" fill="#e8732e" />
    <path d="M140 100 L152 58 L118 82 Z" fill="#e8732e" />
    <path d="M65 92 L56 66 L76 82 Z" fill="#f5c8a8" />
    <path d="M135 92 L144 66 L124 82 Z" fill="#f5c8a8" />
    {/* head */}
    <ellipse cx="100" cy="124" rx="52" ry="48" fill="#e8732e" />
    <ellipse cx="100" cy="140" rx="40" ry="30" fill="#fff5ea" />
    <path d="M85 88 Q100 78 115 88 L113 102 Q100 96 87 102 Z" fill="#fff5ea" />
    {/* face */}
    <ellipse cx="80" cy="116" rx="6.5" ry="7.5" fill="#1a1a1f" />
    <ellipse cx="120" cy="116" rx="6.5" ry="7.5" fill="#1a1a1f" />
    <circle cx="82" cy="113" r="2.2" fill="#fff" />
    <circle cx="122" cy="113" r="2.2" fill="#fff" />
    <ellipse cx="68" cy="140" rx="7" ry="4" fill="#f5b8c5" opacity="0.65" />
    <ellipse cx="132" cy="140" rx="7" ry="4" fill="#f5b8c5" opacity="0.65" />
    <path d="M92 134 Q100 138 108 134 Q106 144 100 146 Q94 144 92 134 Z" fill="#1a1a1f" />
    <path d="M86 150 Q100 162 114 150" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

// ───────────────────────── 2. Bear + bowtie ─────────────────────────
const Bear: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* ears */}
    <circle cx="55" cy="60" r="20" fill="#8c5e2f" />
    <circle cx="145" cy="60" r="20" fill="#8c5e2f" />
    <circle cx="55" cy="60" r="10" fill="#d4a980" />
    <circle cx="145" cy="60" r="10" fill="#d4a980" />
    {/* head */}
    <circle cx="100" cy="105" r="60" fill="#8c5e2f" />
    <ellipse cx="100" cy="125" rx="36" ry="28" fill="#d4a980" />
    {/* face */}
    <ellipse cx="80" cy="100" rx="6" ry="7" fill="#1a1a1f" />
    <ellipse cx="120" cy="100" rx="6" ry="7" fill="#1a1a1f" />
    <circle cx="82" cy="97" r="2" fill="#fff" />
    <circle cx="122" cy="97" r="2" fill="#fff" />
    <ellipse cx="100" cy="120" rx="6" ry="4" fill="#1a1a1f" />
    <path d="M90 135 Q100 142 110 135" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* bowtie */}
    <path d="M100 178 L78 168 L78 188 Z" fill="#d62828" />
    <path d="M100 178 L122 168 L122 188 Z" fill="#d62828" />
    <circle cx="100" cy="178" r="6" fill="#9b1c1c" />
  </svg>
);

// ───────────────────────── 3. Panda + sunglasses ─────────────────────────
const Panda: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* ears */}
    <circle cx="55" cy="60" r="20" fill="#1a1a1f" />
    <circle cx="145" cy="60" r="20" fill="#1a1a1f" />
    {/* head */}
    <circle cx="100" cy="110" r="60" fill="#f0f0f0" />
    {/* sunglasses */}
    <rect x="60" y="100" width="35" height="22" rx="4" fill="#1a1a1f" />
    <rect x="105" y="100" width="35" height="22" rx="4" fill="#1a1a1f" />
    <rect x="93" y="108" width="14" height="4" fill="#1a1a1f" />
    <rect x="64" y="104" width="10" height="4" fill="#3a3a44" />
    <rect x="109" y="104" width="10" height="4" fill="#3a3a44" />
    {/* nose & mouth */}
    <ellipse cx="100" cy="135" rx="6" ry="4" fill="#1a1a1f" />
    <path d="M88 150 Q100 158 112 150" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

// ───────────────────────── 4. Tiger + headphones ─────────────────────────
const Tiger: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* ears */}
    <path d="M55 95 L42 50 L80 75 Z" fill="#e8732e" />
    <path d="M145 95 L158 50 L120 75 Z" fill="#e8732e" />
    <path d="M58 87 L48 60 L74 78 Z" fill="#1a1a1f" />
    <path d="M142 87 L152 60 L126 78 Z" fill="#1a1a1f" />
    {/* head */}
    <ellipse cx="100" cy="125" rx="55" ry="50" fill="#e8a047" />
    <ellipse cx="100" cy="142" rx="36" ry="26" fill="#fff5ea" />
    {/* stripes */}
    <path d="M55 100 Q60 95 64 105" stroke="#1a1a1f" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M145 100 Q140 95 136 105" stroke="#1a1a1f" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M65 125 Q72 122 78 130" stroke="#1a1a1f" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M135 125 Q128 122 122 130" stroke="#1a1a1f" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M95 88 L98 100" stroke="#1a1a1f" strokeWidth="3" strokeLinecap="round" />
    <path d="M105 88 L102 100" stroke="#1a1a1f" strokeWidth="3" strokeLinecap="round" />
    {/* face */}
    <ellipse cx="80" cy="118" rx="6" ry="7" fill="#1a1a1f" />
    <ellipse cx="120" cy="118" rx="6" ry="7" fill="#1a1a1f" />
    <circle cx="82" cy="115" r="2" fill="#fff" />
    <circle cx="122" cy="115" r="2" fill="#fff" />
    <path d="M92 138 Q100 142 108 138 Q106 148 100 150 Q94 148 92 138 Z" fill="#1a1a1f" />
    <path d="M88 156 Q100 164 112 156" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* headphones — band over top */}
    <path d="M50 90 Q100 30 150 90" stroke="#3a3a44" strokeWidth="8" fill="none" strokeLinecap="round" />
    <ellipse cx="50" cy="100" rx="14" ry="18" fill="#d62828" />
    <ellipse cx="150" cy="100" rx="14" ry="18" fill="#d62828" />
  </svg>
);

// ───────────────────────── 5. Lion + crown ─────────────────────────
const Lion: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* mane (puffy ring) */}
    <g fill="#a8651f">
      <circle cx="100" cy="60" r="22" />
      <circle cx="55" cy="100" r="26" />
      <circle cx="145" cy="100" r="26" />
      <circle cx="60" cy="155" r="24" />
      <circle cx="140" cy="155" r="24" />
      <circle cx="100" cy="180" r="22" />
    </g>
    {/* head */}
    <ellipse cx="100" cy="120" rx="48" ry="46" fill="#e8a047" />
    <ellipse cx="100" cy="140" rx="32" ry="22" fill="#fff5ea" />
    {/* face */}
    <ellipse cx="82" cy="118" rx="5.5" ry="7" fill="#1a1a1f" />
    <ellipse cx="118" cy="118" rx="5.5" ry="7" fill="#1a1a1f" />
    <circle cx="84" cy="115" r="1.8" fill="#fff" />
    <circle cx="120" cy="115" r="1.8" fill="#fff" />
    <path d="M92 134 Q100 138 108 134 Q106 142 100 144 Q94 142 92 134 Z" fill="#1a1a1f" />
    <path d="M88 150 Q100 158 112 150" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* crown */}
    <path d="M70 60 L80 40 L90 55 L100 35 L110 55 L120 40 L130 60 Z" fill="#ffd166" stroke="#c89a32" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="80" cy="42" r="3" fill="#d62828" />
    <circle cx="100" cy="38" r="3" fill="#06d6a0" />
    <circle cx="120" cy="42" r="3" fill="#4cc9f0" />
    <rect x="68" y="60" width="64" height="6" fill="#c89a32" />
  </svg>
);

// ───────────────────────── 6. Frog + top hat ─────────────────────────
const Frog: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* top hat */}
    <ellipse cx="100" cy="60" rx="40" ry="6" fill="#1a1a1f" />
    <rect x="72" y="20" width="56" height="42" fill="#1a1a1f" />
    <rect x="72" y="50" width="56" height="6" fill="#c44a3a" />
    {/* eyes (frog eye humps) */}
    <circle cx="68" cy="80" r="22" fill="#7ab83a" />
    <circle cx="132" cy="80" r="22" fill="#7ab83a" />
    <circle cx="68" cy="78" r="14" fill="#fff" />
    <circle cx="132" cy="78" r="14" fill="#fff" />
    <circle cx="70" cy="80" r="6" fill="#1a1a1f" />
    <circle cx="130" cy="80" r="6" fill="#1a1a1f" />
    <circle cx="72" cy="78" r="2" fill="#fff" />
    <circle cx="132" cy="78" r="2" fill="#fff" />
    {/* head/body */}
    <ellipse cx="100" cy="135" rx="62" ry="50" fill="#7ab83a" />
    <ellipse cx="100" cy="155" rx="40" ry="22" fill="#c8e08a" />
    {/* mouth */}
    <path d="M68 145 Q100 175 132 145" stroke="#1a1a1f" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    {/* cheeks */}
    <ellipse cx="65" cy="148" rx="6" ry="3" fill="#f5b8c5" opacity="0.55" />
    <ellipse cx="135" cy="148" rx="6" ry="3" fill="#f5b8c5" opacity="0.55" />
  </svg>
);

// ───────────────────────── 7. Monkey + scarf ─────────────────────────
const Monkey: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* big ears */}
    <circle cx="46" cy="105" r="22" fill="#8c5e2f" />
    <circle cx="154" cy="105" r="22" fill="#8c5e2f" />
    <circle cx="46" cy="105" r="11" fill="#d4a980" />
    <circle cx="154" cy="105" r="11" fill="#d4a980" />
    {/* head */}
    <circle cx="100" cy="105" r="55" fill="#8c5e2f" />
    <ellipse cx="100" cy="120" rx="42" ry="38" fill="#d4a980" />
    {/* face */}
    <ellipse cx="82" cy="100" rx="5.5" ry="7" fill="#1a1a1f" />
    <ellipse cx="118" cy="100" rx="5.5" ry="7" fill="#1a1a1f" />
    <circle cx="84" cy="97" r="1.8" fill="#fff" />
    <circle cx="120" cy="97" r="1.8" fill="#fff" />
    <ellipse cx="100" cy="125" rx="5" ry="3" fill="#1a1a1f" />
    <path d="M86 138 Q100 148 114 138" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* scarf */}
    <path d="M55 165 Q100 145 145 165 L145 185 L55 185 Z" fill="#d62828" />
    <path d="M55 168 L145 168" stroke="#9b1c1c" strokeWidth="2" />
    <path d="M70 173 L80 188 L90 173 L100 188 L110 173 L120 188 L130 173" stroke="#9b1c1c" strokeWidth="2" fill="none" />
  </svg>
);

// ───────────────────────── 8. Koala + beanie ─────────────────────────
const Koala: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* fluffy ears */}
    <circle cx="48" cy="80" r="26" fill="#a8a8b5" />
    <circle cx="152" cy="80" r="26" fill="#a8a8b5" />
    <circle cx="48" cy="84" r="14" fill="#f5dde0" />
    <circle cx="152" cy="84" r="14" fill="#f5dde0" />
    {/* head */}
    <circle cx="100" cy="120" r="56" fill="#a8a8b5" />
    {/* beanie */}
    <path d="M50 92 Q100 30 150 92 L148 60 Q100 12 52 60 Z" fill="#f7c873" />
    <ellipse cx="100" cy="92" rx="50" ry="6" fill="#d49a3c" />
    <circle cx="100" cy="22" r="12" fill="#fff" />
    {/* face */}
    <ellipse cx="80" cy="118" rx="5.5" ry="7" fill="#1a1a1f" />
    <ellipse cx="120" cy="118" rx="5.5" ry="7" fill="#1a1a1f" />
    <circle cx="82" cy="115" r="1.8" fill="#fff" />
    <circle cx="122" cy="115" r="1.8" fill="#fff" />
    <ellipse cx="100" cy="138" rx="14" ry="9" fill="#3a3a44" />
    <path d="M88 152 Q100 158 112 152" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

// ───────────────────────── 9. Dog + baseball cap ─────────────────────────
const Dog: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* floppy ears */}
    <ellipse cx="50" cy="125" rx="20" ry="38" fill="#8c5e2f" />
    <ellipse cx="150" cy="125" rx="20" ry="38" fill="#8c5e2f" />
    {/* head */}
    <ellipse cx="100" cy="125" rx="50" ry="48" fill="#d49a5e" />
    <ellipse cx="100" cy="142" rx="32" ry="24" fill="#fff5ea" />
    {/* baseball cap */}
    <path d="M58 90 Q100 50 142 90 Q142 75 100 50 Q58 75 58 90 Z" fill="#06d6a0" />
    <ellipse cx="100" cy="92" rx="50" ry="6" fill="#069067" />
    <path d="M100 92 Q140 92 152 110 L152 100 Q140 84 100 84 Z" fill="#06d6a0" />
    <circle cx="100" cy="74" r="6" fill="#fff" />
    {/* face */}
    <ellipse cx="82" cy="118" rx="5.5" ry="7" fill="#1a1a1f" />
    <ellipse cx="118" cy="118" rx="5.5" ry="7" fill="#1a1a1f" />
    <circle cx="84" cy="115" r="1.8" fill="#fff" />
    <circle cx="120" cy="115" r="1.8" fill="#fff" />
    <ellipse cx="100" cy="138" rx="6" ry="4" fill="#1a1a1f" />
    <path d="M88 152 Q100 162 112 152" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

// ───────────────────────── 10. Cat + flower crown ─────────────────────────
const Cat: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* ears */}
    <path d="M58 92 L52 50 L84 78 Z" fill="#b8b8c0" />
    <path d="M142 92 L148 50 L116 78 Z" fill="#b8b8c0" />
    <path d="M62 86 L58 60 L78 78 Z" fill="#f0c0d0" />
    <path d="M138 86 L142 60 L122 78 Z" fill="#f0c0d0" />
    {/* head */}
    <ellipse cx="100" cy="120" rx="52" ry="48" fill="#b8b8c0" />
    <ellipse cx="100" cy="140" rx="34" ry="22" fill="#fff5ea" />
    {/* flower crown */}
    <Flower cx={62} cy={70} color="#f5b8c5" />
    <Flower cx={82} cy={56} color="#ffd166" />
    <Flower cx={100} cy={50} color="#fff" />
    <Flower cx={118} cy={56} color="#dca0e6" />
    <Flower cx={138} cy={70} color="#f5b8c5" />
    {/* face */}
    <path d="M75 112 Q83 105 91 112" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M109 112 Q117 105 125 112" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M94 132 L106 132 L100 138 Z" fill="#e08eaa" />
    <path d="M100 138 Q100 144 95 146" stroke="#1a1a1f" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M100 138 Q100 144 105 146" stroke="#1a1a1f" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* whiskers */}
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

// ───────────────────────── 11. Rabbit + heart earrings ─────────────────────────
const Rabbit: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* long ears */}
    <ellipse cx="78" cy="40" rx="11" ry="35" fill="#f5f0e8" />
    <ellipse cx="122" cy="40" rx="11" ry="35" fill="#f5f0e8" />
    <ellipse cx="78" cy="42" rx="6" ry="26" fill="#f0c0d0" />
    <ellipse cx="122" cy="42" rx="6" ry="26" fill="#f0c0d0" />
    {/* head */}
    <ellipse cx="100" cy="125" rx="50" ry="46" fill="#f5f0e8" />
    <ellipse cx="100" cy="140" rx="34" ry="24" fill="#fff" />
    {/* heart earrings */}
    <Heart cx={48} cy={138} fill="#ff5e7e" />
    <Heart cx={152} cy={138} fill="#ff5e7e" />
    <line x1="55" y1="115" x2="51" y2="132" stroke="#9b1c1c" strokeWidth="1.5" />
    <line x1="145" y1="115" x2="149" y2="132" stroke="#9b1c1c" strokeWidth="1.5" />
    {/* face */}
    <ellipse cx="82" cy="118" rx="5.5" ry="7" fill="#1a1a1f" />
    <ellipse cx="118" cy="118" rx="5.5" ry="7" fill="#1a1a1f" />
    <circle cx="84" cy="115" r="1.8" fill="#fff" />
    <circle cx="120" cy="115" r="1.8" fill="#fff" />
    <ellipse cx="68" cy="138" rx="6" ry="3.5" fill="#f5b8c5" opacity="0.65" />
    <ellipse cx="132" cy="138" rx="6" ry="3.5" fill="#f5b8c5" opacity="0.65" />
    <path d="M94 134 Q100 138 106 134 L100 142 Z" fill="#e08eaa" />
    <path d="M100 142 L94 152 M100 142 L106 152" stroke="#1a1a1f" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* buck teeth */}
    <rect x="96" y="148" width="8" height="10" rx="1" fill="#fff" stroke="#d4d4d4" strokeWidth="1" />
  </svg>
);

const Heart = ({ cx, cy, fill }: { cx: number; cy: number; fill: string }) => (
  <path
    d={`M${cx} ${cy + 6} L${cx - 8} ${cy - 2} A5 5 0 0 1 ${cx} ${cy - 4} A5 5 0 0 1 ${cx + 8} ${cy - 2} Z`}
    fill={fill}
  />
);

// ───────────────────────── 12. Mouse + round glasses ─────────────────────────
const Mouse: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* big round ears */}
    <circle cx="50" cy="70" r="28" fill="#b8b8c0" />
    <circle cx="150" cy="70" r="28" fill="#b8b8c0" />
    <circle cx="50" cy="72" r="18" fill="#f5b8c5" />
    <circle cx="150" cy="72" r="18" fill="#f5b8c5" />
    {/* head */}
    <ellipse cx="100" cy="128" rx="50" ry="48" fill="#b8b8c0" />
    <ellipse cx="100" cy="148" rx="30" ry="20" fill="#fff5ea" />
    {/* glasses */}
    <circle cx="80" cy="120" r="12" fill="none" stroke="#1a1a1f" strokeWidth="3" />
    <circle cx="120" cy="120" r="12" fill="none" stroke="#1a1a1f" strokeWidth="3" />
    <line x1="92" y1="120" x2="108" y2="120" stroke="#1a1a1f" strokeWidth="3" />
    <circle cx="80" cy="120" r="9" fill="#fff" opacity="0.4" />
    <circle cx="120" cy="120" r="9" fill="#fff" opacity="0.4" />
    {/* eyes (small dots) */}
    <circle cx="80" cy="120" r="2.5" fill="#1a1a1f" />
    <circle cx="120" cy="120" r="2.5" fill="#1a1a1f" />
    {/* nose & whiskers */}
    <ellipse cx="100" cy="142" rx="4" ry="3" fill="#e08eaa" />
    <path d="M88 158 Q100 164 112 158" stroke="#1a1a1f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <line x1="60" y1="142" x2="80" y2="146" stroke="#1a1a1f" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="60" y1="150" x2="80" y2="150" stroke="#1a1a1f" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="140" y1="142" x2="120" y2="146" stroke="#1a1a1f" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="140" y1="150" x2="120" y2="150" stroke="#1a1a1f" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

// ───────────────────────── 13. Hamster + cowboy hat ─────────────────────────
const Hamster: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* ears */}
    <circle cx="62" cy="78" r="14" fill="#b88654" />
    <circle cx="138" cy="78" r="14" fill="#b88654" />
    {/* head */}
    <circle cx="100" cy="120" r="58" fill="#d4a980" />
    <ellipse cx="100" cy="140" rx="40" ry="28" fill="#fff5ea" />
    {/* cheeks puffed */}
    <ellipse cx="55" cy="138" rx="14" ry="18" fill="#d4a980" />
    <ellipse cx="145" cy="138" rx="14" ry="18" fill="#d4a980" />
    {/* cowboy hat */}
    <ellipse cx="100" cy="78" rx="58" ry="8" fill="#7a4a1a" />
    <path d="M60 78 Q70 30 100 28 Q130 30 140 78 Z" fill="#a26939" />
    <path d="M58 78 Q100 86 142 78" stroke="#7a4a1a" strokeWidth="3" fill="none" />
    <circle cx="100" cy="50" r="4" fill="#ffd166" />
    {/* face */}
    <ellipse cx="82" cy="115" rx="5.5" ry="7" fill="#1a1a1f" />
    <ellipse cx="118" cy="115" rx="5.5" ry="7" fill="#1a1a1f" />
    <circle cx="84" cy="112" r="1.8" fill="#fff" />
    <circle cx="120" cy="112" r="1.8" fill="#fff" />
    <ellipse cx="100" cy="135" rx="4" ry="3" fill="#e08eaa" />
    <path d="M88 150 Q100 158 112 150" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

// ───────────────────────── 14. Wolf + bandana ─────────────────────────
const Wolf: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* ears */}
    <path d="M52 90 L42 38 L82 70 Z" fill="#5e6e80" />
    <path d="M148 90 L158 38 L118 70 Z" fill="#5e6e80" />
    <path d="M58 82 L52 50 L74 70 Z" fill="#3a3a44" />
    <path d="M142 82 L148 50 L126 70 Z" fill="#3a3a44" />
    {/* head */}
    <ellipse cx="100" cy="118" rx="52" ry="46" fill="#5e6e80" />
    <ellipse cx="100" cy="135" rx="32" ry="22" fill="#a8a8b5" />
    <path d="M90 86 Q100 78 110 86 L108 106 Q100 100 92 106 Z" fill="#a8a8b5" />
    {/* face */}
    <ellipse cx="80" cy="115" rx="5.5" ry="7" fill="#ffd166" />
    <ellipse cx="120" cy="115" rx="5.5" ry="7" fill="#ffd166" />
    <ellipse cx="80" cy="115" rx="2.5" ry="4" fill="#1a1a1f" />
    <ellipse cx="120" cy="115" rx="2.5" ry="4" fill="#1a1a1f" />
    <path d="M92 130 Q100 134 108 130 Q106 140 100 142 Q94 140 92 130 Z" fill="#1a1a1f" />
    <path d="M88 148 Q100 154 112 148" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* bandana */}
    <path d="M50 168 Q100 150 150 168 L150 185 L50 185 Z" fill="#d62828" />
    <circle cx="78" cy="174" r="2.5" fill="#fff" />
    <circle cx="100" cy="170" r="2.5" fill="#fff" />
    <circle cx="122" cy="174" r="2.5" fill="#fff" />
    <circle cx="65" cy="180" r="2" fill="#fff" />
    <circle cx="135" cy="180" r="2" fill="#fff" />
    <path d="M150 168 L168 175 L155 185 Z" fill="#9b1c1c" />
  </svg>
);

// ───────────────────────── 15. Raccoon + earmuffs ─────────────────────────
const Raccoon: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* ears */}
    <circle cx="62" cy="76" r="14" fill="#5e6e80" />
    <circle cx="138" cy="76" r="14" fill="#5e6e80" />
    {/* head */}
    <ellipse cx="100" cy="124" rx="54" ry="50" fill="#8a8a98" />
    <ellipse cx="100" cy="140" rx="38" ry="28" fill="#f0f0f0" />
    {/* mask */}
    <path d="M60 110 Q80 120 100 116 Q120 120 140 110 L138 130 Q120 140 100 134 Q80 140 62 130 Z" fill="#1a1a1f" />
    {/* earmuffs */}
    <path d="M52 60 Q100 30 148 60" stroke="#d62828" strokeWidth="6" fill="none" strokeLinecap="round" />
    <ellipse cx="52" cy="80" rx="14" ry="16" fill="#ff8aa3" />
    <ellipse cx="148" cy="80" rx="14" ry="16" fill="#ff8aa3" />
    <ellipse cx="52" cy="80" rx="9" ry="11" fill="#ffd9e2" />
    <ellipse cx="148" cy="80" rx="9" ry="11" fill="#ffd9e2" />
    {/* face */}
    <ellipse cx="80" cy="118" rx="5.5" ry="6" fill="#fff" />
    <ellipse cx="120" cy="118" rx="5.5" ry="6" fill="#fff" />
    <circle cx="80" cy="118" r="3" fill="#1a1a1f" />
    <circle cx="120" cy="118" r="3" fill="#1a1a1f" />
    <ellipse cx="100" cy="138" rx="5" ry="3.5" fill="#1a1a1f" />
    <path d="M88 152 Q100 158 112 152" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

// ───────────────────────── 16. Unicorn + sparkles ─────────────────────────
const Unicorn: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* ears */}
    <path d="M62 80 L52 40 L82 70 Z" fill="#f5f0e8" />
    <path d="M138 80 L148 40 L118 70 Z" fill="#f5f0e8" />
    <path d="M66 76 L58 50 L76 70 Z" fill="#f0c0d0" />
    <path d="M134 76 L142 50 L124 70 Z" fill="#f0c0d0" />
    {/* horn */}
    <defs>
      <linearGradient id="horn-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ff5e7e" />
        <stop offset="50%" stopColor="#ffd166" />
        <stop offset="100%" stopColor="#4cc9f0" />
      </linearGradient>
    </defs>
    <path d="M92 70 L100 14 L108 70 Z" fill="url(#horn-grad)" stroke="#c89a32" strokeWidth="1.5" />
    <path d="M95 30 L105 30 M93 50 L107 50" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
    {/* mane */}
    <path d="M62 100 Q42 95 50 75 Q38 60 60 56 Q56 38 80 50" fill="#ff5e7e" />
    <path d="M138 100 Q158 95 150 75 Q162 60 140 56 Q144 38 120 50" fill="#4cc9f0" />
    {/* head */}
    <ellipse cx="100" cy="125" rx="52" ry="48" fill="#f5f0e8" />
    <ellipse cx="100" cy="148" rx="32" ry="22" fill="#fff" />
    {/* sparkles */}
    <Sparkle cx={40} cy={45} />
    <Sparkle cx={160} cy={45} />
    <Sparkle cx={50} cy={130} />
    {/* face */}
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

// ───────────────────────── 17. Turtle + sun visor ─────────────────────────
const Turtle: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* shell behind */}
    <ellipse cx="100" cy="155" rx="80" ry="40" fill="#5a8a2a" />
    <path d="M40 155 Q100 130 160 155" stroke="#3a6a1a" strokeWidth="3" fill="none" />
    <circle cx="70" cy="150" r="10" fill="#3a6a1a" opacity="0.4" />
    <circle cx="100" cy="142" r="10" fill="#3a6a1a" opacity="0.4" />
    <circle cx="130" cy="150" r="10" fill="#3a6a1a" opacity="0.4" />
    {/* head */}
    <ellipse cx="100" cy="100" rx="50" ry="46" fill="#7ab83a" />
    <ellipse cx="100" cy="115" rx="32" ry="20" fill="#c8e08a" />
    {/* sun visor */}
    <path d="M50 75 Q100 50 150 75 L150 65 Q100 40 50 65 Z" fill="#06d6a0" />
    <ellipse cx="100" cy="76" rx="50" ry="4" fill="#069067" />
    <path d="M50 75 L25 85 L155 95 L175 85 Q160 78 100 78 Q40 78 50 75 Z" fill="#06d6a0" opacity="0.9" />
    {/* face */}
    <ellipse cx="82" cy="98" rx="5.5" ry="7" fill="#1a1a1f" />
    <ellipse cx="118" cy="98" rx="5.5" ry="7" fill="#1a1a1f" />
    <circle cx="84" cy="95" r="1.8" fill="#fff" />
    <circle cx="120" cy="95" r="1.8" fill="#fff" />
    <ellipse cx="68" cy="115" rx="5" ry="3" fill="#f5b8c5" opacity="0.55" />
    <ellipse cx="132" cy="115" rx="5" ry="3" fill="#f5b8c5" opacity="0.55" />
    <path d="M88 122 Q100 130 112 122" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

// ───────────────────────── 18. Octopus + star sunglasses ─────────────────────────
const Octopus: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* tentacles */}
    {[40, 70, 100, 130, 160].map((x, i) => (
      <path
        key={i}
        d={`M${x} 130 Q${x + (i % 2 ? 6 : -6)} 165 ${x + (i % 2 ? 12 : -12)} 188`}
        stroke="#b56fb8"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />
    ))}
    {/* head/body */}
    <ellipse cx="100" cy="100" rx="68" ry="58" fill="#b56fb8" />
    <ellipse cx="100" cy="120" rx="40" ry="22" fill="#dca0e6" />
    {/* star sunglasses */}
    <Star cx={80} cy={92} size={18} fill="#1a1a1f" />
    <Star cx={120} cy={92} size={18} fill="#1a1a1f" />
    <line x1="92" y1="92" x2="108" y2="92" stroke="#1a1a1f" strokeWidth="3" />
    {/* tiny pupils */}
    <circle cx="80" cy="93" r="2.5" fill="#fff" />
    <circle cx="120" cy="93" r="2.5" fill="#fff" />
    {/* mouth */}
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

// ───────────────────────── 19. Owl + graduation cap ─────────────────────────
const Owl: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* tufts */}
    <path d="M58 76 L52 50 L72 68 Z" fill="#7a4a1a" />
    <path d="M142 76 L148 50 L128 68 Z" fill="#7a4a1a" />
    {/* head */}
    <ellipse cx="100" cy="120" rx="58" ry="56" fill="#a26939" />
    <ellipse cx="100" cy="125" rx="40" ry="38" fill="#f5e0c0" />
    {/* eye discs */}
    <circle cx="78" cy="118" r="18" fill="#fff5ea" stroke="#7a4a1a" strokeWidth="2" />
    <circle cx="122" cy="118" r="18" fill="#fff5ea" stroke="#7a4a1a" strokeWidth="2" />
    <circle cx="78" cy="118" r="9" fill="#1a1a1f" />
    <circle cx="122" cy="118" r="9" fill="#1a1a1f" />
    <circle cx="80" cy="115" r="3" fill="#fff" />
    <circle cx="124" cy="115" r="3" fill="#fff" />
    {/* beak */}
    <path d="M92 138 L100 152 L108 138 Z" fill="#ffa94a" />
    {/* graduation cap */}
    <rect x="60" y="60" width="80" height="10" fill="#1a1a1f" />
    <path d="M50 60 L100 38 L150 60 L100 78 Z" fill="#1a1a1f" />
    <line x1="100" y1="38" x2="148" y2="48" stroke="#ffd166" strokeWidth="2" />
    <circle cx="148" cy="48" r="5" fill="#ffd166" />
    <path d="M148 48 L155 64" stroke="#ffd166" strokeWidth="2" />
  </svg>
);

// ───────────────────────── 20. Giraffe + tiny top hat ─────────────────────────
const Giraffe: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* ossicones */}
    <rect x="76" y="40" width="6" height="20" fill="#a26939" rx="2" />
    <rect x="118" y="40" width="6" height="20" fill="#a26939" rx="2" />
    <circle cx="79" cy="40" r="6" fill="#7a4a1a" />
    <circle cx="121" cy="40" r="6" fill="#7a4a1a" />
    {/* tiny top hat */}
    <ellipse cx="100" cy="58" rx="22" ry="3" fill="#1a1a1f" />
    <rect x="86" y="34" width="28" height="24" fill="#1a1a1f" />
    <rect x="86" y="48" width="28" height="4" fill="#06d6a0" />
    {/* head */}
    <ellipse cx="100" cy="120" rx="46" ry="58" fill="#f5cb74" />
    <ellipse cx="100" cy="148" rx="32" ry="20" fill="#fff5ea" />
    {/* spots */}
    <circle cx="72" cy="110" r="8" fill="#a26939" />
    <circle cx="128" cy="110" r="8" fill="#a26939" />
    <circle cx="68" cy="140" r="6" fill="#a26939" />
    <circle cx="132" cy="140" r="6" fill="#a26939" />
    <circle cx="100" cy="92" r="6" fill="#a26939" />
    {/* face */}
    <ellipse cx="86" cy="118" rx="5" ry="6" fill="#1a1a1f" />
    <ellipse cx="114" cy="118" rx="5" ry="6" fill="#1a1a1f" />
    <circle cx="88" cy="115" r="1.6" fill="#fff" />
    <circle cx="116" cy="115" r="1.6" fill="#fff" />
    <ellipse cx="100" cy="148" rx="5" ry="3" fill="#1a1a1f" />
    <path d="M88 158 Q100 164 112 158" stroke="#1a1a1f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </svg>
);

// ───────────────────────── 21. Whale + sailor hat ─────────────────────────
const Whale: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* spout */}
    <path d="M96 30 Q92 18 96 8 M104 30 Q108 18 104 8 M100 28 L100 14" stroke="#4cc9f0" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
    {/* head */}
    <ellipse cx="100" cy="125" rx="68" ry="50" fill="#4d8fc4" />
    <ellipse cx="100" cy="148" rx="46" ry="28" fill="#82b6db" />
    {/* tail flick */}
    <path d="M168 110 L188 100 L186 122 Z" fill="#4d8fc4" />
    <path d="M168 110 L188 130 L186 118 Z" fill="#4d8fc4" />
    {/* sailor hat */}
    <ellipse cx="100" cy="78" rx="40" ry="6" fill="#fff" />
    <path d="M64 78 Q70 50 100 50 Q130 50 136 78 Z" fill="#fff" />
    <rect x="78" y="74" width="44" height="6" fill="#1a1a1f" />
    <circle cx="100" cy="60" r="6" fill="#d62828" />
    {/* face */}
    <ellipse cx="80" cy="120" rx="5.5" ry="7" fill="#1a1a1f" />
    <ellipse cx="120" cy="120" rx="5.5" ry="7" fill="#1a1a1f" />
    <circle cx="82" cy="117" r="2" fill="#fff" />
    <circle cx="122" cy="117" r="2" fill="#fff" />
    <path d="M85 145 Q100 158 115 145" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    <ellipse cx="68" cy="138" rx="5" ry="3" fill="#f5b8c5" opacity="0.5" />
    <ellipse cx="132" cy="138" rx="5" ry="3" fill="#f5b8c5" opacity="0.5" />
  </svg>
);

// ───────────────────────── 22. Long-neck dino + chef hat ─────────────────────────
const Dino: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* chef hat */}
    <ellipse cx="100" cy="60" rx="28" ry="6" fill="#fff" />
    <path d="M76 60 Q60 30 100 22 Q140 30 124 60 Z" fill="#fff" />
    <circle cx="80" cy="34" r="10" fill="#fff" />
    <circle cx="120" cy="34" r="10" fill="#fff" />
    <circle cx="100" cy="22" r="11" fill="#fff" />
    <ellipse cx="100" cy="62" rx="28" ry="3" fill="#e0e0e0" />
    {/* neck */}
    <rect x="92" y="100" width="16" height="80" fill="#5fa15f" rx="6" />
    {/* head */}
    <ellipse cx="100" cy="100" rx="44" ry="38" fill="#5fa15f" />
    <ellipse cx="100" cy="115" rx="28" ry="16" fill="#a8d178" />
    {/* spots */}
    <circle cx="70" cy="92" r="5" fill="#3f6f3a" />
    <circle cx="130" cy="92" r="5" fill="#3f6f3a" />
    <circle cx="100" cy="85" r="4" fill="#3f6f3a" />
    {/* face */}
    <ellipse cx="84" cy="98" rx="5.5" ry="7" fill="#1a1a1f" />
    <ellipse cx="116" cy="98" rx="5.5" ry="7" fill="#1a1a1f" />
    <circle cx="86" cy="95" r="1.8" fill="#fff" />
    <circle cx="118" cy="95" r="1.8" fill="#fff" />
    <ellipse cx="100" cy="113" rx="3" ry="2" fill="#1a1a1f" />
    <path d="M88 122 Q100 128 112 122" stroke="#1a1a1f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </svg>
);

// ───────────────────────── 23. T-Rex + pirate hat ─────────────────────────
const Trex: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* pirate hat */}
    <path d="M40 70 Q60 30 100 30 Q140 30 160 70 Q120 60 100 60 Q80 60 40 70 Z" fill="#1a1a1f" />
    <path d="M85 50 L100 35 L115 50 M90 55 L100 42 L110 55" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
    <circle cx="100" cy="48" r="5" fill="#fff" />
    {/* head */}
    <ellipse cx="100" cy="120" rx="56" ry="50" fill="#c44a3a" />
    <ellipse cx="100" cy="142" rx="40" ry="26" fill="#e08e7e" />
    {/* eye ridge */}
    <path d="M55 105 Q80 95 100 105 Q120 95 145 105" stroke="#7a2a20" strokeWidth="3" fill="none" />
    {/* face */}
    <ellipse cx="80" cy="115" rx="5.5" ry="7" fill="#ffd166" />
    <ellipse cx="120" cy="115" rx="5.5" ry="7" fill="#ffd166" />
    <ellipse cx="80" cy="115" rx="2.5" ry="4" fill="#1a1a1f" />
    <ellipse cx="120" cy="115" rx="2.5" ry="4" fill="#1a1a1f" />
    {/* teeth */}
    <path d="M76 148 L82 158 L88 148 L94 158 L100 148 L106 158 L112 148 L118 158 L124 148" stroke="#fff" strokeWidth="2.5" fill="#fff" />
    <path d="M70 144 Q100 150 130 144 L130 148 Q100 154 70 148 Z" fill="#1a1a1f" />
    {/* nostrils */}
    <circle cx="92" cy="132" r="2" fill="#1a1a1f" />
    <circle cx="108" cy="132" r="2" fill="#1a1a1f" />
  </svg>
);

// ───────────────────────── 24. Dragon + wizard hat ─────────────────────────
const Dragon: SvgComp = (p) => (
  <svg viewBox={VB} {...p}>
    {/* wizard hat */}
    <ellipse cx="100" cy="60" rx="42" ry="5" fill="#3d2960" />
    <path d="M65 60 L100 6 L135 60 Z" fill="#5b3d8c" />
    <path d="M70 58 L100 8 L100 58 Z" fill="#6f4ba6" />
    <Sparkle cx={88} cy={32} />
    <Sparkle cx={110} cy={42} />
    {/* horns */}
    <path d="M50 90 L40 60 L62 78 Z" fill="#7a2a20" />
    <path d="M150 90 L160 60 L138 78 Z" fill="#7a2a20" />
    {/* head */}
    <ellipse cx="100" cy="125" rx="54" ry="48" fill="#c44a3a" />
    <ellipse cx="100" cy="148" rx="36" ry="24" fill="#e08e7e" />
    {/* scales */}
    <path d="M70 100 Q80 96 90 100 M110 100 Q120 96 130 100" stroke="#7a2a20" strokeWidth="2" fill="none" />
    {/* face */}
    <ellipse cx="80" cy="118" rx="5.5" ry="8" fill="#ffd166" />
    <ellipse cx="120" cy="118" rx="5.5" ry="8" fill="#ffd166" />
    <ellipse cx="80" cy="118" rx="2" ry="5" fill="#1a1a1f" />
    <ellipse cx="120" cy="118" rx="2" ry="5" fill="#1a1a1f" />
    <circle cx="92" cy="138" r="2.5" fill="#1a1a1f" />
    <circle cx="108" cy="138" r="2.5" fill="#1a1a1f" />
    <path d="M86 150 Q100 162 114 150" stroke="#1a1a1f" strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* tiny puff of smoke */}
    <circle cx="58" cy="148" r="4" fill="#a8a8b5" opacity="0.6" />
    <circle cx="50" cy="142" r="3" fill="#a8a8b5" opacity="0.4" />
  </svg>
);

const AVATAR_MAP: Record<string, SvgComp> = {
  fox: Fox,
  bear: Bear,
  panda: Panda,
  tiger: Tiger,
  lion: Lion,
  frog: Frog,
  monkey: Monkey,
  koala: Koala,
  dog: Dog,
  cat: Cat,
  rabbit: Rabbit,
  mouse: Mouse,
  hamster: Hamster,
  wolf: Wolf,
  raccoon: Raccoon,
  unicorn: Unicorn,
  turtle: Turtle,
  octopus: Octopus,
  owl: Owl,
  giraffe: Giraffe,
  whale: Whale,
  dino: Dino,
  trex: Trex,
  dragon: Dragon,
};

export const AVATAR_IDS = Object.keys(AVATAR_MAP);
