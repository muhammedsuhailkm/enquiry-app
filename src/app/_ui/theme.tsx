"use client";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { ThemeProvider, useTheme } from "next-themes";

/**
 * Theme mode = a single `.dark` class on <html>; all colours are CSS variables that change
 * under it (src/styles/theme.css). Two modes only: light and dark (default). The OS
 * appearance is deliberately ignored - the user's choice is all that counts.
 */
export const THEME_MODES = ["light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];
export const DEFAULT_THEME_MODE: ThemeMode = "dark";
export const THEME_STORAGE_KEY = "vdecor-desk-theme";

const isMode = (v: unknown): v is ThemeMode => v === "light" || v === "dark";

/**
 * Mount once, in the root (server) layout, so next-themes' inline no-flash script is part of
 * the server-rendered HTML and sets the class before first paint.
 */
export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      themes={[...THEME_MODES]}
      defaultTheme={DEFAULT_THEME_MODE}
      enableSystem={false}
      enableColorScheme
      disableTransitionOnChange
      storageKey={THEME_STORAGE_KEY}
    >
      <ThemeColorMeta />
      {children}
    </ThemeProvider>
  );
}

/** The one API the app uses for the theme. */
export function useThemeMode(): { mode: ThemeMode; setMode: (m: ThemeMode) => void; resolvedTheme: ThemeMode } {
  const { theme, setTheme } = useTheme();
  const mode: ThemeMode = isMode(theme) ? theme : DEFAULT_THEME_MODE;
  // Before next-themes has resolved, read what its no-flash script already put on <html>.
  const resolvedTheme: ThemeMode = isMode(theme) ? theme : readHtmlClass();
  const setMode = useCallback((m: ThemeMode) => setTheme(m), [setTheme]);
  return { mode, setMode, resolvedTheme };
}

function readHtmlClass(): ThemeMode {
  if (typeof document === "undefined") return DEFAULT_THEME_MODE;
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

const noop = () => () => {};
/** True only after hydration - for UI that depends on the stored choice (avoids mismatches). */
export function useMounted() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/** Keep the mobile browser bar (meta theme-color) in step with the page background. */
function ThemeColorMeta() {
  const { resolvedTheme } = useThemeMode();
  useEffect(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = bg;
  }, [resolvedTheme]);
  return null;
}
