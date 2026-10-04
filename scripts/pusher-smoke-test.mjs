// Live smoke test: publishes one event per Channels app via the REST API
// (HMAC-SHA256 signed exactly like the pusher server SDK) and one Beams
// web-push notification, proving all credentials are valid end-to-end.
//
// Usage: node scripts/pusher-smoke-test.mjs
import crypto from 'node:crypto';

import { beams, pusherApps } from './load-env.mjs';

const APPS = pusherApps();

const BEAMS = beams();

/** Build the signed URL for a Channels REST publish (auth params alphabetical). */
function signedUrl(appId, cluster, key, secret, body) {
  const md5 = crypto.createHash('md5').update(body).digest('hex');
  const params = new URLSearchParams({
    auth_key: key,
    auth_timestamp: String(Math.floor(Date.now() / 1000)),
    auth_version: '1.0',
    body_md5: md5,
  });
  // URLSearchParams preserves insertion order; it is already alphabetical,
  // which is exactly what Pusher's signature scheme requires.
  const qs = params.toString();
  const toSign = `POST\n/apps/${appId}/events\n${qs}`;
  const sig = crypto.createHmac('sha256', secret).update(toSign).digest('hex');
  return `https://api-${cluster}.pusher.com/apps/${appId}/events?${qs}&auth_signature=${sig}`;
}

async function publishChannel([name, appId, key, secret, cluster]) {
  const body = JSON.stringify({
    name: 'announcement',
    channel: 'announcements',
    data: JSON.stringify({ message: `Realtime OK — ${name} (${cluster}) @ ${new Date().toISOString()}` }),
  });
  const url = signedUrl(appId, cluster, key, secret, body);
  const res = await fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/json' } });
  const text = await res.text();
  console.log(`${res.ok ? '✅' : '❌'} Channels ${name.padEnd(9)} (${cluster}) → ${res.status} ${text.slice(0, 80)}`);
}

async function publishBeams() {
  const res = await fetch(
    `https://${BEAMS.instanceId}.pushnotifications.pusher.com/publish_api/v1/instances/${BEAMS.instanceId}/publishes`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BEAMS.primaryKey}` },
      body: JSON.stringify({
        interests: ['hello'],
        web: { notification: { title: 'Tirbeo', body: 'Beams publish OK ✅', deep_link: 'https://tirbeo.com' } },
      }),
    },
  );
  const text = await res.text();
  console.log(`${res.ok ? '✅' : '❌'} Beams web push → ${res.status} ${text.slice(0, 100)}`);
}

console.log('── Pusher Channels REST publish ──');
for (const app of APPS) await publishChannel(app);
console.log('── Pusher Beams publish ──');
await publishBeams();
