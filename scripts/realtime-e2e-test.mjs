// End-to-end realtime proof: connects a real pusher-js WebSocket client to
// each Channels app, subscribes to `announcements`, then publishes via the
// REST API and asserts the event arrives over the socket.
//
// Usage: node scripts/realtime-e2e-test.mjs
import crypto from 'node:crypto';
import Pusher from 'pusher-js';

import { pusherApps } from './load-env.mjs';

// Node needs WebSocket + xhr polyfills for pusher-js
import WebSocket from 'ws';
global.WebSocket = WebSocket;
global.XMLHttpRequest = undefined; // force ws runtime

const APPS = pusherApps();

function signedUrl(appId, cluster, key, secret, body) {
  const md5 = crypto.createHash('md5').update(body).digest('hex');
  const qs = new URLSearchParams({
    auth_key: key,
    auth_timestamp: String(Math.floor(Date.now() / 1000)),
    auth_version: '1.0',
    body_md5: md5,
  }).toString();
  const sig = crypto.createHmac('sha256', secret)
    .update(`POST\n/apps/${appId}/events\n${qs}`)
    .digest('hex');
  return `https://api-${cluster}.pusher.com/apps/${appId}/events?${qs}&auth_signature=${sig}`;
}

function testApp([name, appId, key, secret, cluster]) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve({ name, cluster, ok: false, error: 'timeout (15s) — event never arrived' });
    }, 15000);

    let client, channel;
    const cleanup = () => {
      clearTimeout(timeout);
      try { channel?.unbind_all(); client?.disconnect(); } catch {}
    };

    client = new Pusher(key, { cluster, forceTLS: true });
    client.connection.bind('connected', () => {
      channel = client.subscribe('announcements');
      channel.bind('announcement', (data) => {
        cleanup();
        resolve({ name, cluster, ok: true, received: data?.message });
      });
      // Publish AFTER subscription is confirmed
      channel.bind('pusher:subscription_succeeded', async () => {
        const body = JSON.stringify({
          name: 'announcement',
          channel: 'announcements',
          data: JSON.stringify({ message: `WS E2E ${name} (${cluster}) @ ${new Date().toISOString()}` }),
        });
        const res = await fetch(signedUrl(appId, cluster, key, secret, body), {
          method: 'POST', body, headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          cleanup();
          resolve({ name, cluster, ok: false, error: `publish failed: ${res.status}` });
        }
      });
    });
    client.connection.bind('error', (err) => {
      cleanup();
      resolve({ name, cluster, ok: false, error: `connection error: ${err?.error?.data?.code || err}` });
    });
  });
}

console.log('── Realtime WebSocket end-to-end ──');
let pass = 0;
for (const app of APPS) {
  const r = await testApp(app);
  if (r.ok) { pass++; console.log(`✅ ${r.name.padEnd(9)} (${r.cluster}) — event received: "${r.received?.slice(0, 60)}..."`); }
  else console.log(`❌ ${r.name.padEnd(9)} (${r.cluster}) — ${r.error}`);
}
console.log(`\n${pass}/${APPS.length} apps delivered events over live WebSocket`);
process.exit(pass === APPS.length ? 0 : 1);
