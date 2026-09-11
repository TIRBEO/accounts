/**
 * HMAC signing for the blocked-account redirect.
 *
 * The accounts app signs `kind|eventId|until` with BLOCK_REDIRECT_SECRET and
 * appends the signature as `&sig=`. The dashboard middleware verifies the
 * signature with the same shared secret — any tampering with the URL breaks
 * it and the user is bounced back to the canonical signed blocked URL.
 *
 * The secret is exposed to the client (VITE_) because accounts is a static
 * SPA — this is intentional and safe for this use: the signature only proves
 * "the redirect came from this app", it grants no access. The API remains the
 * real enforcement layer (403 on every request while blocked). Keep the
 * secret rotated with the other client-visible values, and never reuse a
 * server-only secret here.
 */

const BLOCK_SECRET =
  (import.meta.env.VITE_BLOCK_REDIRECT_SECRET as string | undefined) ||
  'tirbeo-block-redirect-dev';

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export async function signBlockRedirect(
  kind: string,
  eventId: string,
  until: string,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(BLOCK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${kind}|${eventId}|${until}`));
  return b64url(new Uint8Array(sig)).slice(0, 32);
}
