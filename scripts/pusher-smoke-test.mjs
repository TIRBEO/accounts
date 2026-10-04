// Live smoke test: publishes one event per Channels app via the REST API
// (HMAC-SHA256 signed exactly like the pusher server SDK) and one Beams
// web-push notification, proving all credentials are valid end-to-end.
//
// Usage: node scripts/pusher-smoke-test.mjs
import crypto from 'node:crypto';

const APPS = [
  ['primary',   '2194260', '95ec31012edaf673af92', '711d557d78dfd4a1c683', 'mt1'],
  ['secondary', '2194261', 'c6716f35ee695ef14918', '49c69b21e974b6516523', 'mt1'],
  ['tertiary',  '2194265', '439f77585f04cd6a3025', '192bd0ea5cd8bd3c1021', 'mt1'],
  ['ap2',       '2194266', '0dc7b602fa2883797f86', '5d9f7eab35e7ce039e14', 'ap2'],
  ['ap4',       '2194271', '30d7c6e7fe9433069371', 'b3f18e23761cf00bc0df', 'ap4'],
];

const BEAMS = {
  instanceId: '869b3b95-386f-4984-ae8c-9b9735966bc8',
  primaryKey: '85F7D0792E5011EF4D66BB85BC1C7B152DADEE7D7DBDAC3CB4AEEEA8361CC4E0',
};

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
