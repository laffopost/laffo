import { createContext, useContext, useEffect, useState, useMemo } from "react";

const THEME_KEY = "laffo_theme";
const VALID_THEMES = ["dark", "light"];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem(THEME_KEY);
    return VALID_THEMES.includes(stored) ? stored : "dark";
  });

  useEffect(() => {
    const body = document.body;
    body.classList.remove("dark", "light");
    body.classList.add(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const value = useMemo(() => ({ theme, toggleTheme }), [theme]); // eslint-disable-line react-hooks/exhaustive-deps

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
