import { getRedirectTarget } from './redirect';
import { API_BASE_URL } from './api';
import { trackEvent } from './telemetry';

export type OAuthProvider = 'github' | 'google' | 'discord';

const API_URL = API_BASE_URL;

export function startOAuth(provider: OAuthProvider): void {
  // Fire before the page navigation kills the request; keepalive in
  // telemetry.ts carries it across the handoff to the provider.
  trackEvent('auth.oauth_click', { metadata: { provider } });
  const url = new URL(`${API_URL}/auth/${provider}`);
  const target = getRedirectTarget();
  if (target) url.searchParams.set('redirect_to', target);
  window.location.assign(url.toString());
}
