const DASHBOARD_BASE =
  process.env.NEXT_PUBLIC_DASHBOARD_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3001"
    : "https://dashboard.tirbeo.app");

/** Resolve the post-auth redirect target. Relative paths (e.g. "/dashboard")
 * are rebased onto the dashboard app URL so they never 404 on the accounts
 * app domain. */
export function getRedirectUrl(): string {
  if (typeof window === "undefined") return DASHBOARD_BASE;

  const params = new URLSearchParams(window.location.search);
  const raw = params.get("redirect_to") || params.get("redirect");

  if (raw) {
    try {
      const parsed = new URL(raw, window.location.origin);
      // If the caller passed a relative path (e.g. "/dashboard"), rebase it
      // onto the dashboard app — the accounts app has no such route.
      if (parsed.origin === window.location.origin) {
        return new URL(parsed.pathname + parsed.search, DASHBOARD_BASE).toString();
      }
      // Only allow URLs that already live on the dashboard base — anything
      // else (attacker-controlled absolute URLs) is an open redirect.
      if (parsed.origin === new URL(DASHBOARD_BASE).origin) {
        return parsed.toString();
      }
    } catch {
      return DASHBOARD_BASE;
    }
  }

  return DASHBOARD_BASE;
}
