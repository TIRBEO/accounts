/**
 * Passkeys (WebAuthn) for the accounts app.
 *
 * Written straight on `navigator.credentials` — no SDK. The API hands us
 * `@simplewebauthn/server` options in JSON form where every binary field is
 * base64url, and it wants the browser's answer in the same shape, so all this
 * module really does is convert in both directions and keep the two calls
 * (`register`, `authenticate`) honest about what they mean.
 *
 * Server contract (apps/api/features/auth/passkeyHandlers.ts):
 *   POST /api/auth/passkey/register      -> { publicKey, challengeNonce }   (session)
 *   POST /api/auth/passkey/auth-options  -> { publicKey, challengeNonce }   (session)
 *   POST /api/auth/passkey/verify        -> { ok }          mode:'register' (session)
 *                                          { id, email }   mode:'auth'      (session, sets cookie)
 *   GET  /api/auth/passkey/list          -> { passkeys }                    (session)
 *   DELETE /api/auth/passkey/:id                                          (session)
 */

import { API_BASE_URL, apiGet, apiPost, apiDelete } from './api';

// ── Base64url ⇄ ArrayBuffer ────────────────────────────────────────────────

export function base64urlToBuffer(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

export function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** `{ id: 'base64url' }` -> `{ id: ArrayBuffer }`, and same for the challenge. */
function decodeCreationOptions(options: any) {
  return {
    ...options,
    challenge: base64urlToBuffer(options.challenge),
    user: { ...options.user, id: base64urlToBuffer(options.user.id) },
    excludeCredentials: (options.excludeCredentials || []).map((c: any) => ({
      ...c,
      id: base64urlToBuffer(c.id),
    })),
  };
}

function decodeRequestOptions(options: any) {
  return {
    ...options,
    challenge: base64urlToBuffer(options.challenge),
    allowCredentials: (options.allowCredentials || []).map((c: any) => ({
      ...c,
      id: base64urlToBuffer(c.id),
    })),
  };
}

/** The browser's answer -> the JSON body the verifier expects. */
function encodeAttestation(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
      attestationObject: bufferToBase64url(response.attestationObject),
      transports: typeof response.getTransports === 'function' ? response.getTransports() : [],
    },
  };
}

function encodeAssertion(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
      authenticatorData: bufferToBase64url(response.authenticatorData),
      signature: bufferToBase64url(response.signature),
      userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : undefined,
    },
  };
}

// ── Support ────────────────────────────────────────────────────────────────

export function isPasskeySupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials?.get === 'function'
  );
}

/** True on platforms that can actually *create* a passkey (Touch ID, Windows Hello, screen lock). */
export function canCreatePasskeys(): boolean {
  return (
    isPasskeySupported() &&
    typeof window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  );
}

