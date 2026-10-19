import { useSyncExternalStore } from 'react';
import { getCurrentUser, logout, type CurrentUserData } from '../lib/api';
import { broadcastSession, clearSessionTrace, parseSessionMessage } from '../lib/sessionSync';

/* ═══ THE ONE SESSION OWNER ═══
   Two implementations used to probe the same endpoint at boot: this hook (for
   the signed-in screen) and an effect inside App (for the hand-off). Each kept
   its own rules about what a dropped request means, and the slower of the two
   decided when the login form was allowed to paint.

   There is one answer now, held outside React, read with useSyncExternalStore:
   the probe starts as this module is imported — during the auth chunk's
   download, not after it — and the screens read the same snapshot instead of
   each keeping its own copy. */

const KEEPALIVE_MS = 10 * 60 * 1000; // 10 minutes — rotates before the 15-min access token expires
const CHECK_DEBOUNCE_MS = 1000; // focus + visibilitychange fire together; coalesce them

const SYNC_CHANNEL = 'tirbeo:session';

export type SessionStatus = 'unknown' | 'guest' | 'member' | 'blocked';

export interface Session {
  /** 'unknown' only until the first probe answers — never a reason to hide a form. */
  status: SessionStatus;
  user: CurrentUserData | null;
}

let snapshot: Session = { status: 'unknown', user: null };
const listeners = new Set<() => void>();

function publish(next: Session): void {
  // Same person, same answer — a new object from the probe is not a change, and
  // re-rendering every screen on each 10-minute token rotation is noise.
  const samePerson = next.user === snapshot.user || (!!next.user && next.user.id === snapshot.user?.id);
  if (next.status === snapshot.status && samePerson) return;
  snapshot = next;
  for (const listener of listeners) listener();
}

function getSession(): Session {
  return snapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useSession(): Session {
  return useSyncExternalStore(subscribe, getSession, getSession);
}

let keepalive: ReturnType<typeof setInterval> | null = null;
let lastCheckAt = 0;
let lastUserId: string | null = null;
let probe: Promise<void> | null = null;

function startKeepalive(): void {
  stopKeepalive();
  keepalive = setInterval(() => { void probeSession(true); }, KEEPALIVE_MS);
}

function stopKeepalive(): void {
  if (keepalive) { clearInterval(keepalive); keepalive = null; }
}

/**
 * Ask the API who is signed in.
 *
 * A request that never got an answer is not an answer: status 0 is a network
 * failure and 5xx is the server admitting it could not check. On either, the
 * session stays whatever it was — treating a dropped request as a sign-out is
 * how someone on a train gets told they were never signed in, and the screens
 * behind that message then clear the cookies that were the only proof.
 */
function probeSession(force = false): Promise<void> {
  if (probe) return probe;
  if (!force && Date.now() - lastCheckAt < CHECK_DEBOUNCE_MS) return Promise.resolve();
  lastCheckAt = Date.now();
  probe = getCurrentUser()
    .then((res) => {
      if (res.block) {
        lastUserId = null;
        stopKeepalive();
        publish({ status: 'blocked', user: null });
        return;
      }
      if (res.ok && res.data) {
        const changed = lastUserId !== null && lastUserId !== res.data.id;
        lastUserId = res.data.id;
        // Which account the shared cookies belong to, for the other apps' stale
        // bearer-token check.
        try { localStorage.setItem('tirbeo:token-user', res.data.id); } catch {}
        publish({ status: 'member', user: res.data });
        startKeepalive();
        // Only when the person actually changed: every tab used to broadcast a
        // 'login' on load and wake every other tab.
        if (changed) broadcastSession('login', res.data.id);
        return;
      }
      if ((res.status === 0 || res.status >= 500) && lastUserId) return;
      const wasMember = lastUserId !== null;
      lastUserId = null;
      stopKeepalive();
      publish({ status: 'guest', user: null });
      if (wasMember) broadcastSession('logout');
    })
    .catch(() => {})
    .finally(() => { probe = null; });
  return probe;
}

/**
 * A login this app just completed, whose cookies the API already installed.
 * Tell every other tab to re-read the session, and re-read it here — the caller
 * only knows an email address, not what `/users/me` says the session is.
 */
export function announceSignIn(): Promise<void> {
  broadcastSession('login');
  return probeSession(true);
}

/** Sign out here, and tell every other tab this browser has open. */
export async function signOut(): Promise<void> {
  stopKeepalive();
  try {
    await logout();
  } finally {
    try {
      localStorage.removeItem('tirbeo:token-user');
      localStorage.removeItem('tirbeo:security');
      localStorage.removeItem('tirbeo:last-active');
    } catch {}
    clearSessionTrace();
    lastUserId = null;
    publish({ status: 'guest', user: null });
    broadcastSession('logout');
  }
}

let started = false;

/**
 * Wire the session to the rest of the browser: same-origin tabs through
 * BroadcastChannel + storage events, other Tirbeo apps through the shared
 * cookie, re-read when this tab comes back to the front. Event-driven — the
 * old 5-second poll burned battery and caused reload loops.
 *
 * Called once, from main.tsx, before React renders.
 */
export function startSessionSync(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  void probeSession(true);

  let channel: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') channel = new BroadcastChannel(SYNC_CHANNEL);
  } catch {}

  const onRemoteLogin = () => { void probeSession(true); };
  const onRemoteLogout = () => {
    lastUserId = null;
    stopKeepalive();
    publish({ status: 'guest', user: null });
  };

  channel?.addEventListener('message', (e) => {
    const event = parseSessionMessage(e.data);
    if (event?.type === 'logout') onRemoteLogout();
    else if (event?.type === 'login') onRemoteLogin();
  });

  // localStorage is how the message reaches the tabs that did not send it.
  window.addEventListener('storage', (e) => {
    if (e.key !== 'tirbeo_session') return;
    const event = parseSessionMessage(e.newValue);
    if (event?.type === 'logout') onRemoteLogout();
    else onRemoteLogin();
  });

  // The cookie is shared across *.tirbeo.com but localStorage is not, so a
  // sign-in made in the dashboard is invisible here until this tab looks again.
  // Unforced, so the focus + visibilitychange pair a woken tab fires counts as
  // one probe; a hidden tab stops rotating a token nobody is using.
  const onVisible = () => {
    if (document.visibilityState !== 'visible') { stopKeepalive(); return; }
    void probeSession();
    if (lastUserId) startKeepalive();
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);
}
