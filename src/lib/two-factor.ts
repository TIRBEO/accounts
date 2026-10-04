// ═══ TWO-FACTOR, FROM THE ACCOUNT SERVICE ═══
// The accounts app's slice of the brain's security surface: turn an
// authenticator app on and off, read the backup-code tally, and flip the two
// "Extra security" switches. The secret, the codes and the on/off flag all
// live server-side — this file only moves state across the wire.
//
// Every write here is a sensitive action, so the brain refuses a bare session
// cookie with a 403 REAUTH_REQUIRED and names the proofs this account can
// offer. The account app signs people in with a password, so the proof it
// carries is the password; `needsProof` lets a caller tell "give me a proof"
// apart from "that failed".

import { API_BASE_URL, type ApiResult } from './api';

function csrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)__csrf=([^;]+)/);
  return match?.[1] || '';
}

/**
 * A JSON call that reads the reply verbatim rather than sanitising the error.
 *
 * The shared apiPost/apiGet collapse every failure to a friendly sentence, but
 * a 403 here is not a failure to report — it is an instruction ("attach a
 * proof"), and the caller has to see the machine code `REAUTH_REQUIRED` to act
 * on it. So this keeps `status` and the raw parsed body.
 */
async function send<T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body: unknown,
): Promise<ApiResult<T>> {
  const token = csrfToken();
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { 'X-CSRF-Token': token } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    let data: T | null = null;
    try {
      data = (await res.json()) as T;
    } catch {
      data = null;
    }
    const raw = data as (Record<string, unknown> & { error?: string; message?: string }) | null;
    const error = res.ok
      ? undefined
      : (raw?.message as string) || (raw?.error as string) || `Request failed (${res.status})`;
    return { ok: res.ok, status: res.status, data, error };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      error: 'Could not reach the account service. Please try again.',
    };
  }
}

/** The brain stopped for a proof rather than failing at the thing. */
export function needsProof(res: ApiResult<unknown>): boolean {
  return res.status === 403 && (res.data as Record<string, unknown> | null)?.error === 'REAUTH_REQUIRED';
}

/** The code the brain rejected — a wrong/expired proof, not a missing one. */
function badCode(res: ApiResult<unknown>): boolean {
  const err = (res.data as Record<string, unknown> | null)?.error;
  return err === 'INVALID_CODE' || err === 'INVALID_PASSWORD';
}

export type TwoFactorState = {
  /** The authenticator app is enrolled *and* confirmed. */
  authenticator: boolean;
  requireForActions: boolean;
  alertSuspicious: boolean;
  codes: { total: number; remaining: number };
};

type CodesReply = {
  enabled?: boolean;
  totpEnabled?: boolean;
  count?: number;
  remaining?: number;
};

type SettingsReply = { ok?: boolean; settings?: Record<string, unknown> };

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** A GET that keeps the raw reply (the shared apiGet sanitises errors away). */
async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { accept: 'application/json' },
      credentials: 'include',
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Read the whole panel in one shot: the factor's own state plus the two prefs. */
export async function readTwoFactor(): Promise<TwoFactorState> {
  const [codes, settings] = await Promise.all([
    getJson<CodesReply>('/api/security/backup-codes/list'),
    getJson<SettingsReply>('/api/settings'),
  ]);
  const prefs = settings?.settings ?? {};
  return {
    authenticator: !!codes?.totpEnabled,
    requireForActions: asBool(prefs.twoFactorRequireForActions, false),
    alertSuspicious: asBool(prefs.twoFactorAlertSuspicious, true),
    codes: {
      total: codes?.count ?? 0,
      remaining: codes?.remaining ?? 0,
    },
  };
}

/**
 * Step one of turning the app on. Returns the otpauth:// provisioning URI.
 * Without a `password` this is expected to come back REAUTH_REQUIRED; the
 * caller then asks for the password and retries.
 */
export async function startSetup(
  password?: string,
): Promise<{ ok: true; uri: string } | { ok: false; needsProof: boolean; error: string }> {
  const res = await send<{ uri?: string }>('POST', '/api/security/totp/setup', password ? { password } : {});
  if (res.ok && res.data?.uri) return { ok: true, uri: res.data.uri };
  if (needsProof(res)) return { ok: false, needsProof: true, error: 'Enter your password to continue.' };
  if (badCode(res)) return { ok: false, needsProof: true, error: 'That password is incorrect.' };
  return { ok: false, needsProof: false, error: res.error || 'Could not start setup.' };
}

/** Turns the authenticator on and returns the one-time backup codes. The code
 *  is itself the proof, so no password is needed on this call. */
export async function confirmSetup(
  code: string,
): Promise<{ ok: true; backupCodes: string[] } | { ok: false; error: string }> {
  const res = await send<{ ok?: boolean; backupCodes?: string[] }>('POST', '/api/security/totp/verify', { code });
  if (res.ok) return { ok: true, backupCodes: res.data?.backupCodes ?? [] };
  return { ok: false, error: res.error || 'That code was not accepted.' };
}

/** Turning it off wants the password plus a live code — or, for someone who
 *  has lost the app, one of the single-use backup codes. */
export async function disableAuthenticator(
  password: string,
  factor: { code?: string; backupCode?: string },
): Promise<{ ok: true } | { ok: false; needsProof: boolean; error: string }> {
  const res = await send<{ ok?: boolean }>('DELETE', '/api/security/totp/disable', { password, ...factor });
  if (res.ok) return { ok: true };
  if (needsProof(res)) return { ok: false, needsProof: true, error: 'Enter your password to continue.' };
  if (badCode(res)) return { ok: false, needsProof: true, error: res.error || 'Password or code was not accepted.' };
  return { ok: false, needsProof: false, error: res.error || 'Could not turn two-factor off.' };
}

/** One switch at a time. `requireForActions` maps to the brain's require2FA
 *  policy column (guarded — it refuses without an enrolled factor). */
export async function saveTwoFactorPrefs(
  next: Partial<Pick<TwoFactorState, 'requireForActions' | 'alertSuspicious'>>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const settings: Record<string, unknown> = {};
  if (next.requireForActions !== undefined) settings.twoFactorRequireForActions = next.requireForActions;
  if (next.alertSuspicious !== undefined) settings.twoFactorAlertSuspicious = next.alertSuspicious;
  if (!Object.keys(settings).length) return { ok: true };
  const res = await send<{ error?: string }>('PATCH', '/api/settings', { settings });
  if (res.ok) return { ok: true };
  return { ok: false, error: res.error || 'Could not save that change.' };
}
