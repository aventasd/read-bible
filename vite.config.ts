import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Hosted on GitHub Pages under a project subpath, so `base` must be set and the
 * app uses hash routing. A service worker cannot claim a scope above its own
 * folder, and GitHub Pages cannot send the header that would allow it, so the
 * scope is the subpath and nothing tries to claim "/".
 */
const BASE = '/read-bible/';

export default defineConfig({
  base: BASE,
  plugins: [
    preact(),
    VitePWA({
      // 'prompt' would leave him on an old build until every tab closes, and an
      // installed app window almost never closes.
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
      manifest: {
        id: BASE,
        name: 'The Old Testament in a Year',
        short_name: 'Old Testament',
        description: 'The whole Old Testament in one year, read in the order the history happened.',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F1F2EF',
        theme_color: '#16233B',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          // Without a maskable icon Android crops the square into a circle and
          // pads it with white.
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the shell and the first ten readings only. Workbox install is
        // all or nothing, so a long precache list on a weak signal means no
        // offline app at all, silently.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}', 'text/v1/r00[1-9].json', 'text/v1/r010.json'],
        // The default is 2 MiB, and anything larger is dropped from the manifest
        // with no error. Kept explicit so that failure mode cannot come back.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: `${BASE}index.html`,
        runtimeCaching: [
          {
            // The remaining 303 readings, cached the first time each is opened,
            // or all at once from the button in Settings.
            urlPattern: ({ url }) => url.pathname.includes('/text/v1/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'reading-text-v1',
              expiration: { maxEntries: 400 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com' || url.origin === 'https://fonts.googleapis.com',
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { port: 3027, strictPort: true },
  preview: { port: 3027, strictPort: true },
});
