// ═══ TIRBEO REALTIME — Pusher Channels ═══
// Regional connection picker + lazy SDK loading.
//
// The org runs 5 Channels apps:
//   • mt1 global pool  — 3 apps (PRIMARY/SECONDARY/TERTIARY), connections are
//     sharded across them to spread the per-app connection limit.
//   • ap2 (Mumbai)     — South Asia users get the lowest latency.
//   • ap4 (Singapore)  — Asia-Pacific users get the lowest latency.
//
// Region is detected from the browser timezone (falls back to the mt1 pool)
// and persisted so a device always lands on the same app — that stability is
// what keeps server-side publishes (which target one app) reaching everyone.
import { API_BASE_URL } from './api';

// pusher-js ships no usable root type entry (moduleResolution: bundler finds
// nothing), so we use minimal structural types for the surface we use.
export interface RealtimeChannel {
  bind(event: string, callback: (data: unknown) => void): void;
  unbind(event?: string, callback?: (data: unknown) => void): void;
}
export interface RealtimeClient {
  subscribe(channelName: string): RealtimeChannel;
  unsubscribe(channelName: string): void;
  disconnect(): void;
  connect(): void;
  connection: { state: string };
}
export interface PusherConfig {
  key: string;
  cluster: string;
}

export type PusherRegion = 'primary' | 'secondary' | 'tertiary' | 'ap2' | 'ap4';

const REGION_KEYS: Record<Exclude<PusherRegion, 'primary'>, string> = {
  secondary: 'VITE_PUSHER_KEY_SECONDARY',
  tertiary: 'VITE_PUSHER_KEY_TERTIARY',
  ap2: 'VITE_PUSHER_KEY_AP2',
  ap4: 'VITE_PUSHER_KEY_AP4',
};

const REGION_CLUSTERS: Record<Exclude<PusherRegion, 'primary'>, string> = {
  secondary: 'VITE_PUSHER_CLUSTER_SECONDARY',
  tertiary: 'VITE_PUSHER_CLUSTER_TERTIARY',
  ap2: 'VITE_PUSHER_CLUSTER_AP2',
  ap4: 'VITE_PUSHER_CLUSTER_AP4',
};

const STORAGE_KEY = 'tirbeo:pusher-region';

function env(name: string): string | undefined {
  return (import.meta.env as Record<string, string | undefined>)[name];
}

/** Read the mt1-pool app the device is sharded to (or null when unset). */
function getShardRegion(): PusherRegion | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as PusherRegion | null;
    if (saved && (saved === 'primary' || saved in REGION_KEYS)) return saved;
  } catch {}
  return null;
}

/** Persist the shard choice for this device. */
export function setRegion(region: PusherRegion): void {
  try { localStorage.setItem(STORAGE_KEY, region); } catch {}
}

/** True when the timezone belongs to the South Asia / APAC edges. */
export function detectRegion(): PusherRegion {
  // Manual override wins (e.g. set by a "connect to nearest region" setting).
  const sharded = getShardRegion();
  if (sharded) return sharded;

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    // South Asia (ap2 — Mumbai): India, Sri Lanka, Bangladesh, Nepal, Pakistan.
    if (/(Kolkata|Calcutta|Colombo|Dhaka|Kathmandu|Karachi|Thimphu)/.test(tz)) return 'ap2';
    // Asia-Pacific (ap4 — Singapore): SE Asia + Oceania.
    if (/(Singapore|Kuala_Lumpur|Jakarta|Bangkok|Manila|Hong_Kong|Shanghai|Taipei|Seoul|Tokyo|Perth|Sydney|Melbourne|Brisbane|Auckland)/.test(tz)) return 'ap4';
  } catch {}
  // Everyone else: shard across the mt1 global pool.
  return getShardRegion() ?? 'primary';
}

