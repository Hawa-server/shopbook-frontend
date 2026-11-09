// Build settings: React, Tailwind, the offline app (vite-plugin-pwa), the /api proxy for local work,
// the temporary test build's switch (VITE_SYNC_TEST_SCREEN), and Vitest. The app's name comes from the dictionary key 'app.name' (docs/design.md §1), so a new
// brand name is one line in src/i18n/en.js plus new icons.

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import en from './src/i18n/en.js';
import pkg from './package.json' with { type: 'json' };

const APP_NAME = en['app.name'];

// Fills index.html: the app's name (%APP_NAME%), and in a temporary test build, the "TEST BUILD" bar on the
// splash that shows before any JavaScript runs (<!--TEST_BUILD_BAR-->; components/TestBuildBanner.jsx after that).
function fillHtml(isTestBuild) {
  const bar = '<div style="background:#F2B544;color:#1B1B18;font:700 1rem system-ui,sans-serif;text-align:center;padding:.5rem">TEST BUILD</div>';
  return {
    name: 'fill-html',
    transformIndexHtml: (html) => html.replaceAll('%APP_NAME%', APP_NAME).replace('<!--TEST_BUILD_BAR-->', isTestBuild ? bar : ''),
  };
}

export default defineConfig(({ command, mode }) => {
  // Only API_PROXY_TARGET is read here, and only for `npm run dev`; it is never put into the app.
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.API_PROXY_TARGET || 'http://localhost:3000';
  // A temporary test build for the real-phone test (docs/guide.md, FE3.5). These become fixed true/false in
  // the code at build time, so without the setting the test screen's code is left out of the build entirely.
  const isTestBuild = env.VITE_SYNC_TEST_SCREEN === '1';

  return {
    plugins: [
      react(),
      tailwindcss(),
      fillHtml(isTestBuild),
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
      __SYNC_TEST_SCREEN__: JSON.stringify(command === 'serve' || isTestBuild),
      __TEST_BUILD_BANNER__: JSON.stringify(isTestBuild),
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
