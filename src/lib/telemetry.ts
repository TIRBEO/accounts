// ═══ CLIENT EVENT TELEMETRY ═══
// Fire-and-forget event tracking to POST {API_BASE_URL}/api/telemetry/event.
//
// Two hard rules:
//   1. Telemetry must NEVER break the UI. Every path is wrapped, every
//      rejection is swallowed — a dead network or a 5xx must be invisible
//      to the person signing in.
//   2. Unlike Sentry (src/lib/sentry.ts, prod-gated via captureException's
//      early return), this pipeline runs in ALL environments — dev and
//      preview builds report too, so an auth-flow bug can be reproduced
//      against the very events the browser emitted.
//
// Privacy: never pass passwords, OTP codes, tokens or full emails into
// `detail`/`metadata`. When an email matters, use `emailDomain()` below to
// reduce it to its domain part (user@example.com → example.com).

import { API_BASE_URL } from './api';

function newEventId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through to the legacy id */
  }
  // Old browsers without crypto.randomUUID: timestamp + randomness is
  // enough for a de-dup key on a fire-and-forget pipe.
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/** user@example.com → example.com. Never return the local part. */
export function emailDomain(email: string | null | undefined): string {
  const value = (email || '').trim();
  const at = value.lastIndexOf('@');
  return at > 0 ? value.slice(at + 1).toLowerCase() : '';
}

export function trackEvent(
  kind: string,
  opts?: { detail?: string; metadata?: Record<string, unknown> },
): void {
  try {
    const metadata: Record<string, unknown> = { ...(opts?.metadata || {}) };
    try {
      metadata.page = typeof window !== 'undefined' ? window.location.pathname : '';
    } catch {
      /* no window — keep going without the page field */
    }
    const body: Record<string, unknown> = {
      eventId: newEventId(),
      kind,
      metadata,
    };
    if (opts?.detail) body.detail = opts.detail;

    // keepalive lets the request survive a full-page navigation — which is
    // exactly when oauth_complete / login_success fire.
    fetch(`${API_BASE_URL}/api/telemetry/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify(body),
    }).catch(() => {});
  } catch {
    // Telemetry is never allowed to throw into an auth handler.
  }
}

/**
 * Report a swallowed error to OUR pipeline. Works in every environment —
 * the Sentry gate in lib/sentry.ts (PROD-only captureException) is a
 * separate, stricter pipe and is left untouched.
 */
export function trackError(where: string, err: unknown): void {
  try {
    const message =
      err instanceof Error ? err.message : typeof err === 'string' ? err : String(err ?? 'unknown error');
    const stack = err instanceof Error && err.stack
      ? err.stack.split('\n').slice(0, 3).join('\n')
      : '';
    trackEvent('client_error', {
      detail: `${where}: ${message}`,
      metadata: stack ? { stack } : undefined,
    });
  } catch {
    /* as above: never throws */
  }
}
