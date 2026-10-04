import sharp from 'sharp';
import { access, stat } from 'node:fs/promises';

const out = [];

const exists = (p) => access(p).then(() => true, () => false);

async function job(src, dest, pipelineFactory, label) {
  if (!(await exists(src))) {
    out.push(`${label}: skipped (missing ${src})`);
    return;
  }
  await pipelineFactory().toFile(dest);
  const { size } = await stat(dest);
  out.push(`${label}: ${dest} → ${(size / 1024).toFixed(0)}KB`);
}

// Background — public/background.jpg is served as-is (34KB, 736x414).

// Logo — displayed at 36px height; 288px = 8x retina headroom (was 1.1MB @ 1536x1024)
await job('public/logo.png', 'public/logo-opt.png',
  () => sharp('public/logo.png').resize({ height: 288, withoutEnlargement: true }).png({ compressionLevel: 9, palette: true }), 'logo');

// Favicon — was a 1.1MB .ico
await job('public/logo.png', 'public/favicon-48.png',
  () => sharp('public/logo.png').resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }), 'favicon');

// Apple touch icon — 180x180 opaque
await job('public/logo.png', 'public/apple-touch-icon.png',
  () => sharp('public/logo.png').resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } }).png({ compressionLevel: 9 }), 'apple-touch');

console.log(out.join('\n'));
