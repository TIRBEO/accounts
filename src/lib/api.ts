// ═══ TIRBEO API CLIENT ═══
// Talks to apps/api (Next.js). The API runs on localhost:3000 in dev and
// https://api.tirbeo.com in prod — same convention as the other apps in the
// monorepo (dashboard, forms, support, admin).
//
// All auth is cookie-session based: successful login/signup/2FA/OTP/magic-link
// set an httpOnly __session cookie that the dashboard (and other apps)
// pick up automatically.

// Vite exposes VITE_* vars; NEXT_PUBLIC_* is read too so the existing
// .env.local keys work without changes.
const configuredApiUrl =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.NEXT_PUBLIC_API_URL as string | undefined);

// Exported for realtime.ts (Pusher channel auth endpoint on the same origin)
export const API_BASE_URL = configuredApiUrl?.replace(/\/$/, '') ||
  (import.meta.env.DEV ? 'http://localhost:3000' : 'https://api.tirbeo.com');

export interface ApiResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  /** Human-readable error extracted from the response (when available). */
  error?: string;
  /**
   * Structured account-restriction info returned by the API as 401/403 when a
   * login attempt hits a banned / suspended / deleted / deletion-pending
   * account. When present the UI should show the dedicated interruption page
   * instead of a generic "cannot sign in" message.
   */
  block?: BlockInfo | null;
}

export interface BlockInfo {
  kind: 'banned' | 'suspended' | 'deleted';
  reason?: string | null;
  until?: string | null;
  eventId?: string | null;
  message?: string | null;
}

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)__csrf=([^;]+)/);
  return match?.[1] || '';
}

async function postJson<T>(path: string, body: unknown): Promise<{ status: number; data: T | null }> {
  const csrf = getCsrfToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
    },
    // Send/receive cookies so the __session cookie set by the API is stored
    // for the API domain (shared with the dashboard on .tirbeo.com).
    credentials: 'include',
    body: JSON.stringify(body),
  });

  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    // Response was not JSON (e.g. plain-text error) — leave data as null.
  }

  return { status: res.status, data };
}

/**
 * Raw gateway/API messages that must never reach the UI (e.g. the proxy's
 * "Authentication required. Provide a session cookie or Authorization:
 * Bearer <api_key> header.") get mapped to short, human copy.
 */
function sanitizeApiError(status: number, raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const msg = raw.toLowerCase();
  if (
    msg.startsWith('authentication required') ||
    msg.includes('provide a session cookie') ||
    msg.includes('authorization:') ||
    msg.startsWith('invalid authorization') ||
    msg.includes('unauthenticated')
  ) {
    return 'Your session has expired. Please sign in again.';
  }
  if (msg.includes('csrf')) {
    return 'Your request could not be verified. Please refresh the page and try again.';
  }
  if (msg === 'account_deleted') {
    return 'Your account has been deleted. If this is a mistake, please contact support@tirbeo.com.';
  }
  if (msg === 'account_banned') {
    return 'Your account has been permanently banned. Please contact support@tirbeo.com if you believe this is a mistake.';
  }
  if (msg === 'account_suspended') {
    return 'Your account is temporarily suspended. You will be able to sign in again when the suspension ends.';
  }
  if (msg === 'account_deletion_scheduled' || msg.includes('deletion_scheduled')) {
    return 'Your account is scheduled for deletion. You cannot sign in while deletion is pending.';
  }
  if (status === 429 || msg.includes('rate limit') || msg.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (status >= 500) {
    return 'Something went wrong on our end. Please try again.';
  }
  return raw;
}

/**
 * Decode the API's structured account-restriction payloads (returned as 401/403
 * from login-ish routes) into a UI BlockInfo. Shapes (see apps/api):
 *   banned    → { error:'ACCOUNT_BANNED', banned:true, eventId, message }
 *   suspended → { error:'ACCOUNT_SUSPENDED', suspended:true, eventId, reason, until, message }
 *   deleted   → { error:'ACCOUNT_DELETED', deleted:true, message }
 */
function extractBlock(
  status: number,
  data: (Record<string, unknown> & {
    error?: string;
    banned?: boolean;
    suspended?: boolean;
    deleted?: boolean;
    eventId?: string | null;
    reason?: string | null;
    until?: string | null;
    message?: string | null;
  }) | null,
): BlockInfo | null {
  if ((status !== 401 && status !== 403) || !data) return null;
  if (data.banned) return { kind: 'banned', reason: data.reason, until: data.until, eventId: data.eventId, message: data.message };
  if (data.suspended) return { kind: 'suspended', reason: data.reason, until: data.until, eventId: data.eventId, message: data.message };
  if (data.deleted) return { kind: 'deleted', reason: data.reason, message: data.message };
  const err = (data.error || '').toLowerCase();
  if (err.includes('banned')) return { kind: 'banned', reason: data.reason, message: data.message };
  if (err.includes('suspended')) return { kind: 'suspended', reason: data.reason, until: data.until, message: data.message };
  if (err.includes('deleted')) return { kind: 'deleted', reason: data.reason, message: data.message };
  return null;
}

export async function apiPost<T = Record<string, unknown>>(path: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const { status, data } = await postJson<T>(path, body);
    const raw = data as (Record<string, unknown> & { error?: string }) | null;
    const error = sanitizeApiError(status, raw?.error);
    return { ok: status >= 200 && status < 300, status, data, error, block: extractBlock(status, raw) };
  } catch {
    return { ok: false, status: 0, data: null, error: 'Could not reach the server. Please try again.' };
  }
}

