import { apiPost } from './api';
import type { ApiResult } from './api';

/* ═══════════════════════════════════════════════════════════════════
   Proving it's really you before a sensitive action (removing a passkey)

   A session cookie says "this browser signed in" — not "the owner is holding
   it right now". The account service therefore refuses hard-to-undo actions
   until the request ALSO carries a fresh proof, and answers the refusal with
   the doors *this* account can actually open. The sheet offers exactly those,
   and the proof rides inside the action's own body (never a separate pre-check
   that would burn a single-use code). Mirrors apps/myprofile/lib/reauth.ts.
   ═══════════════════════════════════════════════════════════════════ */

/** Ways the account service will accept an identity proof. */
export type ReauthMethod = 'passkey' | 'password' | 'totp' | 'code';

/** Collected proof, ready to fold into a request body. */
export interface ReauthProof {
  password?: string;
  /** 6 digits from the authenticator app. */
  code?: string;
  /** 6 digits emailed to the sign-in address — its own field: `code` means TOTP. */
  reauthCode?: string;
  /** ≤5-min JWT from the passkey reauth ceremony. */
  reauthToken?: string;
}

/** Whether a failed ApiResult is the service stopping for a proof, not failing. */
export function needsReauth(res: ApiResult<unknown> | null | undefined): boolean {
  const data = res?.data as { error?: string } | null | undefined;
  return res?.status === 403 && data?.error === 'REAUTH_REQUIRED';
}

/** Only these doors are worth offering from the browser. */
function offerable(methods: unknown): ReauthMethod[] {
  const allowed = new Set<ReauthMethod>(['passkey', 'password', 'totp', 'code']);
  const list = Array.isArray(methods) ? methods.filter((m): m is ReauthMethod => allowed.has(m as ReauthMethod)) : [];
  return list.length ? list : ['password', 'code'];
}

/** Which doors the service said *this* account can open. */
export function offeredMethods(res: ApiResult<unknown> | null | undefined): ReauthMethod[] {
  return offerable((res?.data as { methods?: unknown } | null | undefined)?.methods);
}

/** Human copy for a refused proof (wrong password / code, expiry, rate limit). */
export function proofError(res: ApiResult<unknown>): string {
  const data = res.data as { message?: string } | null | undefined;
  return data?.message || res.error || 'That did not match. Please try again.';
}

/**
 * Ask the service to mail a fresh code to the account's sign-in address.
 * The reply names the address in masked form and never the code. Deliberately
 * not verified here — a code is single-use; spending it on a check would leave
 * the action itself with nothing to present.
 */
export async function sendReauthCode(): Promise<{ ok: boolean; email?: string; message?: string; error?: string }> {
  const res = await apiPost<{ ok?: boolean; email?: string; message?: string }>('/api/auth/reauth/send-code', {});
  if (!res.ok) {
    // 429/502 carry the human sentence in `message`; 401/400 in `error`.
    const data = res.data as { message?: string } | null | undefined;
    return { ok: false, error: data?.message || res.error || 'Could not send a code. Please try another way.' };
  }
  return { ok: true, email: res.data?.email, message: res.data?.message };
}
