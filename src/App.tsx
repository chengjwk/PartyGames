import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./routes/Home";
import LobbyHost from "./routes/LobbyHost";
import LobbyPlay from "./routes/LobbyPlay";
import Host from "./routes/Host";
import Play from "./routes/Play";
import MathHost from "./routes/MathHost";
import MathPlay from "./routes/MathPlay";
import PollinartHost from "./routes/PollinartHost";
import PollinartPlay from "./routes/PollinartPlay";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Pre-game lobby — players gather, host picks the game */}
        <Route path="/host/:room" element={<LobbyHost />} />
        <Route path="/play/:room" element={<LobbyPlay />} />
        {/* Game-specific pages, navigated to from the lobby after pick */}
        <Route path="/host/word/:room" element={<Host />} />
        <Route path="/play/word/:room" element={<Play />} />
        <Route path="/host/math/:room" element={<MathHost />} />
        <Route path="/play/math/:room" element={<MathPlay />} />
        <Route path="/host/draw/:room" element={<PollinartHost />} />
        <Route path="/play/draw/:room" element={<PollinartPlay />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
