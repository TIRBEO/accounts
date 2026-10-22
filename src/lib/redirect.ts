

// ═══ POST-AUTH REDIRECT RESOLUTION ═══
// Decides where to send the user after a successful auth flow:
//   1. A validated `redirect`/`redirect_to`/`next`/`return_to` query param
//      (only tirbeo.com subdomains or localhost are accepted — no open redirects).
//   2. The `referrer` if it points at a verified Tirbeo app.
//   3. The default dashboard (https://myprofile.tirbeo.com in prod,
//      http://localhost:3005 in dev).

const APP_DOMAIN = (() => {
  const raw = (import.meta.env.VITE_APP_DOMAIN as string | undefined) || 'tirbeo.com';
  // A dirty .env.local baked into a prod build must not retarget the whole
  // redirect allow-list (and default dashboard) at loopback.
  return !import.meta.env.DEV && /localhost|127\.0\.0\.1/.test(raw) ? 'tirbeo.com' : raw;
})();

/** Localhost ports used by the monorepo apps during development. */
const DEV_PORTS: Record<string, number> = {
  dashboard: 3005,
  accounts: 3002,
  api: 3000,
  forms: 3004,
  support: 3004,
  admin: 4000,
  cdn: 4400,
};

/**
 * The Tirbeo parent domain (tirbeo.com / tirbeo.app) the visitor is currently
 * on, read from the live host. Null off those domains (localhost, preview
 * URLs). Deriving from the host — rather than a build-time env var — means a
 * *.tirbeo.app visit stays on tirbeo.app and no localhost origin can ever be
 * baked into a production bundle by a dirty .env.local.
 */
function currentTirbeoParent(): string | null {
  if (typeof window === 'undefined') return null;
  const m = window.location.hostname.match(/(?:^|\.)(tirbeo\.(?:com|app))$/i);
  return m ? m[1].toLowerCase() : null;
}

function getDashboardUrl(): string {
  const parent = currentTirbeoParent();
  if (parent) return `${window.location.protocol}//myprofile.${parent}`;
  const fromEnv =
    (import.meta.env.VITE_DASHBOARD_URL as string | undefined) ||
    (import.meta.env.NEXT_PUBLIC_DASHBOARD_URL as string | undefined);
  if (fromEnv && (import.meta.env.DEV || !/localhost|127\.0\.0\.1/.test(fromEnv))) return fromEnv.replace(/\/$/, '');
  return import.meta.env.DEV ? 'http://localhost:3005' : `https://myprofile.${APP_DOMAIN}`;
}

/** Default destination after auth. */
export const DEFAULT_DASHBOARD_URL = getDashboardUrl();

/**
 * True when the URL is a verified Tirbeo destination:
 * `https://tirbeo.com`, any `https://*.tirbeo.com` subdomain, or a localhost
 * origin during development.
 */
export function isAllowedRedirectTarget(url: string): boolean {
  try {
    const u = new URL(url);
    // Block URLs with embedded credentials (e.g. https://evil@myprofile.tirbeo.com)
    if (u.username || u.password) return false;
    // Block non-http(s) schemes (javascript:, data:, etc.)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const isLocal = import.meta.env.DEV && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
    if (!isLocal && u.protocol !== 'https:') return false;
    const parent = currentTirbeoParent();
    const onLiveParent = parent !== null && (u.hostname === parent || u.hostname.endsWith(`.${parent}`));
    if (u.hostname === APP_DOMAIN || u.hostname.endsWith(`.${APP_DOMAIN}`) || onLiveParent) return true;
    return isLocal;
  } catch {
    return false;
  }
}

/**
 * Build a full URL from a bare app name like `forms` → `https://forms.tirbeo.com`.
 * Localhost names are resolved against the dev port map.
 */
function buildFromAppName(name: string): string | null {
  const host = name.startsWith('.') ? name.slice(1) : name;
  const parent = currentTirbeoParent();
  const matches = (d: string | null) => d !== null && (host === d || host.endsWith(`.${d}`));
  if (matches(APP_DOMAIN) || matches(parent)) {
    const devPort = import.meta.env.DEV ? DEV_PORTS[host.split('.')[0]] : undefined;
    return devPort ? `http://localhost:${devPort}` : `https://${host}`;
  }
  if (host === 'localhost' || host === '127.0.0.1') {
    // Localhost names only resolve in development; a production request for a
    // localhost target is dropped (null) rather than answered with a loopback URL.
    return import.meta.env.DEV ? `http://localhost:${DEV_PORTS.dashboard}` : null;
  }
  return null;
}

