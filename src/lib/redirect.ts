import type { BlockInfo } from './api';

// ═══ POST-AUTH REDIRECT RESOLUTION ═══
// Decides where to send the user after a successful auth flow:
//   1. A validated `redirect`/`redirect_to`/`next`/`return_to` query param
//      (only tirbeo.com subdomains or localhost are accepted — no open redirects).
//   2. The `referrer` if it points at a verified Tirbeo app.
//   3. The default dashboard (https://dashboard.tirbeo.com in prod,
//      http://localhost:3005 in dev).

const APP_DOMAIN = (import.meta.env.VITE_APP_DOMAIN as string | undefined) || 'tirbeo.com';

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

function getDashboardUrl(): string {
  const fromEnv =
    (import.meta.env.VITE_DASHBOARD_URL as string | undefined) ||
    (import.meta.env.NEXT_PUBLIC_DASHBOARD_URL as string | undefined);
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return import.meta.env.DEV ? 'http://localhost:3005' : `https://dashboard.${APP_DOMAIN}`;
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
    // Block URLs with embedded credentials (e.g. https://evil@dashboard.tirbeo.com)
    if (u.username || u.password) return false;
    // Block non-http(s) schemes (javascript:, data:, etc.)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const isLocal = import.meta.env.DEV && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
    if (!isLocal && u.protocol !== 'https:') return false;
    if (u.hostname === APP_DOMAIN || u.hostname.endsWith(`.${APP_DOMAIN}`)) return true;
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
  if (host === APP_DOMAIN || host.endsWith(`.${APP_DOMAIN}`)) {
    return import.meta.env.DEV && DEV_PORTS[host.split('.')[0]]
      ? `http://localhost:${DEV_PORTS[host.split('.')[0]]}`
      : `https://${host}`;
  }
  if (host === 'localhost' || host === '127.0.0.1') {
    return `http://localhost:${DEV_PORTS.dashboard}`;
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
 * Resolve the post-auth destination from the current page URL.
 * Falls back to the default dashboard URL when nothing valid is present.
 * Only validated Tirbeo targets are ever returned — third-party URLs are
 * silently dropped to prevent open-redirect / session-hijack.
 */
export function getRedirectTarget(): string {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_URL;

  const params = new URLSearchParams(window.location.search);
  for (const key of REDIRECT_PARAM_KEYS) {
    const raw = params.get(key);
    if (!raw) continue;
    // Strip whitespace and control chars that could smuggle a target
    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (trimmed.includes('://')) {
      if (isAllowedRedirectTarget(trimmed)) {
        const clean = unwrapHandoffTarget(trimmed);
        // A target that points back at this very handoff screen would re-enter
        // the flow instead of finishing it — drop it and keep looking.
        if (clean !== window.location.origin + window.location.pathname && isAllowedRedirectTarget(clean)) return clean;
      }
      continue;
    }

    const built = buildFromAppName(trimmed);
    if (built && isAllowedRedirectTarget(built)) return built;
  }

  const referrer = document.referrer;
  if (referrer && isAllowedRedirectTarget(referrer)) return referrer;

  return DEFAULT_DASHBOARD_URL;
}

/** Accounts /login URL preserving no redirect — used after signup */
export function getAccountsLoginUrl(): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  if (base && isAllowedRedirectTarget(base)) return `${base.replace(/\/$/, '')}/login`;
  return '/login';
}

/**
 * Banned / suspended / deleted accounts are all surfaced on the DASHBOARD
 * (single place), never on the accounts app. Jump straight there carrying the
 * block info through the query string so the dashboard can render the
 * interruption page even when there is no live session cookie.
 *
 * The payload is signed with BLOCK_REDIRECT_SECRET (shared with the dashboard
 * middleware): any edit to the URL breaks the `sig` and the user is bounced
 * back to the canonical blocked page.
 */
export async function redirectBlockedToDashboard(block: BlockInfo): Promise<void> {
  const q = new URLSearchParams();
  q.set('blocked', block.kind);
  if (block.eventId) q.set('eventId', block.eventId);
  if (block.reason) q.set('reason', block.reason);
  if (block.until) q.set('until', block.until);
  try {
    const { signBlockRedirect } = await import('./blockSignature');
    q.set('sig', await signBlockRedirect(block.kind, block.eventId || '', block.until || ''));
  } catch {
    // Signature is defense-in-depth — redirect unsigned on failure; the
    // dashboard middleware signs on arrival and still pins the block.
  }
  window.location.replace(`${DEFAULT_DASHBOARD_URL}?${q.toString()}`);
}
