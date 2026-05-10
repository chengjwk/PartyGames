import { useEffect, useState } from "react";

interface TimerProps {
  endsAt: number; // ms epoch
  size?: number;
}

export default function Timer({ endsAt, size = 96 }: TimerProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(i);
  }, []);
  const remainMs = Math.max(0, endsAt - now);
  const remainS = Math.ceil(remainMs / 1000);
  const urgent = remainMs < 10_000;

  return (
    <div
      style={{
        fontSize: size,
        fontWeight: 800,
        fontVariantNumeric: "tabular-nums",
        color: urgent ? "#ff5e5e" : "var(--fg)",
        lineHeight: 1,
      }}
    >
      {String(Math.floor(remainS / 60)).padStart(1, "0")}:
      {String(remainS % 60).padStart(2, "0")}
    </div>
  );
}
