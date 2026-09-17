// Browser E2E: open the app in a real Chromium, click the notification bell,
// verify Beams device registration (VAPID subscribe + Device API), then
// publish web-pushes and assert the SW receives them and the page toasts.
//
// IMPORTANT: uses a PERSISTENT context (real profile dir) — Chrome's Push API
// is unavailable in incognito ("Registration failed - permission denied" even
// with permission granted), and Playwright's default ephemeral contexts are
// incognito. A persistent profile makes pushManager.subscribe() work.
//
// Usage: node scripts/browser-push-test.mjs   (server must serve $BASE)
import { chromium, firefox } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import crypto from 'node:crypto';

const INSTANCE_ID = '869b3b95-386f-4984-ae8c-9b9735966bc8';
const PRIMARY_KEY = '85F7D0792E5011EF4D66BB85BC1C7B152DADEE7D7DBDAC3CB4AEEEA8361CC4E0';
const BASE = 'http://127.0.0.1:4176';
const PROFILE = mkdtempSync(join(tmpdir(), 'tirbeo-e2e-profile-'));
const MARK = `E2E-${crypto.randomBytes(4).toString('hex')}`;

// BROWSER=chromium|firefox (default: firefox — its Mozilla autopush service is
// reachable from sandboxes, unlike Chrome's FCM handshake which requires
// Google backend APIs and yields fake push.invalid endpoints when blocked).
const BROWSER = (process.env.BROWSER || 'firefox').toLowerCase();

const browser = BROWSER === 'firefox'
  ? await firefox.launchPersistentContext(PROFILE, {
      headless: process.env.HEADED === '1' ? false : true,
      viewport: { width: 1280, height: 800 },
      // Headless Firefox ships with the push service connection disabled;
      // these prefs enable Mozilla autopush so pushManager.subscribe()
      // returns a REAL https://updates.push.services.mozilla.com endpoint.
      firefoxUserPrefs: {
        'dom.push.enabled': true,
        'dom.push.connection.enabled': true,
        'dom.push.serverURL': 'wss://push.services.mozilla.com/',
        'dom.push.udp.wakeupEnabled': false,
        'dom.serviceWorkers.enabled': true,
        'dom.serviceWorkers.push.enabled': true,
        'dom.serviceWorkers.pushEvent.enabled': true,
        'dom.serviceWorkers.timeoutIdle': 120000,
      },
    })
  : await chromium.launchPersistentContext(PROFILE, {
      headless: process.env.HEADED === '1' ? false : true,
      // 'chromium' channel = full new-headless build (the headless SHELL denies
      // Notification.permission outright).
      channel: 'chromium',
      viewport: { width: 1280, height: 800 },
      args: ['--no-first-run'],
    });

// Auto-accept the notifications prompt for our (trusted localhost) origin.
await browser.grantPermissions(['notifications'], { origin: BASE });

const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('   [console.error]', m.text().slice(0, 160)); });
page.on('response', (r) => { if (r.status() >= 400) console.log('   [http]', r.status(), r.url().slice(0, 110)); });
page.on('requestfailed', (r) => console.log('   [failed]', r.failure()?.errorText, r.url().slice(0, 110)));
// Collect every toast (they auto-dismiss after ~3s) from page load onward.
await page.addInitScript(() => {
  (window).__toasts = [];
  const mo = new MutationObserver(() => {
    document.querySelectorAll('.tb-toast').forEach((t) => {
      const txt = t.textContent?.trim();
      if (txt && !(window).__toasts.includes(txt)) (window).__toasts.push(txt);
    });
  });
  const start = () => mo.observe(document.body, { childList: true, subtree: true });
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
});

const results = [];
const ok = (name, cond, extra = '') => {
  results.push({ name, pass: !!cond, extra });
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
};

// 1) Load the app (avoid networkidle — realtime socket keeps traffic open)
await page.goto(BASE + '/', { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1500);
ok('app loaded', true, await page.title());

// 2) Permission actually granted on this origin?
const perm = await page.evaluate(() => Notification.permission);
ok('notifications permission granted', perm === 'granted', `permission=${perm}`);
if (perm !== 'granted') {
  await browser.close();
  process.exit(1);
}

// 3) Service worker active?
await page.evaluate(() => navigator.serviceWorker.ready).catch(() => {});
const swState = await page.evaluate(async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  return regs.map((r) => ({ scope: r.scope, active: !!r.active }));
});
ok('service worker registered', swState.some((s) => s.active), JSON.stringify(swState));

