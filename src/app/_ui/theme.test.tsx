import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModePicker } from "./ModePicker";
import { THEME_STORAGE_KEY, ThemeModeProvider, useThemeMode } from "./theme";

/** jsdom has no matchMedia; `osDark` lets a test pretend the OS is in dark mode. */
function mockMatchMedia(osDark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("dark") ? osDark : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

const wrapper = ({ children }: { children: React.ReactNode }) => <ThemeModeProvider>{children}</ThemeModeProvider>;
const html = () => document.documentElement;

beforeEach(() => {
  localStorage.clear();
  html().className = "";
  html().removeAttribute("style");
  mockMatchMedia(false);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useThemeMode", () => {
  it("defaults to light", () => {
    const { result } = renderHook(() => useThemeMode(), { wrapper });
    expect(result.current.mode).toBe("light");
    expect(result.current.resolvedTheme).toBe("light");
    expect(html().classList.contains("dark")).toBe(false);
  });

  it("setMode switches the <html> class and persists the choice", () => {
    const { result } = renderHook(() => useThemeMode(), { wrapper });
    act(() => result.current.setMode("dark"));
    expect(result.current.mode).toBe("dark");
    expect(result.current.resolvedTheme).toBe("dark");
    expect(html().classList.contains("dark")).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(html().style.colorScheme).toBe("dark");

    act(() => result.current.setMode("light"));
    expect(html().classList.contains("dark")).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("restores the stored choice on load", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    const { result } = renderHook(() => useThemeMode(), { wrapper });
    expect(result.current.mode).toBe("dark");
  });

  it("ignores the OS appearance (no system mode)", () => {
    mockMatchMedia(true); // OS says dark
    const { result } = renderHook(() => useThemeMode(), { wrapper });
    expect(result.current.mode).toBe("light");
    expect(html().classList.contains("dark")).toBe(false);
  });

  it("falls back to light for an unknown stored value", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "system");
    const { result } = renderHook(() => useThemeMode(), { wrapper });
    expect(result.current.mode).toBe("light");
  });
});

describe("ModePicker", () => {
  it("is a radio group with Light and Dark, reflecting the current mode", () => {
    render(<ModePicker />, { wrapper });
    expect(screen.getByRole("radiogroup", { name: "Appearance" })).toBeTruthy();
    const light = screen.getByRole("radio", { name: /light/i });
    const dark = screen.getByRole("radio", { name: /dark/i });
    expect(light.getAttribute("aria-checked")).toBe("true");
    expect(dark.getAttribute("aria-checked")).toBe("false");
    expect(light.tabIndex).toBe(0); // roving tabindex: only the checked option is tabbable
    expect(dark.tabIndex).toBe(-1);
  });

  it("selects by click and by arrow keys", () => {
    render(<ModePicker />, { wrapper });
    const light = screen.getByRole("radio", { name: /light/i });
    const dark = screen.getByRole("radio", { name: /dark/i });

    fireEvent.click(dark);
    expect(dark.getAttribute("aria-checked")).toBe("true");
    expect(html().classList.contains("dark")).toBe(true);

    fireEvent.keyDown(dark, { key: "ArrowLeft" });
    expect(light.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(light);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
});