const REDIRECT_PARAM_KEYS = ['redirect', 'redirect_to', 'next', 'return_to'] as const;

/** Routes that only hand the user off — never a real destination. */
const HANDOFF_PATHS = ['/oauth-complete', '/callback', '/oauth-callback', '/login', '/signup', '/magic-sent', '/verify'];

/**
 * A redirect target must never be a handoff screen (login, callback,
 * oauth-complete…) carrying tokens or its own redirect_to — feeding one back
 * into a new flow nests redirect_to inside redirect_to until the URL explodes.
 * Unwrap the innermost real target instead (bounded depth), and when nothing
 * valid is inside, collapse to the bare origin: strip rather than grow.
 */
export function unwrapHandoffTarget(raw: string, depth = 0): string {
  if (depth > 3 || !raw.includes('://')) return raw;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return raw;
  }
  const isHandoff = HANDOFF_PATHS.some((p) => u.pathname === p || u.pathname.startsWith(`${p}/`));
  const carriesToken = u.searchParams.has('magic_token') || u.searchParams.has('signup') || u.searchParams.has('token');
  if (!isHandoff && !carriesToken) return raw;

  for (const key of REDIRECT_PARAM_KEYS) {
    const inner = u.searchParams.get(key);
    if (!inner) continue;
    const abs = inner.includes('://') ? inner : `${u.origin}${inner.startsWith('/') ? '' : '/'}${inner}`;
    if (isAllowedRedirectTarget(abs)) return unwrapHandoffTarget(abs, depth + 1);
  }
  // Nothing usable inside — drop the handoff entirely, keep the origin.
  return u.origin;
}

/**
 * Where this app was *asked* to send the visitor, from the URL alone.
 *
 * Deliberately excludes the referrer: at boot the referrer is the dashboard the
 * person came from, so answering it would bounce dashboard → accounts →
 * dashboard instead of letting them reach the screens this app owns (passkeys,
 * re-auth). A hand-off has to be requested, not assumed.
 */
export function requestedHandoff(): string | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  for (const key of REDIRECT_PARAM_KEYS) {
    const raw = params.get(key);
    if (!raw) continue;
    // Strip whitespace and control chars that could smuggle a target
    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (trimmed.includes('://')) {
      if (!isAllowedRedirectTarget(trimmed)) continue;
      const clean = unwrapHandoffTarget(trimmed);
      // A target that points back at this very handoff screen would re-enter
      // the flow instead of finishing it — drop it and keep looking.
      if (clean === window.location.origin + window.location.pathname) continue;
      if (isAllowedRedirectTarget(clean)) return clean;
      continue;
    }

    const built = buildFromAppName(trimmed);
    if (built && isAllowedRedirectTarget(built)) return built;
  }
  return null;
}

/**
 * Resolve the post-auth destination from the current page URL.
 * Falls back to the default dashboard URL when nothing valid is present.
 * Only validated Tirbeo targets are ever returned — third-party URLs are
 * silently dropped to prevent open-redirect / session-hijack.
 */
export function getRedirectTarget(): string {
  const requested = requestedHandoff();
  if (requested) return requested;

  // The referrer only counts for apps that actually own screens to return to.
  // The marketing site sits on the bare parent domain (tirbeo.com) — a visitor
  // who clicked "Log in" there must land on the dashboard, not bounce back to
  // the landing page they came from.
  const referrer = document.referrer;
  if (referrer && !isMarketingApex(referrer) && isAllowedRedirectTarget(referrer)) return referrer;

  return DEFAULT_DASHBOARD_URL;
}

function isMarketingApex(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const parent = currentTirbeoParent()?.toLowerCase() ?? null;
    return host === APP_DOMAIN || (parent !== null && host === parent);
  } catch {
    return true;
  }
}

/**
 * A closed account is surfaced in one place — the settings app, which puts the
 * closure screen up in place of the dashboard. This app's job ends at getting
 * them there.
 *
 * Nothing travels in the URL. The kind of closure, the reason, the end date and
 * the reference code are all findings about a person, and a link is not proof of
 * any of them: an earlier scheme signed them into the query string with a secret
 * this static SPA had to carry in its public bundle, so anyone who could read our
 * JS could forge "you are banned, ref BAN-XXXX" for any address and point it at
 * any Tirbeo origin. A closed sign-in now hands the account a session and the
 * settings gate reads the facts from the database itself — the settings app is
 * the interruption page, so there is no `/blocked` to hand off to.
 */
export function goBlocked(): void {
  window.location.replace(`${DEFAULT_DASHBOARD_URL}/settings`);
}
