// Responsive smoke test: loads login + signup at real device viewports and
// asserts no horizontal overflow and adequate touch-target sizing.
// Usage: node scripts/responsive-smoke-test.mjs  (needs `npm run preview -- --port 4189` running)
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4189';
const VIEWPORTS = [
  { name: 'phone-sm', width: 360, height: 740 },
  { name: 'phone-lg', width: 430, height: 932 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1440, height: 900 },
];

const results = [];
let failures = 0;

for (const vp of VIEWPORTS) {
  const browser = await chromium.launch({ channel: 'chromium' });
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2, hasTouch: vp.width < 900 });
  const page = await ctx.newPage();

  for (const route of ['#/login', '#/signup']) {
    await page.goto(`${BASE}/${route}`, { waitUntil: 'load' });
    await page.waitForTimeout(700);

    const isTouch = vp.width < 900; // emulated phone/tablet contexts enforce the 16px input font
    const r = await page.evaluate((touchExpected) => {
      const doc = document.documentElement;
      const overflowX = doc.scrollWidth - doc.clientWidth;
      // touch-target check for visible inputs + main buttons
      const els = [...document.querySelectorAll('input, button[type="submit"]')];
      const tooSmall = els.filter((el) => {
        const b = el.getBoundingClientRect();
        return b.width > 0 && b.height > 0 && (b.height < 40 || b.width < 40);
      }).map((el) => `${el.tagName}.${(el.className || '').toString().slice(0, 24)} ${Math.round(el.getBoundingClientRect().height)}px`);
      // font-size check (iOS auto-zoom guard: must be >= 16px)
      const smallFont = touchExpected ? els.filter((el) => {
        const b = el.getBoundingClientRect();
        if (b.width === 0) return false;
        return el.tagName === 'INPUT' && parseFloat(getComputedStyle(el).fontSize) < 16;
      }).map((el) => `${(el.placeholder || el.type)} ${getComputedStyle(el).fontSize}`) : [];
      const card = document.querySelector('.auth-card');
      const cardBox = card ? card.getBoundingClientRect() : null;
      return {
        overflowX,
        tooSmall,
        smallFont,
        cardWidth: cardBox ? Math.round(cardBox.width) : 0,
        viewportW: doc.clientWidth,
      };
    }, isTouch);

    const ok = r.overflowX <= 1 && r.tooSmall.length === 0 && r.smallFont.length === 0;
    if (!ok) failures++;
    results.push({ viewport: vp.name, route, ...r, ok });
    console.log(`${ok ? '✅' : '❌'} ${vp.name} (${vp.width}px) ${route}: overflowX=${r.overflowX} card=${r.cardWidth}/${r.viewportW} tooSmall=${r.tooSmall.length} smallFont=${r.smallFont.length}${r.smallFont.length ? ' → ' + r.smallFont.join(', ') : ''}${r.tooSmall.length ? ' → ' + r.tooSmall.join(', ') : ''}`);

    if (route === '#/signup') {
      await page.screenshot({ path: `/tmp/resp-${vp.name}-signup.png` });
    }
  }
  await browser.close();
}

writeFileSync('/tmp/tirbeo-responsive-results.json', JSON.stringify(results, null, 2));
console.log(failures === 0 ? '\n🎉 ALL VIEWPORTS PASS' : `\n⚠️ ${failures} failing viewport/route combos`);
process.exit(failures === 0 ? 0 : 1);
