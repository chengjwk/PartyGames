import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyTheme, getStoredTheme } from "./lib/theme";

// Apply the stored theme synchronously before React renders so the page
// doesn't flash the wrong palette on first paint.
applyTheme(getStoredTheme());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
