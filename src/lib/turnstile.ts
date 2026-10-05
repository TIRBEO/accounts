// ═══ CLOUDFLARE TURNSTILE ═══
//
// The API (apps/api/proxy.ts + features/auth/authHandlers.ts) requires a
// Turnstile token for login/signup once an IP looks suspicious or a login has
// failed a few times. This app renders that widget.
//
// Two ways the site key reaches us, in priority order:
//   1. `VITE_TURNSTILE_SITE_KEY` — inlined at BUILD time by Vite. Preferred.
//   2. The `siteKey` in the API's 403 body — REQUEST time, so a key added
//      after the first deploy still works without a rebuild.
//
// (2) is the important one: reading only the build-time env var meant a
// flagged-IP user got a 403 the UI couldn't answer — "Captcha verification
// required" with no way to satisfy it, i.e. nobody could sign in.

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement | string, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
      getResponse: (id: string) => string | undefined;
      renderTo: never;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=tsReady"

declare global {
  interface Window {
    tsReady?: () => void;
  }
}

/** Build-time site key (may be empty in a fresh deploy). */
export const TURNSTILE_SITE_KEY: string =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ||
  (import.meta.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY as string | undefined) ||
  "";

let loader: Promise<void> | null = null;

/** Load the Turnstile script once, resolving when `window.turnstile` exists. */
export function loadTurnstile(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.turnstile) return Promise.resolve();
  if (loader) return loader;

  loader = new Promise<void>((resolve, reject) => {
    window.tsReady = () => resolve();

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="https://challenges.cloudflare.com/turnstile"]`,
    );
    if (existing) {
      // Already in the DOM but maybe still loading — wait for load or error.
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("turnstile script failed to load")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("turnstile script failed to load"));
    document.head.appendChild(script);

    // Some ad blockers kill the script without firing onerror.
    setTimeout(() => reject(new Error("turnstile script timed out")), 10_000);
  }).catch((err) => {
    loader = null; // let a later attempt retry
    throw err;
  });

  return loader;
}

export const TURNSTILE_HUMAN_ERROR =
  "The security check couldn't complete. Please disable an ad-blocker for this page, then try again.";
