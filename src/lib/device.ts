/* ═══════════════════════════════════════════════════════════════════
   The one fact that says "this device" when an IP cannot.

   A phone on a mobile network changes address constantly, so "new IP" is a
   terrible trigger for the "was that you?" email: it would mail on almost every
   sign-in. The account service therefore gates that mail on the DEVICE — and it
   has always read the id from the `__dfp` cookie or the `x-device-fingerprint`
   header. Nothing in the fleet ever set either one, so the gate fell through to
   its no-device fallback and the "Alert on suspicious sign-in" switch could not
   tell a known device from a stolen password.

   This is deliberately not a fingerprint in the tracking sense. It is a random
   number this browser invented and keeps to itself: nothing about the device is
   measured, so a browser update does not look like a new machine, and a person
   who wants one can clear their site data.

   Two transports, because the two kinds of request need different ones: the
   header rides every fetch this app makes (the API reads it after the cookie),
   and the cookie — written on the shared parent domain where there is one —
   also survives the top-level navigations a fetch cannot reach, like the OAuth
   callback the provider bounces the browser through.
   ═══════════════════════════════════════════════════════════════════ */

/** Same key the theme boot uses for its own per-browser state. */
const KEY = 'tirbeo:device';

/** A year. Shorter than the session refresh token's life, longer than any
    realistic streak of sign-ins on one device — and the id is worthless to
    anyone who does not already have the account's password. */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function newId(): string {
  // 32+ characters is the bound the account service checks before it trusts an
  // id to de-duplicate an alert on; a UUID is 36.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The device's id, invented on first use and kept from then on. Never throws:
    a browser that refuses storage gets a fresh id for this page load, which is
    exactly the no-device case the API's cooldown fallback already handles. */
export function deviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing && existing.length >= 16) return existing;
    const minted = newId();
    window.localStorage.setItem(KEY, minted);
    return minted;
  } catch {
    return newId();
  }
}

/** Header form, ready to spread into a fetch's `headers`. Empty when there is
    no id, so the request simply looks like the no-device case it is. */
export function deviceIdHeader(): Record<string, string> {
  const id = deviceId();
  return id ? { 'x-device-fingerprint': id } : {};
}

function parentDomain(hostname: string): string | null {
  // `.tirbeo.com` when this app is served from any of its subdomains — the API
  // sets its own cookies the same way, which is how a sign-in here reaches the
  // dashboard there. A bare domain or a localhost dev origin gets a host-only
  // cookie rather than a malformed one.
  const parts = hostname.split('.');
  if (parts.length < 3) return null;
  return `.${parts.slice(-2).join('.')}`;
}

/** Mirrors the id into a cookie. Called once at boot, not per request. */
export function publishDeviceId(): void {
  if (typeof document === 'undefined') return;
  const id = deviceId();
  if (!id) return;
  const domain = parentDomain(window.location.hostname);
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  // Lax, not Strict: the OAuth callback arrives as a top-level GET navigation,
  // and SameSite=Strict would withhold the cookie on exactly the request that
  // needs it.
  document.cookie = `__dfp=${id}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}${domain ? `; Domain=${domain}` : ''}`;
}
