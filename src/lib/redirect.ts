import type { BlockInfo } from './api';

// ═══ POST-AUTH REDIRECT RESOLUTION ═══
// Decides where to send the user after a successful auth flow:
//   1. A validated `redirect`/`redirect_to`/`next`/`return_to` query param
//      (only tirbeo.app subdomains or localhost are accepted — no open redirects).
//   2. The `referrer` if it points at a verified Tirbeo app.
//   3. The default dashboard (https://dashboard.tirbeo.app in prod,
//      http://localhost:3005 in dev).

const APP_DOMAIN = (import.meta.env.VITE_APP_DOMAIN as string | undefined) || 'tirbeo.app';

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
 * `https://tirbeo.app`, any `https://*.tirbeo.app` subdomain, or a localhost
 * origin during development.
 */
export function isAllowedRedirectTarget(url: string): boolean {
  try {
    const u = new URL(url);
    const isLocal = import.meta.env.DEV && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
    if (!isLocal && u.protocol !== 'https:') return false;
    if (u.hostname === APP_DOMAIN || u.hostname.endsWith(`.${APP_DOMAIN}`)) return true;
    return isLocal;
  } catch {
    return false;
  }
}

/**
 * Build a full URL from a bare app name like `forms` → `https://forms.tirbeo.app`.
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

/**
 * Resolve the post-auth destination from the current page URL.
 * Falls back to the default dashboard URL when nothing valid is present.
 */
export function getRedirectTarget(): string {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_URL;

  const params = new URLSearchParams(window.location.search);
  for (const key of REDIRECT_PARAM_KEYS) {
    const raw = params.get(key);
    if (!raw) continue;

    if (raw.includes('://')) {
      if (isAllowedRedirectTarget(raw)) return raw;
      continue;
    }

    const built = buildFromAppName(raw);
    if (built && isAllowedRedirectTarget(built)) return built;
  }

  const referrer = document.referrer;
  if (referrer && isAllowedRedirectTarget(referrer)) return referrer;

  return DEFAULT_DASHBOARD_URL;
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
