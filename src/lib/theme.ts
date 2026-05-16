// Light/dark theme toggle. Theme is stored in localStorage and applied
// to <html data-theme="..."> so the CSS variables in index.css cascade
// across the whole app. Multiple ThemeToggle instances stay in sync via
// a CustomEvent dispatched on window.

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const THEME_KEY = "partygames.theme";
const CHANGE_EVENT = "partygames:theme-change";

export function getStoredTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore (private mode etc.)
  }
  window.dispatchEvent(new CustomEvent<Theme>(CHANGE_EVENT, { detail: theme }));
}

// Hook for components that need to observe the current theme (e.g., a
// toggle button's icon). Returns the current theme + a setter.
export function useTheme(): [Theme, (next: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<Theme>).detail;
      if (detail === "light" || detail === "dark") setTheme(detail);
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);
  return [theme, applyTheme];
}
