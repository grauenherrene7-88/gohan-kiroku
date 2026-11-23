/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'ごはん記録',
        short_name: 'ごはん記録',
        description: '食べたものを記録して栄養を計算するアプリ',
        lang: 'ja',
        theme_color: '#2f7d6d',
        background_color: '#f6f4ef',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // OCR の日本語データ・エンジン（初回にCDNから取得）もキャッシュしてオフラインで使えるようにする
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/(tesseract\.js|tesseract\.js-core|@tesseract\.js-data)/,
            handler: 'CacheFirst',
            options: { cacheName: 'ocr-assets', expiration: { maxEntries: 20 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  // 食品成分表データ(約360KB)を同梱しているので大きめでも問題ない
  build: { chunkSizeWarningLimit: 1600 },
  test: {
    environment: 'node',
  },
})