// 4) Bell visible → click → Beams registration runs
// 3b) Raw Push API capability probe (isolates Beams from browser/network):
// subscribe with a throwaway VAPID key, 12s timeout, report exact outcome.
const probe = await page.evaluate(async () => {
  const TEST_VAPID = 'BBlYBgzSJzGOoVbFfMahWTwEWoPw-l9Ty2yOOxOTJBFWTgVbXhVRfjMv2VzvFnM0UJcMGm2tKQvwKvWDP-jTo1k';
  const attempt = (async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: TEST_VAPID });
    return sub.endpoint.slice(0, 80);
  })();
  return Promise.race([
    attempt.then((ep) => ({ ok: true, endpoint: ep })),
    new Promise((resolve) => setTimeout(() => resolve({ ok: false, error: 'TIMEOUT after 12s (subscribe hung)' }), 12000)),
  ]).catch((e) => ({ ok: false, error: String(e) }));
});
console.log(`   raw pushManager.subscribe probe: ${JSON.stringify(probe)}`);

const bell = page.locator('button[aria-label*="otifications"]');
await bell.waitFor({ state: 'visible', timeout: 5000 });
ok('notification bell visible', true);
await bell.click();
// Beams start(): pushManager.subscribe(VAPID) → device_api register → IndexedDB
await page.waitForTimeout(8000);
const toasts = await page.evaluate(() => (window).__toasts || []);
if (toasts.length) console.log('   toasts seen:', JSON.stringify(toasts));

// 5) Verify Beams device state in IndexedDB (db beams-<id>, store beams)
const device = await page.evaluate(async (instanceId) => {
  function idbGet(dbName, store, key) {
    return new Promise((resolve) => {
      const req = indexedDB.open(dbName);
      req.onsuccess = (e) => {
        const db = e.target.result;
        try {
          const r = db.transaction(store, 'readonly').objectStore(store).get(key);
          r.onsuccess = () => resolve(r.result || null);
          r.onerror = () => resolve(null);
        } catch { resolve(null); }
      };
      req.onerror = () => resolve(null);
    });
  }
  return idbGet(`beams-${instanceId}`, 'beams', instanceId);
}, INSTANCE_ID);
ok('Beams device registered', !!device?.device_id, `deviceId=${device?.device_id || 'none'}`);
ok('push token issued (VAPID endpoint)', !!device?.token, device?.token ? `${String(device.token).slice(0, 60)}…` : '');

// 6) Publish a push to the 'hello' interest (this fresh profile's device is
//    its only subscriber) and assert the SW mirrors it into the page.
if (device?.device_id) {
  const res = await fetch(
    `https://${INSTANCE_ID}.pushnotifications.pusher.com/publish_api/v1/instances/${INSTANCE_ID}/publishes`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PRIMARY_KEY}` },
      body: JSON.stringify({
        interests: ['hello'],
        web: { notification: { title: 'Tirbeo E2E', body: `Browser push ${MARK}`, deep_link: BASE } },
      }),
    },
  );
  const body = await res.json().catch(() => ({}));
  ok('Beams publish accepted', res.ok, `status=${res.status} ${body.publishId || body.error || ''}`);

  try {
    await page.waitForSelector('.tb-toast', { timeout: 25000 });
    const toastText = (await page.locator('.tb-toast').first().textContent()) || '';
    const allToasts = await page.evaluate(() => (window).__toasts || []);
    const hit = toastText.includes(MARK) || allToasts.some((t) => t.includes(MARK));
    ok('push received → SW → in-app toast', hit, JSON.stringify((hit ? allToasts.find((t) => t.includes(MARK)) : allToasts[allToasts.length - 1] || toastText) || '').slice(0, 100));
  } catch {
    ok('push received → SW → in-app toast', false, 'no toast within 25s');
  }

  // 6b) In-app delivery pipeline: send a push-shaped message through the REAL
  // service worker (SW → postMessage → App listener → toast). Proves the
  // in-app rendering half of the pipeline end-to-end.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.evaluate((mark) => {
    return navigator.serviceWorker.ready.then((reg) => {
      reg.active.postMessage({
        type: 'tirbeo:test-push',
        payload: { title: 'Tirbeo E2E', body: `In-app pipeline ${mark}` },
      });
    });
  }, MARK);
  // The SW echoes test messages to clients using the same mirror channel.
  try {
    await page.waitForFunction(
      (mark) => ((window).__toasts || []).some((t) => t.includes(`In-app pipeline ${mark}`)),
      MARK,
      { timeout: 8000 },
    );
    ok('in-app pipeline (SW → toast)', true);
  } catch {
    ok('in-app pipeline (SW → toast)', false, 'toast not seen within 8s');
  }
} else {
  ok('Beams publish accepted', false, 'skipped — no device');
  ok('push received → SW → in-app toast', false, 'skipped — no device');
}

// 7) Second proof: publish while the OS notification shows even when the
//    browser window is minimized is out of scope here; screenshot the state.
await page.screenshot({ path: '/tmp/tirbeo-push-e2e.png' });
console.log('\n📸 screenshot: /tmp/tirbeo-push-e2e.png');

const pass = results.filter((r) => r.pass).length;
console.log(`\n${pass}/${results.length} checks passed`);
await browser.close();
process.exit(pass === results.length ? 0 : 1);
