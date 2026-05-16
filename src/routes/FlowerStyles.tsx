// Design preview route — bold-cartoon flower lineup for picking
// which species goes in each lobby slot. Each card shows the same
// flower in three palettes (gold / royal blue / white-ish) so you
// can see how the species reads at WordHive / MathHive / Pollinart
// color treatments. Not linked from anywhere in production.

import GardenBackground from "../components/GardenBackground";
import FullscreenButton from "../components/FullscreenButton";
import ThemeToggle from "../components/ThemeToggle";
import PetalFlowerBold from "../components/styles/PetalFlowerBold";
import SunflowerBold from "../components/styles/SunflowerBold";
import TulipBold from "../components/styles/TulipBold";
import PoppyBold from "../components/styles/PoppyBold";
import DaffodilBold from "../components/styles/DaffodilBold";
import CherryBlossomBold from "../components/styles/CherryBlossomBold";

const EDGE = "#1a1006";

// Three palettes, matching the production lobby flowers so you can
// preview each species in each game's color.
const PALETTES: Array<{ name: string; petal: string }> = [
  { name: "Honey gold (WordHive)", petal: "#f5a300" },
  { name: "Royal blue (MathHive)", petal: "#3a76db" },
  { name: "Soft white (Pollinart)", petal: "#fafaf2" },
];

type FlowerKind =
  | "petal"
  | "sunflower"
  | "tulip"
  | "poppy"
  | "daffodil"
  | "cherryblossom";

const SPECIES: Array<{
  key: FlowerKind;
  label: string;
  blurb: string;
}> = [
  {
    key: "petal",
    label: "5-petal (current bold cartoon)",
    blurb:
      "The simple round-petal silhouette in bold-cartoon treatment. Tidy and unambiguous.",
  },
  {
    key: "sunflower",
    label: "Sunflower",
    blurb:
      "Fat seedy disc + 14 chunky petals, all in bold cartoon. Biggest, most generous silhouette.",
  },
  {
    key: "tulip",
    label: "Tulip",
    blurb:
      "Three overlapping cup-petals on a tall stem with sword leaves. Reads as a classic spring tulip.",
  },
  {
    key: "poppy",
    label: "Poppy",
    blurb:
      "Five wide crinkled petals around a dark seed pod with stamen dots. Papery, slightly wild.",
  },
  {
    key: "daffodil",
    label: "Daffodil",
    blurb:
      "Six pointed star petals behind a trumpet corona. Unmistakable daffodil profile.",
  },
  {
    key: "cherryblossom",
    label: "Cherry blossom",
    blurb:
      "Five notched petals with tiny stamens. Springy and lighter; reads delicate.",
  },
];

function renderFlower(
  kind: FlowerKind,
  petal: string,
  stemLength: number,
  scale: number,
  centerContent: React.ReactNode,
) {
  const common = {
    petalColor: petal,
    petalEdge: EDGE,
    centerContent,
    stemLength,
    scale,
  };
  switch (kind) {
    case "petal":
      return <PetalFlowerBold {...common} />;
    case "sunflower":
      return <SunflowerBold {...common} />;
    case "tulip":
      return <TulipBold {...common} />;
    case "poppy":
      return <PoppyBold {...common} />;
    case "daffodil":
      return <DaffodilBold {...common} />;
    case "cherryblossom":
      return <CherryBlossomBold {...common} />;
  }
}

export default function FlowerStyles() {
  const centerContent = (
    <text
      x={0}
      y={0}
      fontSize={20}
      textAnchor="middle"
      dominantBaseline="central"
      style={{ userSelect: "none" }}
    >
      🐝
    </text>
  );
  const stemLength = 140;
  const scale = 0.85;

  return (
    <>
      <GardenBackground />
      <FullscreenButton />
      <ThemeToggle />
      <style>{`
        @keyframes lily-bloom {
          0%   { transform: scale(0.85); }
          50%  { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
      <main
        style={{
          minHeight: "100dvh",
          padding: "60px 20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          color: "var(--fg)",
        }}
      >
        <h1 style={{ margin: 0, color: "var(--accent)" }}>
          Flower lineup — bold cartoon
        </h1>
        <p style={{ color: "var(--muted)", marginTop: 0, maxWidth: 720 }}>
          Six species in bold-cartoon style, each shown in the three lobby
          palettes (WordHive gold / MathHive royal blue / Pollinart white).
          Pick one species per game and I'll wire it up.
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            paddingBottom: 32,
          }}
        >
          {SPECIES.map((s) => (
            <section
              key={s.key}
              style={{
                background: "rgba(0,0,0,0.32)",
                backdropFilter: "blur(4px)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "14px 14px 18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 22 }}>{s.label}</h2>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  ({s.key})
                </span>
              </div>
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: 14,
                  marginTop: 4,
                  marginBottom: 14,
                  lineHeight: 1.4,
                }}
              >
                {s.blurb}
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16,
                  alignItems: "end",
                  justifyItems: "center",
                }}
              >
                {PALETTES.map((p) => (
                  <div
                    key={p.name}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {renderFlower(
                      s.key,
                      p.petal,
                      stemLength,
                      scale,
                      centerContent,
                    )}
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      {p.name}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