async function requestJson<T>(
  path: string,
  method: 'GET' | 'DELETE',
): Promise<{ status: number; data: T | null }> {
  const csrf = getCsrfToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    credentials: 'include',
  });

  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

export async function apiGet<T = Record<string, unknown>>(path: string): Promise<ApiResult<T>> {
  try {
    const { status, data } = await requestJson<T>(path, 'GET');
    const raw = data as (Record<string, unknown> & { error?: string }) | null;
    const error = sanitizeApiError(status, raw?.error);
    return { ok: status >= 200 && status < 300, status, data, error, block: extractBlock(status, raw) };
  } catch {
    return { ok: false, status: 0, data: null, error: 'Could not reach the server. Please try again.' };
  }
}

export async function apiDelete<T = Record<string, unknown>>(path: string): Promise<ApiResult<T>> {
  try {
    const { status, data } = await requestJson<T>(path, 'DELETE');
    const raw = data as (Record<string, unknown> & { error?: string }) | null;
    const error = sanitizeApiError(status, raw?.error);
    return { ok: status >= 200 && status < 300, status, data, error, block: extractBlock(status, raw) };
  } catch {
    return { ok: false, status: 0, data: null, error: 'Could not reach the server. Please try again.' };
  }
}

/**
 * Human copy for a failed magic-link / OTP call.
 *
 * These two are the one place a 401 or 403 is NOT an expired session: a
 * consumed link, an expired token or a wrong code all come back that way, and
 * telling someone their session expired on a page they never signed in to is
 * both wrong and unactionable. Only a body that actually talks about
 * authentication is remapped; anything else falls through to the server's own
 * message, or a link-specific fallback.
 */
