"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { Icon } from "@/components/shared/Icon";

type Theme = "light" | "dark";

const STORAGE_KEY = "opendaycare:theme";
const THEME_EVENT = "opendaycare:theme-change";
const useThemeEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

function readSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function announceTheme(theme: Theme) {
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const explicitSelectionRef = useRef(false);

  useThemeEffect(() => {
    const storedTheme = readStoredTheme();
    const documentTheme = document.documentElement.dataset.theme;
    const initialTheme =
      storedTheme ??
      (isTheme(documentTheme) ? documentTheme : readSystemTheme());
    explicitSelectionRef.current = Boolean(storedTheme);
    applyTheme(initialTheme);
    setTheme(initialTheme);

    function handleThemeChange(event: Event) {
      const nextTheme = (event as CustomEvent<Theme>).detail;
      if (!isTheme(nextTheme)) return;
      explicitSelectionRef.current = true;
      applyTheme(nextTheme);
      setTheme(nextTheme);
    }

    function handleSystemChange() {
      if (explicitSelectionRef.current || readStoredTheme()) return;
      const nextTheme = readSystemTheme();
      applyTheme(nextTheme);
      setTheme(nextTheme);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      const nextTheme = isTheme(event.newValue)
        ? event.newValue
        : readSystemTheme();
      explicitSelectionRef.current = isTheme(event.newValue);
      applyTheme(nextTheme);
      setTheme(nextTheme);
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    window.addEventListener(THEME_EVENT, handleThemeChange);
    window.addEventListener("storage", handleStorage);
    mediaQuery.addEventListener("change", handleSystemChange);

    return () => {
      window.removeEventListener(THEME_EVENT, handleThemeChange);
      window.removeEventListener("storage", handleStorage);
      mediaQuery.removeEventListener("change", handleSystemChange);
    };
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    explicitSelectionRef.current = true;
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // Keep the explicit choice for this page when storage is unavailable.
    }
    applyTheme(nextTheme);
    setTheme(nextTheme);
    announceTheme(nextTheme);
  }

  const nextThemeLabel = theme === "dark" ? "claro" : "oscuro";
  const currentThemeLabel = theme === "dark" ? "Oscuro" : "Claro";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Cambiar a modo ${nextThemeLabel}`}
      aria-pressed={theme === "dark"}
      title={`Cambiar a modo ${nextThemeLabel}`}
      className={`inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-extrabold text-ink transition hover:border-coral hover:text-coral ${className}`}
    >
      <Icon name={theme === "dark" ? "moon" : "sun"} className="size-4" />
      <span>{currentThemeLabel}</span>
    </button>
  );
}