/** Public key+cluster for a region (missing config falls back to primary). */
export function getRegionConfig(region: PusherRegion = detectRegion()): PusherConfig {
  if (region === 'primary') {
    return {
      key: env('VITE_PUSHER_KEY_PRIMARY') || '',
      cluster: env('VITE_PUSHER_CLUSTER_PRIMARY') || 'mt1',
    };
  }
  const key = env(REGION_KEYS[region]) || env('VITE_PUSHER_KEY_PRIMARY') || '';
  const cluster = env(REGION_CLUSTERS[region]) || env('VITE_PUSHER_CLUSTER_PRIMARY') || 'mt1';
  return { key, cluster };
}

// ── Lazy singleton ──────────────────────────────────────────────────────────
// pusher-js (~90KB) is only fetched when realtime is actually used — never on
// the auth screens' critical path.

type PusherCtor = new (key: string, options: Record<string, unknown>) => RealtimeClient;
let pusherPromise: Promise<RealtimeClient | null> | null = null;

export function getPusher(): Promise<RealtimeClient | null> {
  if (!pusherPromise) {
    pusherPromise = (async () => {
      const { key, cluster } = getRegionConfig();
      if (!key) {
        if (import.meta.env.DEV) console.warn('[realtime] missing VITE_PUSHER_KEY_* — realtime disabled');
        return null;
      }
      const mod = (await import('pusher-js')) as unknown as { default: PusherCtor };
      const appName = detectRegion();
      const client = new mod.default(key, {
        cluster,
        forceTLS: true,
        // Activity timeout / pong timeout tuned for mobile networks
        activityTimeout: 30000,
        pongTimeout: 18000,
        // Private/presence channels need a signed auth from our API. The
        // default authEndpoint XHR does NOT send cookies, which would 401
        // cross-origin, so we authorize explicitly with credentials and tell
        // the API which regional app this client is connected to (it must
        // sign with THAT app's secret).
        authorizer: (channel: { name: string }) => ({
          authorize: (socketId: string, callback: (error: unknown, auth: unknown) => void) => {
            const body = new URLSearchParams({
              socket_id: socketId,
              channel_name: channel.name,
              app: appName,
            });
            fetch(`${API_BASE_URL}/api/pusher/auth`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: body.toString(),
            })
              .then(async (res) => {
                if (!res.ok) throw new Error(`pusher auth ${res.status}`);
                return res.json();
              })
              .then((data: { auth?: string }) => {
                if (!data?.auth) throw new Error('pusher auth: missing auth field');
                callback(null, { auth: data.auth });
              })
              .catch((err) => callback(err, null));
          },
        }),
      });
      return client;
    })().catch((err) => {
      console.warn('[realtime] failed to init Pusher:', err);
      return null;
    });
  }
  return pusherPromise;
}

/** Subscribe to a public channel. Returns null when realtime is unavailable. */
export async function subscribe(channelName: string): Promise<RealtimeChannel | null> {
  const client = await getPusher();
  if (!client) return null;
  return client.subscribe(channelName);
}

export async function unsubscribe(channelName: string): Promise<void> {
  const client = await getPusher();
  client?.unsubscribe(channelName);
}

/**
 * Tear down the connection (called on sign-out so we don't hold a socket on
 * the login screen). The next getPusher() call reconnects cleanly.
 */
export async function disconnectRealtime(): Promise<void> {
  const client = await getPusher();
  client?.disconnect();
}

/**
 * Default event name used by the Tirbeo backend for user-scoped events.
 * Server publishes to `private-user-<id>` on the SAME app the client is
 * connected to (single-app fan-out keeps the free tier viable).
 */
export const USER_CHANNEL_PREFIX = 'private-user-';

export async function subscribeToUser(userId: string, onEvent: (data: unknown) => void): Promise<(() => void) | null> {
  const client = await getPusher();
  if (!client || !userId) return null;
  const channel = client.subscribe(`${USER_CHANNEL_PREFIX}${userId}`);
  channel.bind('notification', onEvent);
  channel.bind('session', onEvent);
  return () => {
    channel.unbind('notification', onEvent);
    channel.unbind('session', onEvent);
    client.unsubscribe(`${USER_CHANNEL_PREFIX}${userId}`);
  };
}
