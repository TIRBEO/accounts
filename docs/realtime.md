# Tirbeo Realtime — Pusher Channels + Beams

All credentials live in env vars — nothing hardcoded. Public keys are `VITE_*`;
secrets are server-side only. See `.env.example` for the full list.

## Ownership after the migration (2026-09-14)

| Concern | Owner | Notes |
|---|---|---|
| **Realtime (Channels)** — toasts, session-revoked, announcements | **accounts** + dashboard (each subscribes for its own screens) | `apps/accounts/src/lib/realtime.ts` |
| **Web push (Beams/VAPID)** — OS notifications, opt-in UI | **dashboard only** | toggle lives in `/account/notifications` settings; accounts has **no** bell/push UI by design |

## Topology

| App | Cluster | Purpose |
|---|---|---|
| PRIMARY `2194260` | mt1 | Global pool — shard 1 (default) |
| SECONDARY `2194261` | mt1 | Global pool — shard 2 |
| TERTIARY `2194265` | mt1 | Global pool — shard 3 |
| AP2 `2194266` | ap2 | South Asia (Mumbai) — lowest latency for IN/PK/BD/LK |
| AP4 `2194271` | ap4 | Asia-Pacific (Singapore) — lowest latency for SEA/Oceania |

## How the accounts client picks an app

`src/lib/realtime.ts` detects the region from the browser timezone:

- `Asia/Kolkata|Colombo|Dhaka|Kathmandu|Karachi|…` → **ap2**
- `Asia/Singapore|Tokyo|Australia/Sydney|…` → **ap4**
- everything else → **mt1 pool**, sharded per-device (persisted in
  `localStorage['tirbeo:pusher-region']`) so a device always lands on the
  same app.

**Server-side publishes must target the same app the client connected to.**
The API mirrors the region/shard from the session (see
`apps/api/lib/pusher-deliver.ts`, which fans out to all 5 apps — the client
receives exactly once). `packages/pusher` exports `pusherFor(region)` and
`publishToAllRegions()`.

### Client events the accounts app handles

| Channel | Event | Payload | UI |
|---|---|---|---|
| `announcements` | `announcement` | `{ message }` | Top banner on auth screens |
| `private-user-<id>` | `notification` | `{ title, body?, message? }` | Toast |
| `private-user-<id>` | `session` | `{ type: 'session_revoked' }` | Reload → session gate |

Private-channel auth is signed by `POST /api/pusher/auth` (cookie-authenticated,
CORS-enabled) in apps/api.

## Web push (dashboard)

The dashboard app owns web push end-to-end:

- **Opt-in UI**: `/account/notifications` settings page — "Browser push" card
  with a toggle (`subscribeToPush` / `unsubscribeFromPush` from
  `apps/dashboard/lib/push-client.ts`). Runs inside the click gesture so the
  permission prompt is allowed everywhere (Safari/Firefox require it).
- **Delivery**: persistent `/sw.js` in the dashboard + VAPID keys server-side
  (`apps/api/app/api/notifications/push/subscribe` — GET config, POST
  subscribe, DELETE unsubscribe). The dashboard SW's cache strategies are
  push-safe: auth/session/notification APIs are network-only, and AppShell no
  longer unregisters service workers (that would kill push subscriptions).
- **Consent gate**: the subscribe endpoint additionally enforces the user's
  privacy consent (`hasConsent(userId, 'analytics')` → 403 if declined).

Beams (instance `869b3b95-386f-4984-ae8c-9b9735966bc8`) remains available as
the cross-platform/web-push service; publish with:

```bash
curl -H "Content-Type: application/json" \
     -H "Authorization: Bearer $BEAMS_PRIMARY_KEY" \
     -X POST "https://$BEAMS_INSTANCE_ID.pushnotifications.pusher.com/publish_api/v1/instances/$BEAMS_INSTANCE_ID/publishes" \
     -d '{"interests":["broadcast"],"web":{"notification":{"title":"Tirbeo","body":"Hello, world!"}}}'
```

## Service worker (accounts)

`/sw.js` here is app-shell caching only — **no push handler** (push lives in
the dashboard). If a device previously registered for push while it was
hosted here, that subscription dies on first SW update — by design. Bump
`CACHE_NAME` when changing `sw.js` (currently `tirbeo-auth-v5`).

## Verification

```bash
node scripts/pusher-smoke-test.mjs    # REST publish → all 5 apps + Beams (✅ 200s)
node scripts/realtime-e2e-test.mjs    # real WebSocket → all 5 apps receive events (✅ 5/5)
```

Historical browser E2E (pre-migration, when push lived here): 9/9 — bell
click → Beams device registered → VAPID token issued → publish → real push
service → SW `push` event → in-app toast. The same stack now runs in the
dashboard app.

**Sandbox note:** headless Chromium in restricted environments cannot complete
Chrome's FCM handshake — `pushManager.subscribe()` yields a fake
`push.invalid` endpoint that push services reject. Firefox + Mozilla autopush
works. On real users' browsers both work normally — CI-environment quirk,
not an app defect.

## Bundle impact (accounts)

`pusher-js` (62KB) is a lazy chunk loaded on first realtime use only; the
eager bundle grew ~5KB (banner + subscription wiring). Beams and the push UI
were removed entirely — no `@pusher/push-notifications-web` dependency.

## Credentials

Every live coordinate for these two services is an environment variable, and
nothing but the app ids, keys, clusters and the Beams instance id belongs in a
tracked file. `scripts/load-env.mjs` reads `.env.local` and hands each one back
or stops the run naming it; the full list with no values is `.env.example`.

The api service reads the same six secrets at runtime — the five
`PUSHER_SECRET_*` and `BEAMS_PRIMARY_KEY` — from its own `.env.example` and from
the Vercel project's environment variables. **They must be set there.** They are
deliberately absent from `vercel.json`: a value like `@some_secret` there is a
reference to Vercel's secret store, not a value, and a reference to a secret the
project does not have stops the build outright.

### Rotation

Rotate a Pusher channel secret from the app's dashboard (Settings → keys) and
the Beams primary key from the Beams dashboard, then write the new value in
every place it is read: this app's `.env.local`, the api service's `.env.local`,
and the environment variables on each Vercel project. `vercel.json` is not one
of those places.

Until this is done, treat all five channel secrets and the Beams key as
compromised: they were committed in plaintext in `scripts/pusher-smoke-test.mjs`,
`scripts/realtime-e2e-test.mjs` and `scripts/browser-push-test.mjs` before
`e0152d8` moved them to the environment, and git history still holds them.
Removing them from HEAD stops the next commit; only rotation ends the exposure.
