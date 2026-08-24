// ═══ TIRBEO API CLIENT ═══
// Talks to apps/api (Next.js). The API runs on localhost:3000 in dev and
// https://api.tirbeo.app in prod — same convention as the other apps in the
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

const API_BASE_URL = configuredApiUrl?.replace(/\/$/, '') ||
  (import.meta.env.DEV ? 'http://localhost:3000' : 'https://api.tirbeo.app');

export interface ApiResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  /** Human-readable error extracted from the response (when available). */
  error?: string;
}

async function postJson<T>(path: string, body: unknown): Promise<{ status: number; data: T | null }> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Send/receive cookies so the __session cookie set by the API is stored
    // for the API domain (shared with the dashboard on .tirbeo.app).
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
  if (status === 429 || msg.includes('rate limit') || msg.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (status >= 500) {
    return 'Something went wrong on our end. Please try again.';
  }
  return raw;
}

export async function apiPost<T = Record<string, unknown>>(path: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const { status, data } = await postJson<T>(path, body);
    const error = sanitizeApiError(status, (data as { error?: string } | null)?.error);
    return { ok: status >= 200 && status < 300, status, data, error };
  } catch {
    return { ok: false, status: 0, data: null, error: 'Could not reach the server. Please try again.' };
  }
}

function readableError<T>(result: ApiResult<T>, fallback: string): string {
  if (result.status === 401 || result.status === 403) {
    return 'Your session has expired. Please sign in again.';
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

/** Check whether an email is already registered (API-backed). */
export async function checkEmailExists(email: string): Promise<ApiResult<EmailExistsData>> {
  return apiPost<EmailExistsData>('/api/auth/email-exists', { email });
}

export interface UsernameExistsData {
  exists: boolean;
  valid: boolean;
  reserved: boolean;
}

/** Check whether a username is already taken (API-backed). */
export async function checkUsernameExists(username: string): Promise<ApiResult<UsernameExistsData>> {
  return apiPost<UsernameExistsData>('/api/auth/username-exists', { username });
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
  occupation?: string;
  companyName?: string;
  role?: string;
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

export async function requestLoginOtp(email: string): Promise<ApiResult<{ message?: string }>> {
  return apiPost<{ message?: string }>('/api/auth/login-otp/request', { email });
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

// ═══ MAGIC LINK ═══

export interface MagicLinkRequestResult {
  ok: boolean;
  message?: string;
  error?: string;
}

/**
 * Ask the backend to email a one-time magic link to the given address.
 * The API intentionally returns success even when the account doesn't exist
 * (prevents account enumeration), so the UI should show a generic message.
 */
export async function requestMagicLink(email: string): Promise<MagicLinkRequestResult> {
  const result = await apiPost<{ message?: string }>('/api/auth/magic-link/request', { email });
  if (!result.ok) {
    return { ok: false, error: readableError(result, 'Failed to send magic link. Please try again.') };
  }
  return { ok: true, message: result.data?.message };
}

export interface MagicLinkVerifyResult {
  ok: boolean;
  email?: string;
  error?: string;
}

/**
 * Exchange a magic link token for a session.
 * On success the API sets the httpOnly __session cookie, which the dashboard
 * (and other apps) pick up automatically on their next /api request.
 */
export async function verifyMagicLink(token: string): Promise<MagicLinkVerifyResult> {
  const result = await apiPost<{ email?: string }>('/api/auth/magic-link/verify', { token });
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
}

// Dedupe concurrent 401-triggered refreshes (e.g. mount + session polls firing
// together after a token rotation).
let refreshPromise: Promise<boolean> | null = null;

/**
 * Rotate the session via the httpOnly __refresh cookie (path=/api/auth/refresh).
 * On success the API re-issues __session/__csrf/__refresh cookies. Returns
 * false when the refresh cookie is missing/expired/spent.
 */
function refreshSession(): Promise<boolean> {
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
      return { ok: res.ok, status: res.status, data };
    } catch {
      return { ok: false, status: 0, data: null, error: 'Could not reach the server.' };
    }
  }
  return { ok: false, status: 0, data: null, error: 'Could not reach the server.' };
}

// ═══ PROFILE UPDATE ═══

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

// ═══ OAUTH / SOCIAL LOGIN ═══
// Moved to ./oauth.ts — social sign-in uses direct full-page navigation to
// `${API}/auth/{provider}` instead of fetch(), which cannot follow the API's
// cross-origin redirect to the provider (CORS) and added a needless round trip.

// Types are exported inline above with each function/type declaration.

