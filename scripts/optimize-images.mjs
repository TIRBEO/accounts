import sharp from 'sharp';

const out = [];

async function job(src, dest, pipeline, label) {
  await pipeline.toFile(dest);
  const { size } = await import('node:fs/promises').then((fs) => fs.stat(dest));
  out.push(`${label}: ${dest} → ${(size / 1024).toFixed(0)}KB`);
}

// Backgrounds — downscale + WebP (was 1.6–1.8MB each)
await job('public/background.png', 'public/background.webp',
  sharp('public/background.png').resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 72 }), 'desktop');
await job('public/background-tab.png', 'public/background-tab.webp',
  sharp('public/background-tab.png').resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 72 }), 'tab');
await job('public/background-mobile.png', 'public/background-mobile.webp',
  sharp('public/background-mobile.png').resize({ width: 720, withoutEnlargement: true }).webp({ quality: 70 }), 'mobile');

// Logo — displayed at 36px height; 288px = 8x retina headroom (was 1.1MB @ 1536x1024)
await job('public/logo.png', 'public/logo-opt.png',
  sharp('public/logo.png').resize({ height: 288, withoutEnlargement: true }).png({ compressionLevel: 9, palette: true }), 'logo');

// Favicon — was a 1.1MB .ico
await job('public/logo.png', 'public/favicon-48.png',
  sharp('public/logo.png').resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }), 'favicon');

// Apple touch icon — 180x180 opaque
await job('public/logo.png', 'public/apple-touch-icon.png',
  sharp('public/logo.png').resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } }).png({ compressionLevel: 9 }), 'apple-touch');

console.log(out.join('\n'));
