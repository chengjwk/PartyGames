import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import Home from "./routes/Home";
import Host from "./routes/Host";
import Play from "./routes/Play";
import MathHost from "./routes/MathHost";
import MathPlay from "./routes/MathPlay";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host/word/:room" element={<Host />} />
        <Route path="/play/word/:room" element={<Play />} />
        <Route path="/host/math/:room" element={<MathHost />} />
        <Route path="/play/math/:room" element={<MathPlay />} />
        {/* Backwards compat for QR codes pre-game-picker: assume WordHive */}
        <Route path="/host/:room" element={<LegacyRedirect base="host" />} />
        <Route path="/play/:room" element={<LegacyRedirect base="play" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function LegacyRedirect({ base }: { base: "host" | "play" }) {
  const { room } = useParams<{ room: string }>();
  return <Navigate to={`/${base}/word/${room}`} replace />;
}
