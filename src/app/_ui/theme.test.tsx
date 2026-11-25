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
  it("defaults to dark", () => {
    const { result } = renderHook(() => useThemeMode(), { wrapper });
    expect(result.current.mode).toBe("dark");
    expect(result.current.resolvedTheme).toBe("dark");
    expect(html().classList.contains("dark")).toBe(true);
  });

  it("setMode switches the <html> class and persists the choice", () => {
    const { result } = renderHook(() => useThemeMode(), { wrapper });
    act(() => result.current.setMode("light"));
    expect(result.current.mode).toBe("light");
    expect(result.current.resolvedTheme).toBe("light");
    expect(html().classList.contains("dark")).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(html().style.colorScheme).toBe("light");

    act(() => result.current.setMode("dark"));
    expect(html().classList.contains("dark")).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("restores the stored choice on load", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    const { result } = renderHook(() => useThemeMode(), { wrapper });
    expect(result.current.mode).toBe("light");
  });

  it("ignores the OS appearance (no system mode)", () => {
    mockMatchMedia(false); // OS says light
    const { result } = renderHook(() => useThemeMode(), { wrapper });
    expect(result.current.mode).toBe("dark");
    expect(html().classList.contains("dark")).toBe(true);
  });

  it("falls back to dark for an unknown stored value", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "system");
    const { result } = renderHook(() => useThemeMode(), { wrapper });
    expect(result.current.mode).toBe("dark");
  });
});

describe("ModePicker", () => {
  it("is a radio group with Light and Dark, reflecting the current mode", () => {
    render(<ModePicker />, { wrapper });
    expect(screen.getByRole("radiogroup", { name: "Appearance" })).toBeTruthy();
    const light = screen.getByRole("radio", { name: /light/i });
    const dark = screen.getByRole("radio", { name: /dark/i });
    expect(dark.getAttribute("aria-checked")).toBe("true");
    expect(light.getAttribute("aria-checked")).toBe("false");
    expect(dark.tabIndex).toBe(0); // roving tabindex: only the checked option is tabbable
    expect(light.tabIndex).toBe(-1);
  });

  it("selects by click and by arrow keys", () => {
    render(<ModePicker />, { wrapper });
    const light = screen.getByRole("radio", { name: /light/i });
    const dark = screen.getByRole("radio", { name: /dark/i });

    fireEvent.click(light);
    expect(light.getAttribute("aria-checked")).toBe("true");
    expect(html().classList.contains("dark")).toBe(false);

    fireEvent.keyDown(light, { key: "ArrowRight" });
    expect(dark.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(dark);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });
});