export async function hasPlatformAuthenticator(): Promise<boolean> {
  if (!canCreatePasskeys()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// ── Errors ─────────────────────────────────────────────────────────────────

export class PasskeyError extends Error {
  /** `true` when the user simply dismissed the system prompt — not worth a toast. */
  readonly cancelled: boolean;

  constructor(message: string, cancelled = false) {
    super(message);
    this.name = 'PasskeyError';
    this.cancelled = cancelled;
  }
}

function toPasskeyError(err: unknown, fallback: string): PasskeyError {
  if (err instanceof PasskeyError) return err;
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'AbortError') {
    return new PasskeyError('Passkey request was cancelled.', true);
  }
  if (name === 'InvalidStateError') {
    return new PasskeyError('A passkey for this device already exists.', false);
  }
  if (name === 'NotSupportedError' || name === 'SecurityError') {
    return new PasskeyError('This browser or device cannot use passkeys.', false);
  }
  return new PasskeyError(fallback, false);
}

// ── Operations ─────────────────────────────────────────────────────────────

export interface PasskeySummary {
  id: string;
  deviceName: string;
  transports: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export async function listPasskeys(): Promise<PasskeySummary[]> {
  const res = await apiGet<{ passkeys: PasskeySummary[] }>('/api/auth/passkey/list');
  if (!res.ok) throw new PasskeyError(res.error || 'Could not load your passkeys.');
  return res.data?.passkeys ?? [];
}

/** Create a passkey on this device for the signed-in account. */
export async function registerPasskey(deviceName?: string): Promise<{ ok: boolean }> {
  if (!isPasskeySupported()) throw new PasskeyError('This browser cannot use passkeys.');

  const optionsRes = await apiPost<{ publicKey: any; challengeNonce: string }>(
    '/api/auth/passkey/register',
    {},
  );
  if (!optionsRes.ok) throw new PasskeyError(optionsRes.error || 'Could not start passkey setup.');
  if (!optionsRes.data?.publicKey || !optionsRes.data.challengeNonce) {
    throw new PasskeyError('The server did not return passkey options.');
  }

  let credential: PublicKeyCredential;
  try {
    credential = (await navigator.credentials.create({
      publicKey: decodeCreationOptions(optionsRes.data.publicKey),
    })) as PublicKeyCredential;
  } catch (err) {
    throw toPasskeyError(err, 'Could not create a passkey.');
  }
  if (!credential) throw new PasskeyError('No passkey was created.', true);

  const verify = await apiPost<{ ok: boolean }>('/api/auth/passkey/verify', {
    mode: 'register',
    credential: encodeAttestation(credential),
    deviceName: deviceName?.trim() || undefined,
    challengeNonce: optionsRes.data.challengeNonce,
  });
  if (!verify.ok) throw new PasskeyError(verify.error || 'The server could not verify that passkey.');
  return { ok: true };
}

/** Sign in with an existing passkey. Resolves with the account the server signed in. */
export async function authenticatePasskey(): Promise<{ id?: string; email?: string }> {
  if (!isPasskeySupported()) throw new PasskeyError('This browser cannot use passkeys.');

  const optionsRes = await apiPost<{ publicKey: any; challengeNonce: string }>(
    '/api/auth/passkey/auth-options',
    {},
  );
  if (!optionsRes.ok) {
    /* A 401 here is not an expired session — this runs on the signed-out login
       screen, so there was never a session to expire. Say what to do instead of
       sending someone to a sign-in page they are already on. */
    if (optionsRes.status === 401 || optionsRes.status === 403) {
      throw new PasskeyError('Passkey sign-in is unavailable right now. Use your email and password.');
    }
    throw new PasskeyError(optionsRes.error || 'Could not start passkey sign-in.');
  }
  if (!optionsRes.data?.publicKey || !optionsRes.data.challengeNonce) {
    throw new PasskeyError('The server did not return passkey options.');
  }

  const opts = optionsRes.data.publicKey;
  if (Array.isArray(opts.allowCredentials) && opts.allowCredentials.length === 0) {
    throw new PasskeyError('This account has no passkeys yet. Add one from Security.');
  }

  let credential: PublicKeyCredential;
  try {
    credential = (await navigator.credentials.get({
      publicKey: decodeRequestOptions(opts),
    })) as PublicKeyCredential;
  } catch (err) {
    throw toPasskeyError(err, 'Could not use that passkey.');
  }
  if (!credential) throw new PasskeyError('No passkey was returned.', true);

  /* Encoding touches a handful of fields on the assertion. A browser or polyfill
     that returns a partial object throws a bare TypeError from inside here,
     which used to reach the form as a flat "Passkey sign-in failed." with no
     detail and nothing in the log. Keep the real reason. */
  let encoded: ReturnType<typeof encodeAssertion>;
  try {
    encoded = encodeAssertion(credential);
  } catch (err: any) {
    console.error('[PASSKEY] Could not encode assertion:', err);
    throw new PasskeyError('This browser returned an incomplete passkey response. Try your email and password.');
  }

  const verify = await apiPost<{ id?: string; email?: string }>('/api/auth/passkey/verify', {
    credential: encoded,
    challengeNonce: optionsRes.data.challengeNonce,
  });
  if (!verify.ok) throw new PasskeyError(verify.error || 'The server rejected that passkey.');
  return verify.data ?? {};
}

export async function deletePasskey(id: string): Promise<{ ok: boolean }> {
  const res = await apiDelete<{ ok: boolean }>(`/api/auth/passkey/${encodeURIComponent(id)}`);
  if (!res.ok) throw new PasskeyError(res.error || 'Could not remove that passkey.');
  return { ok: true };
}

/** Absolute base URL, for the rare case a caller needs to build a link itself. */
export const PASSKEY_API_BASE = `${API_BASE_URL}/api/auth/passkey`;