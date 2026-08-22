import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

// The build targets Chrome 87, which supports WOFF2; fontsource CSS also lists
// a WOFF v1 fallback per face. Dropping the fallback halves the font payload.
const woff2Only = (): Plugin => ({
  name: 'woff2-only-fonts',
  enforce: 'pre',
  load(id) {
    if (id.includes('node_modules/@fontsource/') && id.endsWith('.css')) {
      return readFileSync(id, 'utf8').replace(/,\s*url\([^)]*\.woff\)\s*format\('woff'\)/g, '');
    }
    return null;
  },
});

export default defineConfig({
  plugins: [woff2Only()],
  build: {
    target: 'chrome87',
    sourcemap: false,
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'index.html'),
        editor: resolve(__dirname, 'editor/index.html'),
        clock: resolve(__dirname, 'v1/clock/index.html'),
      },
    },
  },
});
