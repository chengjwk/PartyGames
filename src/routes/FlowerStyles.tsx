// Design preview route — shows several flower-style variants
// side-by-side so we can pick which one to roll out across the
// three lobby slots. Not linked from anywhere in production; visit
// /flower-styles in dev to compare.

import GardenBackground from "../components/GardenBackground";
import FullscreenButton from "../components/FullscreenButton";
import ThemeToggle from "../components/ThemeToggle";
import PetalFlowerCurrent from "../components/PetalFlower";
import PetalFlowerBold from "../components/styles/PetalFlowerBold";
import PetalFlowerPainterly from "../components/styles/PetalFlowerPainterly";
import PetalFlowerSunflower from "../components/styles/PetalFlowerSunflower";
import PetalFlowerGeometric from "../components/styles/PetalFlowerGeometric";

const COLOR = "#f5a300"; // deeper saturated gold (less pastel than #f7c84a)
const EDGE = "#3a2a14";

export default function FlowerStyles() {
  const centerContent = (
    <text
      x={0}
      y={0}
      fontSize={26}
      textAnchor="middle"
      dominantBaseline="central"
      style={{ userSelect: "none" }}
    >
      🐝
    </text>
  );
  const stemLength = 160;
  const scale = 1.1;

  const items: Array<{
    key: string;
    label: string;
    blurb: string;
    flower: React.ReactNode;
  }> = [
    {
      key: "current",
      label: "A. Current",
      blurb: "5 overlapping round petals, dark outline, single leaf.",
      flower: (
        <PetalFlowerCurrent
          petalColor={COLOR}
          petalEdge={EDGE}
          stemLength={stemLength}
          scale={scale}
          centerContent={centerContent}
        />
      ),
    },
    {
      key: "bold",
      label: "B. Bold cartoon",
      blurb:
        "Thicker black outlines, punchier fill, gentle highlight. Reads at a glance.",
      flower: (
        <PetalFlowerBold
          petalColor={COLOR}
          petalEdge={EDGE}
          stemLength={stemLength}
          scale={scale}
          centerContent={centerContent}
        />
      ),
    },
    {
      key: "painterly",
      label: "C. Painterly",
      blurb:
        "Gradient tip shading on each petal + soft inner glow. Feels hand-painted.",
      flower: (
        <PetalFlowerPainterly
          petalColor={COLOR}
          petalEdge={EDGE}
          stemLength={stemLength}
          scale={scale}
          centerContent={centerContent}
        />
      ),
    },
    {
      key: "sunflower",
      label: "D. Sunflower",
      blurb:
        "Many narrow petals fanning around a fat textured center. Bigger silhouette.",
      flower: (
        <PetalFlowerSunflower
          petalColor={COLOR}
          petalEdge={EDGE}
          stemLength={stemLength}
          scale={scale}
          centerContent={centerContent}
        />
      ),
    },
    {
      key: "geometric",
      label: "E. Geometric",
      blurb:
        "Flat, sharp-tipped petals, no outline. Modern / app-icon flavor.",
      flower: (
        <PetalFlowerGeometric
          petalColor={COLOR}
          petalEdge={EDGE}
          stemLength={stemLength}
          scale={scale}
          centerContent={centerContent}
        />
      ),
    },
  ];

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
          padding: "60px 24px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          color: "var(--fg)",
        }}
      >
        <h1 style={{ margin: 0, color: "var(--accent)" }}>Flower styles</h1>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Visual comparison for the WordHive picker flower. Tell me which
          letter you want and I'll roll it out across all three games (color
          per game). Backdrop here is the new less-pastel garden palette.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
            alignItems: "end",
            justifyItems: "center",
            marginTop: 12,
            paddingBottom: 32,
          }}
        >
          {items.map((it) => (
            <div
              key={it.key}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                background: "rgba(0,0,0,0.32)",
                backdropFilter: "blur(4px)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "12px 12px 16px",
                width: "100%",
                maxWidth: 320,
              }}
            >
              <div style={{ flex: 1, display: "flex", alignItems: "end" }}>
                {it.flower}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{it.label}</div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  textAlign: "center",
                  lineHeight: 1.35,
                }}
              >
                {it.blurb}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
