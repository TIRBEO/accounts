import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';

const configuredApiUrl =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.NEXT_PUBLIC_API_URL as string | undefined);

const API_URL = configuredApiUrl?.replace(/\/$/, '') ||
  (import.meta.env.DEV ? 'http://localhost:3000' : 'https://api.tirbeo.app');

function postJson<T>(path: string, body: unknown): Promise<{ status: number; data: T | null }> {
  const csrf = document.cookie.match(/(?:^|;\s*)__csrf=([^;]+)/)?.[1];
  return fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(body),
  }).then((res) => {
    return res.json().then((data) => ({ status: res.status, data })).catch(() => ({ status: res.status, data: null as T }));
  });
}

export const isPasskeySupported = () => browserSupportsWebAuthn();

export async function registerPasskey(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { status, data } = await postJson<{ publicKey: any }>('/api/auth/passkey/register', {});
    if (status !== 200 || !data) return { ok: false, error: 'Failed to get registration options' };

    const credential = await startRegistration(data.publicKey);

    const verify = await postJson<any>('/api/auth/passkey/verify', { credential, mode: 'register' });
    if (verify.status !== 200) return { ok: false, error: verify.data?.error || 'Failed to register passkey' };

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Passkey registration failed' };
  }
}

export async function authenticateWithPasskey(email?: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  try {
    const authRes = await fetch(`${API_URL}/api/auth/passkey/auth-options`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email || undefined }),
    });
    if (!authRes.ok) return { ok: false, error: 'Failed to get authentication options' };
    const { publicKey, challengeNonce } = await authRes.json();

    const credential = await startAuthentication(publicKey);

    const verifyRes = await fetch(`${API_URL}/api/auth/passkey/verify`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, mode: 'login', challengeNonce }),
    });
    if (!verifyRes.ok) {
      const body = await verifyRes.json().catch(() => ({}));
      return { ok: false, error: body.error || 'Passkey authentication failed' };
    }
    const data = await verifyRes.json();
    return { ok: true, token: data.token };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Passkey authentication failed' };
  }
}
