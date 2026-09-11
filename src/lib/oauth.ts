import { getRedirectTarget } from './redirect';

export type OAuthProvider = 'github' | 'google' | 'discord';

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.NEXT_PUBLIC_API_URL as string | undefined) ||
  (import.meta.env.DEV ? 'http://localhost:3000' : 'https://api.tirbeo.app');

export function startOAuth(provider: OAuthProvider): void {
  const url = new URL(`${API_URL}/auth/${provider}`);
  const target = getRedirectTarget();
  if (target) url.searchParams.set('redirect_to', target);
  window.location.assign(url.toString());
}
