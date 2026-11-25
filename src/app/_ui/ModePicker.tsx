"use client";
import { useRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { THEME_MODES, useMounted, useThemeMode, type ThemeMode } from "./theme";

const LABEL: Record<ThemeMode, string> = { light: "Light", dark: "Dark" };

/** Tiny picture of the app (sidebar, header, card, button) rendered with that mode's tokens. */
function Preview({ mode }: { mode: ThemeMode }) {
  return (
    // `.light` / `.dark` scope the CSS variables, so each tile shows its own mode regardless of the page.
    <div aria-hidden className={cn(mode, "flex h-24 overflow-hidden rounded-md border bg-background")}>
      <div className="flex w-1/4 flex-col gap-1.5 border-r bg-sidebar p-2">
        <span className="size-3 rounded-sm bg-foreground/80" />
        <span className="h-1.5 rounded-full bg-sidebar-accent" />
        <span className="h-1.5 w-3/4 rounded-full bg-muted-foreground/30" />
        <span className="h-1.5 w-2/3 rounded-full bg-muted-foreground/30" />
      </div>
      <div className="flex flex-1 flex-col">
        <div className="h-3 border-b bg-sidebar" />
        <div className="grid flex-1 content-start gap-1.5 p-2">
          <div className="grid gap-1.5 rounded-sm border bg-card p-1.5 shadow-card">
            <span className="h-1.5 w-1/2 rounded-full bg-foreground/70" />
            <span className="h-1.5 w-3/4 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="flex gap-1">
            <span className="h-2.5 w-8 rounded-sm bg-primary" />
            <span className="h-2.5 w-6 rounded-sm border bg-tag-worktype-bg" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Light / Dark picker (WAI-ARIA radio group): click, or arrow keys to move + select;
 * Tab enters on the selected option. Each option previews the app in that mode.
 */
export function ModePicker({ className }: { className?: string }) {
  const { mode, setMode } = useThemeMode();
  const mounted = useMounted(); // stored choice is only known after hydration
  const current = mounted ? mode : null;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + THEME_MODES.length) % THEME_MODES.length;
    setMode(THEME_MODES[next]);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Appearance" className={cn("grid grid-cols-2 gap-3 sm:max-w-md", className)}>
      {THEME_MODES.map((m, i) => {
        const checked = current === m;
        return (
          <button
            key={m}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            // roving tabindex: only the selected option is in the Tab order (first one before mount)
            tabIndex={checked || (current === null && i === 0) ? 0 : -1}
            onClick={() => setMode(m)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "grid gap-2 rounded-lg border-2 p-2 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60",
              checked ? "border-primary" : "border-border hover:border-muted-foreground/40",
            )}
          >
            <Preview mode={m} />
            <span className="flex min-h-6 items-center justify-between px-1 text-sm font-medium">
              {LABEL[m]}
              {checked && (
                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
