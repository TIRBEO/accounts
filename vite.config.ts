import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {visualizer} from 'rollup-plugin-visualizer';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

/* Vite serves public/ with Cache-Control: no-cache, so every reload re-downloads
   all hero photos and the collage flashes blank until they arrive. Force a day of
   cache on static image responses in dev and preview. */
const cacheImages = (): Plugin => {
  const wrap = (server: {middlewares: {use: (fn: (req: any, res: any, next: any) => void) => void}}) => {
    server.middlewares.use((req, res, next) => {
      if (/\.(jpg|jpeg|png|webp|svg|ico)(\?|$)/i.test(req.url || '')) {
        const orig = res.setHeader.bind(res);
        res.setHeader = (name: string, value: unknown) =>
          String(name).toLowerCase() === 'cache-control'
            ? orig('Cache-Control', 'public, max-age=86400')
            : orig(name, value);
      }
      next();
    });
  };
  return {
    name: 'cache-images',
    configureServer: wrap,
    configurePreviewServer: wrap,
  };
};

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      cacheImages(),
      tailwindcss(),
      ...(process.env.ANALYZE
        ? [visualizer({ open: false, filename: 'dist/bundle-analysis.html', gzipSize: true })]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'motion': ['motion/react'],
            'lucide': ['lucide-react'],
            'react-vendor': ['react', 'react-dom'],
          },
        },
      },
    },
    server: {
      // The API (apps/api) owns port 3000 — never let Vite default to it,
      // or the accounts app would call itself for API requests. Pin 3002
      // (matching the dev script) and refuse to start on any other port.
      port: 3002,
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