function readableError<T>(result: ApiResult<T>, fallback: string): string {
  if (result.block) return result.block.message || result.error || fallback;
  const raw = (result.error || '').toLowerCase();
  if (raw.startsWith('authentication required') || raw.includes('provide a session cookie')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (result.status === 401 || result.status === 403) {
    return result.error || fallback;
  }
  return result.error || (result.status >= 500 ? 'Something went wrong. Please try again.' : fallback);
}

// ═══ AVAILABILITY CHECKS ═══

export interface EmailExistsData {
  exists: boolean;
  hasPassword: boolean;
  photoUrl?: string | null;
  name?: string | null;
  /** True when the account has a recovery (secondary) email stored on the DB. */
  hasRecoveryEmail?: boolean;
  /** Masked recovery email, e.g. `ab****@gmail.com`. */
  recoveryEmail?: string | null;
}

/** Check whether an email is already registered (API-backed). — 30s TTL + in-flight dedupe to cut 5s duplicate POSTs */
const emailExistsFrontCache = new Map<string, { result: ApiResult<EmailExistsData>; exp: number }>();
const emailExistsInFlight = new Map<string, Promise<ApiResult<EmailExistsData>>>();
export async function checkEmailExists(email: string): Promise<ApiResult<EmailExistsData>> {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  const cached = emailExistsFrontCache.get(key);
  if (cached && cached.exp > now) return cached.result;
  const inflight = emailExistsInFlight.get(key);
  if (inflight) return inflight;
  const p = apiPost<EmailExistsData>('/api/auth/email-exists', { email }).then((res) => {
    // cache success only (avoid caching 5xx)
    if (res.ok) emailExistsFrontCache.set(key, { result: res, exp: now + 30_000 });
    emailExistsInFlight.delete(key);
    return res;
  });
  emailExistsInFlight.set(key, p);
  return p;
}

export interface UsernameExistsData {
  exists: boolean;
  valid: boolean;
  reserved: boolean;
}

// NOTE: a combined checkSignupAvailability() helper was removed — it called
// POST /api/auth/signup-availability, an endpoint that has never existed in
// apps/api (verified by route inventory + live 404 probe). The signup form
// (useAuthForm.checkSignupAvailability) composes checkEmailExists +
// checkUsernameExists instead, which are the real working endpoints.

/** Check whether a username is already taken (API-backed). — 30s TTL + in-flight dedupe */
const usernameExistsFrontCache = new Map<string, { result: ApiResult<UsernameExistsData>; exp: number }>();
const usernameExistsInFlight = new Map<string, Promise<ApiResult<UsernameExistsData>>>();
export async function checkUsernameExists(username: string): Promise<ApiResult<UsernameExistsData>> {
  const key = username.toLowerCase().trim();
  const now = Date.now();
  const cached = usernameExistsFrontCache.get(key);
  if (cached && cached.exp > now) return cached.result;
  const inflight = usernameExistsInFlight.get(key);
  if (inflight) return inflight;
  const p = apiPost<UsernameExistsData>('/api/auth/username-exists', { username }).then((res) => {
    if (res.ok) usernameExistsFrontCache.set(key, { result: res, exp: now + 30_000 });
    usernameExistsInFlight.delete(key);
    return res;
  });
  usernameExistsInFlight.set(key, p);
  return p;
}

// ═══ SIGNUP ═══

export interface SignupPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
  dob?: string;
  gender?: string;
  photoUrl?: string;
  /** Work — the same wire names the settings app PATCHes to /api/profile. */
  companyRole?: string;
  companyName?: string;
  jobPlace?: string;
  jobStarted?: string;
  recoveryEmail?: string;
  totpSecret?: string;
  is2FAEnabled?: boolean;
  policyAccepted: boolean;
  adminDataAccess?: boolean;
  otpCode?: string;
}

export interface SignupData {
  id: string;
  email: string;
  token: string;
}

export async function requestSignupOtp(email: string): Promise<ApiResult<{ message?: string }>> {
  return apiPost<{ message?: string }>('/api/auth/signup-otp/request', { email });
}

export async function verifySignupOtp(email: string, code: string): Promise<ApiResult<{ verified?: boolean }>> {
  return apiPost<{ verified?: boolean }>('/api/auth/signup-otp/verify', { email, code });
}

export async function signup(payload: SignupPayload): Promise<ApiResult<SignupData>> {
  return apiPost<SignupData>('/api/auth/signup', payload);
}

// ═══ LOGIN ═══

export interface LoginData {
  id?: string;
  email?: string;
  token?: string;
  /** 2FA required — verify via verify2FA / recovery2FA using tempToken. */
  needs2FA?: boolean;
  tempToken?: string;
  /** New IP / device — verify via a login email OTP. */
  needsOtp?: boolean;
}

export async function login(email: string, password: string): Promise<ApiResult<LoginData>> {
  return apiPost<LoginData>('/api/auth/login', { email, password });
}

export async function verify2FA(tempToken: string, code: string): Promise<ApiResult<LoginData>> {
  return apiPost<LoginData>('/api/auth/verify-2fa', { tempToken, code });
}

export async function recovery2FA(tempToken: string, recoveryCode: string): Promise<ApiResult<LoginData>> {
  return apiPost<LoginData>('/api/auth/recovery-2fa', { tempToken, recoveryCode });
}

export interface LoginOtpVerifyData {
  id?: string;
  email?: string;
  token?: string;
  /** When 2FA is enabled, an additional authenticator code is required. */
  requiresMfa?: boolean;
  tempToken?: string;
}

export interface LoginOtpRequestData {
  message?: string;
  retryAfterMs?: number;
}
export async function requestLoginOtp(email: string): Promise<ApiResult<LoginOtpRequestData>> {
  return apiPost<LoginOtpRequestData>('/api/auth/login-otp/request', { email });
}

export async function verifyLoginOtp(email: string, code: string): Promise<ApiResult<LoginOtpVerifyData>> {
  return apiPost<LoginOtpVerifyData>('/api/auth/login-otp/verify', { email, otpCode: code });
}

// ═══ PASSWORD RESET / RECOVERY ═══

export interface PasswordResetData {
  message?: string;
  retryAfterMs?: number;
}

