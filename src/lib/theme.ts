export type ThemeId = "system" | "dark" | "light";

export const THEME_KEY = "tirbeo:theme";

export const DEFAULT_THEME: ThemeId = "system";

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === "string" && ["system", "dark", "light"].includes(v);
}

export function readTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    return isThemeId(saved) ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** `system` follows the device and falls back to dark when unavailable. */
export function resolveTheme(id: ThemeId): "dark" | "light" {
  if (id !== "system") return id;
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

/** Fired by `applyTheme`, so `useSyncExternalStore` readers (the toggle)
    re-render without a `setState` inside an effect. */
const THEME_CHANGED = "tirbeo:theme-changed";

export function applyTheme(id: ThemeId) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const concrete = resolveTheme(id);
  root.setAttribute("data-theme", concrete);
  root.style.colorScheme = concrete;
  try {
    window.localStorage.setItem(THEME_KEY, id);
  } catch {
    /* private mode — palette still applies for this session */
  }
  window.dispatchEvent(new Event(THEME_CHANGED));
}

/** Subscribe to theme changes: our own writes plus device flips while the
    choice is "system". Returns the unsubscribe function React expects. */
export function subscribeTheme(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  window.addEventListener(THEME_CHANGED, handler);
  const stopSystem = onSystemThemeChange(onChange);
  return () => {
    window.removeEventListener(THEME_CHANGED, handler);
    stopSystem();
  };
}

/** A "system" choice tracks the device; the other two never move. */
export function onSystemThemeChange(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    if (readTheme() === "system") onChange();
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

/** Inlined in <head> so the palette is correct on the very first paint. */
export const THEME_BOOT = `(function(){try{var k="${THEME_KEY}";var v=localStorage.getItem(k);var t=(v==="dark"||v==="light"||v==="system")?v:"system";var a=t==="light"||(t==="system"&&window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches)?"light":"dark";document.documentElement.setAttribute("data-theme",a);document.documentElement.style.colorScheme=a;}catch(e){}})();`;
