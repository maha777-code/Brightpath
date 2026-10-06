import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      selfDestroying: true,
      includeAssets: ['favicon.ico', 'assets/brand/*.png'],
      manifest: {
        name: 'MindVault - Personalized AI Learning for Every Learner',
        short_name: 'MindVault',
        theme_color: '#040711',
        background_color: '#040711',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'assets/brand/mindvault-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'assets/brand/mindvault-icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@brightpath/i18n': path.resolve(__dirname, '../../packages/i18n/src/index.ts'),
      '@brightpath/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: [path.resolve(__dirname, '../..')],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
        // Stream large multipart PDF uploads; do not buffer the body.
        timeout: 300_000,
        proxyTimeout: 300_000,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/public': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
        timeout: 300_000,
        proxyTimeout: 300_000,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/public': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
