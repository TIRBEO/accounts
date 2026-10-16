// Cross-tab session wire protocol shared by every screen that signs a user in
// or out. localStorage carries the message to same-origin tabs (BroadcastChannel
// never delivers to the sending tab) and BroadcastChannel is the same-tab fallback.

const KEY = 'tirbeo_session';
const CHANNEL = 'tirbeo:session';

export type SessionEventType = 'login' | 'logout' | 'update';

export interface SessionEvent {
  type: SessionEventType;
  ts: number;
  userId?: string;
}

export function broadcastSession(type: SessionEventType, userId?: string): void {
  const payload = userId ? { userId } : undefined;
  const msg: SessionEvent = { type, ts: Date.now(), ...(payload && { userId }) };
  try { localStorage.setItem(KEY, JSON.stringify(payload ? { ...msg, payload } : msg)); } catch {}
  try { new BroadcastChannel(CHANNEL).postMessage(msg); } catch {}
}

/** Drop the message copy left in localStorage (after a local sign-out). */
export function clearSessionTrace(): void {
  try { localStorage.removeItem(KEY); } catch {}
}

/** Normalise a BroadcastChannel message or a storage-event value; null if unrecognized. */
export function parseSessionMessage(raw: unknown): SessionEvent | null {
  let v: unknown = raw;
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch { return null; }
  }
  const obj = v as { type?: string; payload?: { userId?: string } } | null;
  const type = obj?.type;
  if (type !== 'login' && type !== 'logout' && type !== 'update') return null;
  const userId = typeof obj?.payload?.userId === 'string' ? obj.payload.userId : undefined;
  return { type, ts: 0, ...(userId && { userId }) };
}
