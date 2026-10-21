import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/** The only interactive part of the site. Server and client first render the same markup. */
export function ThemeToggle({ label }: { label: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => {
    const set = document.documentElement.dataset.theme;
    setTheme(set === "light" || set === "dark" ? set : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);
  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch { /* private mode: the choice just isn't remembered */ }
  }
  return (
    <button type="button" className="theme" onClick={toggle} aria-label={label} title={label} aria-pressed={theme === "dark"}>
      <span aria-hidden="true">◐</span>
    </button>
  );
}
