import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/** Injects built asset paths + a content-derived cache version into dist/sw.js. */
function pwaPrecachePlugin(): Plugin {
  return {
    name: 'tlg-pwa-precache',
    apply: 'build',
    closeBundle() {
      const distDir = join(process.cwd(), 'dist');
      const swPath = join(distDir, 'sw.js');
      if (!existsSync(swPath)) return;

      const assetsDir = join(distDir, 'assets');
      const assetFiles = existsSync(assetsDir)
        ? readdirSync(assetsDir)
            .filter((f) => !f.endsWith('.map'))
            .sort()
            .map((f) => `./assets/${f}`)
        : [];

      const hash = createHash('sha256');
      for (const rel of ['./index.html', ...assetFiles]) {
        const full = join(distDir, rel);
        if (existsSync(full)) {
          hash.update(rel);
          hash.update(String(statSync(full).size));
        }
      }
      const cacheName = `tlg-shell-${hash.digest('hex').slice(0, 10)}`;
      const swSource = readFileSync(swPath, 'utf8')
        .replace("'__TLG_CACHE_NAME__'", JSON.stringify(cacheName))
        .replace('__TLG_PRECACHE_ASSETS__', JSON.stringify(assetFiles));
      writeFileSync(swPath, swSource);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [pwaPrecachePlugin()],
  server: { host: true, port: 5173 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
});
