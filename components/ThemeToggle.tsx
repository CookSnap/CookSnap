"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("cooksnap-theme") as "light" | "dark" | null;
    if (stored) {
      setTheme(stored);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    window.localStorage.setItem("cooksnap-theme", theme);
  }, [theme]);

  const nextTheme = theme === "light" ? "dark" : "light";

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Switch to ${nextTheme} mode`}
      onClick={() => setTheme(nextTheme)}
      className="gap-2"
    >
      {theme === "light" ? "🌙" : "☀️"}
      <span className="text-xs font-semibold uppercase">{nextTheme} mode</span>
    </Button>
  );
}
