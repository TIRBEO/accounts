import { getRedirectTarget } from './redirect';
import { API_BASE_URL } from './api';

export type OAuthProvider = 'github' | 'google' | 'discord';

const API_URL = API_BASE_URL;

export function startOAuth(provider: OAuthProvider): void {
  const url = new URL(`${API_URL}/auth/${provider}`);
  const target = getRedirectTarget();
  if (target) url.searchParams.set('redirect_to', target);
  window.location.assign(url.toString());
}
