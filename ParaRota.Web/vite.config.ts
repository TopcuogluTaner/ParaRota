import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Her build için benzersiz sürüm damgası. Hem koda gömülür (__APP_VERSION__)
// hem de dist/version.json'a yazılır; çalışan uygulama bu ikisini kıyaslayıp
// yeni deploy'ı anında yakalar.
const BUILD_VERSION = `${Date.now()}`;

// dist/version.json üretir — Cloudflare'de cache'lenmemesi için _headers ile
// no-cache işaretlenir (public/_headers).
function emitVersionFile() {
  return {
    name: 'emit-version-json',
    apply: 'build' as const,
    closeBundle() {
      const outDir = resolve(fileURLToPath(new URL('./dist', import.meta.url)));
      writeFileSync(resolve(outDir, 'version.json'), JSON.stringify({ version: BUILD_VERSION }));
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_VERSION),
  },
  plugins: [react(), emitVersionFile()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    // Tek monolitik bundle (1.8MB) yerine vendor chunk'lara böl — ilk yükleme
    // hızlansın ve cache hit oranı artsın (uygulama kodu değişse bile vendor sabit kalır).
    // Rolldown function form bekler (Vite 7).
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@mui')) return 'mui';
          if (id.includes('@tanstack')) return 'tanstack';
          if (id.includes('i18next')) return 'i18n';
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react-vendor';
          }
          return undefined;
        },
      },
    },
  },
});
