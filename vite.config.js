// Build settings: React, Tailwind, the offline app (vite-plugin-pwa), the /api proxy for local work,
// and Vitest. The app's name comes from the dictionary key 'app.name' (docs/design.md §1), so a new
// brand name is one line in src/i18n/en.js plus new icons.

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import en from './src/i18n/en.js';
import pkg from './package.json' with { type: 'json' };

const APP_NAME = en['app.name'];

// Puts the app's name into index.html's <title> (written there as %APP_NAME%).
function appNameInHtml() {
  return {
    name: 'app-name-in-html',
    transformIndexHtml: (html) => html.replaceAll('%APP_NAME%', APP_NAME),
  };
}

export default defineConfig(({ mode }) => {
  // Only API_PROXY_TARGET is read here, and only for `npm run dev`; it is never put into the app.
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.API_PROXY_TARGET || 'http://localhost:3000';

  return {
    plugins: [
      react(),
      tailwindcss(),
      appNameInHtml(),
      VitePWA({
        // 'prompt': a new version waits for the person to tap "Update now" (never a surprise reload).
        registerType: 'prompt',
        injectRegister: false, // UpdatePrompt registers it, so no inline script is added (CSP)
        includeAssets: ['icons/logo-mark.svg', 'icons/logo-mark-small.svg', 'icons/apple-touch-180.png'],
        manifest: {
          name: APP_NAME,
          short_name: APP_NAME,
          description: APP_NAME,
          lang: 'en',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#0F6B4A',
          background_color: '#F4F2EC',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Cache the app's own files so it opens with no network at all.
          globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
          navigateFallback: '/index.html',
          // Never answer /api requests from the cache: server answers must always be fresh
          // (the server also sends Cache-Control: no-store).
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    server: {
      // Locally, /api goes to the backend, so the app always calls its own address (same as production).
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: true },
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.js'],
    },
  };
});