/**
 * Request a password reset. method 'otp' emails a code, 'magic_link' emails a
 * reset link, 'recovery' emails the OTP to the account's recovery email.
 * Returns success even for unknown emails (anti-enumeration).
 */
export async function requestPasswordReset(email: string, method: 'otp' | 'magic_link' | 'recovery' = 'otp'): Promise<ApiResult<PasswordResetData>> {
  return apiPost<PasswordResetData>('/api/auth/password-reset/request', { email, method });
}

export interface PasswordResetVerifyData {
  /** Short-lived token to pass to confirmPasswordReset when setting the new password. */
  resetToken?: string;
}

/** Verify a password-reset code (emailed via requestPasswordReset with method 'otp'). */
export async function verifyPasswordReset(email: string, code: string): Promise<ApiResult<PasswordResetVerifyData>> {
  return apiPost<PasswordResetVerifyData>('/api/auth/password-reset/verify', { email, code });
}

/** Set a new password using the resetToken returned by verifyPasswordReset. */
export async function confirmPasswordReset(resetToken: string, newPassword: string): Promise<ApiResult<{ message?: string }>> {
  return apiPost<{ message?: string }>('/api/auth/password-reset/confirm', { resetToken, newPassword });
}

/** Quick login via OTP — verify code and get session directly (no password change). */
export async function quickLoginWithOtp(email: string, code: string): Promise<ApiResult<{ userId?: string }>> {
  return apiPost<{ userId?: string }>('/api/auth/password-reset/quick-login', { email, code });
}

// ═══ MAGIC LINK ═══

export interface MagicLinkRequestResult {
  ok: boolean;
  status?: number;
  message?: string;
  error?: string;
  retryAfterMs?: number;
  /** Which limit tripped: 'magic-link' | 'global-email' | 'global-ip' | undefined. */
  exceeded?: string;
  /** Epoch ms when the exhausted window resets (server clock). */
  resetsAt?: number;
}

/** Per-method limit status returned by /api/auth/remaining and send 429s. */
export interface RemainingInfo {
  used: number;
  remaining: number;
  max: number;
  resetAt: number;
  exceeded?: boolean;
}

/** Shared 429 payload shape from the auth send endpoints. */
export interface RateLimitPayload {
  retryAfterMs?: number;
  exceeded?: string;
  remaining?: Record<string, RemainingInfo>;
}

/**
 * Ask the backend to email a one-time magic link to the given address.
 * The API intentionally returns success even when the account doesn't exist
 * (prevents account enumeration), so the UI should show a generic message.
 */
export async function requestMagicLink(email: string): Promise<MagicLinkRequestResult> {
  const result = await apiPost<{ message?: string; retryAfterMs?: number; exceeded?: string } & RateLimitPayload>('/api/auth/magic-link/request', { email });
  if (!result.ok) {
    // Cooldown 429s carry the human copy in `message` (not `error`) — surface it.
    // resetsAt: prefer the tripped limit's own resetAt, else now + retryAfterMs.
    const tripped = result.data?.exceeded ? result.data?.remaining?.[result.data.exceeded] : undefined;
    const retryAfterMs = result.data?.retryAfterMs;
    return {
      ok: false,
      status: result.status,
      error: result.data?.message || readableError(result, 'Failed to send magic link. Please try again.'),
      retryAfterMs,
      exceeded: result.data?.exceeded,
      resetsAt: tripped?.resetAt ?? (retryAfterMs ? Date.now() + retryAfterMs : undefined),
    };
  }
  return { ok: true, message: result.data?.message };
}

export interface MagicLinkVerifyResult {
  ok: boolean;
  email?: string;
  error?: string;
  block?: BlockInfo | null;
}

/**
 * Exchange a magic link token for a session.
 * On success the API sets the httpOnly __session cookie, which the dashboard
 * (and other apps) pick up automatically on their next /api request.
 */
export async function verifyMagicLink(token: string): Promise<MagicLinkVerifyResult> {
  const result = await apiPost<{ email?: string }>('/api/auth/magic-link/verify', { token });
  if (result.block) {
    return { ok: false, block: result.block, error: result.block.message || result.error };
  }
  if (!result.ok || !result.data?.email) {
    return { ok: false, error: readableError(result, 'This magic link is invalid or has expired.') };
  }
  return { ok: true, email: result.data.email };
}

// ═══ SESSION CHECK ═══

export interface CurrentUserData {
  id: string;
  email: string;
  name?: string | null;
  username?: string | null;
  photoUrl?: string | null;
  loginCount?: number | null;
}

