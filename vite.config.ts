import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {visualizer} from 'rollup-plugin-visualizer';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), visualizer({
      open: false,
      filename: 'dist/bundle-analysis.html',
      gzipSize: true,
    })],
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
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
