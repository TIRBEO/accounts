// ═══ OAUTH / SOCIAL SIGN-IN (GitHub · Google · Discord) ═══
// The fastest possible start: a full-page navigation straight to the API's
// `/auth/{provider}` route. The API 302s to the provider with a signed state
// token and sets its __oauth_state cookie in the same response — no fetch(),
// no CORS-preflight, no double round-trip. (fetch() cannot follow those
// redirects: the hop to the provider's origin is not CORS-enabled.)
//
// Flow: accounts app → API /auth/{provider} → provider consent → API
// /auth/{provider}/callback (sets __session cookie) → redirect target.

const configuredApiUrl =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.NEXT_PUBLIC_API_URL as string | undefined);

export const API_BASE_URL = configuredApiUrl?.replace(/\/$/, '') ||
  (import.meta.env.DEV ? 'http://localhost:3000' : 'https://api.tirbeo.app');

export type OAuthProvider = 'github' | 'google' | 'discord';

export interface ProviderMeta {
  id: OAuthProvider;
  label: string;
  /** Host of the provider's authorize endpoint — preconnected on mount. */
  host: string;
}

export const OAUTH_PROVIDERS: ProviderMeta[] = [
  { id: 'github', label: 'GitHub', host: 'https://github.com' },
  { id: 'google', label: 'Google', host: 'https://accounts.google.com' },
  { id: 'discord', label: 'Discord', host: 'https://discord.com' },
];

/**
 * Warm up connections to every provider so clicking a button starts the
 * hand-off over an already-negotiated TLS session.
 */
export function preconnectOAuthProviders(): void {
  if (typeof document === 'undefined') return;
  for (const p of OAUTH_PROVIDERS) {
    for (const rel of ['preconnect', 'dns-prefetch']) {
      const link = document.createElement('link');
      link.rel = rel;
      link.href = p.host;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  }
}

/**
 * Navigate to the provider immediately. `intent` is cosmetic metadata for the
 * post-login redirect; the backend decides login-vs-signup by account lookup.
 */
export function startOAuth(provider: OAuthProvider, redirectTo?: string): void {
  const url = new URL(`${API_BASE_URL}/auth/${provider}`);
  const target = redirectTo || getPostAuthTarget();
  if (target) url.searchParams.set('redirect_to', target);
  window.location.assign(url.toString());
}

/** Same validation rules as the API's isAllowedRedirect + lib/redirect.ts. */
function getPostAuthTarget(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const params = new URLSearchParams(window.location.search);
  const raw =
    params.get('redirect') || params.get('redirect_to') || params.get('next') || '';
  if (!raw) return undefined;
  try {
    const u = new URL(raw, window.location.origin);
    const isLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    const isTirbeo = u.hostname === 'tirbeo.app' || u.hostname.endsWith('.tirbeo.app');
    return isTirbeo || isLocal ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}