// Dedupe concurrent 401-triggered refreshes (e.g. mount + session polls firing
// together after a token rotation).
let refreshPromise: Promise<boolean> | null = null;

/**
 * Rotate the session via the httpOnly __refresh cookie (path=/api/auth/refresh).
 * On success the API re-issues __session/__csrf/__refresh cookies. Returns
 * false when the refresh cookie is missing/expired/spent.
 */
export function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/**
 * Fetch the current user from the API session cookie.
 * Returns ok:false (401) when there is no valid session.
 *
 * A 401 means the 15-minute access token expired while the 30-day __refresh
 * cookie is still valid — rotate the session once and retry before reporting
 * the user as signed out.
 */
export async function getCurrentUser(): Promise<ApiResult<CurrentUserData>> {
  // __session is httpOnly and invisible to document.cookie — __csrf is its
  // JS-readable twin (set/cleared/rotated with every session), so gate on it.
  if (typeof document !== 'undefined' && !document.cookie.includes('__csrf=')) {
    return { ok: false, status: 401, data: null };
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me`, { credentials: 'include' });
      if (res.status === 401 && attempt === 0 && (await refreshSession())) {
        continue;
      }
      if (res.status === 401) return { ok: false, status: 401, data: null };
      let data: CurrentUserData | null = null;
      try {
        data = (await res.json()) as CurrentUserData;
      } catch {
        // Non-JSON error body
      }
      const block = extractBlock(res.status, data as unknown as Parameters<typeof extractBlock>[1]);
      if (block) return { ok: false, status: res.status, data: null, block };
      return { ok: res.ok, status: res.status, data };
    } catch {
      return { ok: false, status: 0, data: null, error: 'Could not reach the server.' };
    }
  }
  return { ok: false, status: 0, data: null, error: 'Could not reach the server.' };
}

// ═══ PROFILE UPDATE ═══

/**
 * Upload an avatar via the API's media endpoint (cookie-authed).
 * Returns the public URL of the uploaded file.
 */
export async function uploadAvatarViaApi(file: File | Blob): Promise<{ url: string | null; error?: string }> {
  try {
    const csrf = document.cookie
      .split('; ')
      .find((c) => c.startsWith('__csrf='))
      ?.split('=')[1] || '';
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/api/media/upload`, {
      method: 'POST',
      headers: {
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { url: null, error: (data as any)?.error || 'Upload failed' };
    }
    const data = await res.json();
    return { url: (data as any)?.url || null };
  } catch {
    return { url: null, error: 'Upload failed' };
  }
}

/**
 * Update the current user's profile (cookie-authed, requires the CSRF header).
 * Used to attach an uploaded avatar URL to the account.
 */
export async function updateProfile(patch: Record<string, unknown>): Promise<ApiResult<CurrentUserData>> {
  try {
    // The __csrf cookie is intentionally not httpOnly; echo it back in the header.
    const csrf = document.cookie
      .split('; ')
      .find((c) => c.startsWith('__csrf='))
      ?.split('=')[1] || '';
    const res = await fetch(`${API_BASE_URL}/api/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(patch),
    });
    let data: CurrentUserData | null = null;
    try {
      data = (await res.json()) as CurrentUserData;
    } catch {
      // Non-JSON error body
    }

    const error = !res.ok
      ? sanitizeApiError(res.status, (data as any)?.error) || 'Update failed'
      : undefined;
    return { ok: res.ok, status: res.status, data, error };
  } catch {
    return { ok: false, status: 0, data: null, error: 'Could not reach the server.' };
  }
}

// ═══ OAUTH CONSENT ═══
// Record policy consent for an OAuth-created account. The API marks the
// account as emailVerified and stores the consent record.

export interface OAuthConsentData {
  ok: boolean;
  message?: string;
}

export async function oauthConsent(payload: {
  policyAccepted: boolean;
  adminDataAccess?: boolean;
  signatureName?: string;
}): Promise<ApiResult<OAuthConsentData>> {
  return apiPost<OAuthConsentData>('/api/auth/oauth/consent', payload);
}

// ═══ LOGOUT ═══
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken() } : {}),
      },
    });
  } catch {
    // best-effort — even if the request fails the cookie may already be expired
  }
}

// ═══ OAUTH / SOCIAL LOGIN ═══
// Moved to ./oauth.ts — social sign-in uses direct full-page navigation to
// `${API}/auth/{provider}` instead of fetch(), which cannot follow the API's
// cross-origin redirect to the provider (CORS) and added a needless round trip.

// Types are exported inline above with each function/type declaration.

