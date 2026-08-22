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

// Redistribution compliance: copy the third-party notices and full license
// texts for every bundled font into the deployment output.
const shipLicenses = (): Plugin => ({
  name: 'ship-license-texts',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'THIRD_PARTY_NOTICES.md', source: readFileSync(resolve(__dirname, 'THIRD_PARTY_NOTICES.md')) });
    for (const name of ['Inter-OFL.txt', 'Montserrat-OFL.txt', 'Roboto-Mono-OFL.txt', 'Ubuntu-Mono-UFL-1.0.txt', 'Permanent-Marker-Apache-2.0.txt']) {
      this.emitFile({ type: 'asset', fileName: `licenses/${name}`, source: readFileSync(resolve(__dirname, 'licenses', name)) });
    }
  },
});

export default defineConfig({
  plugins: [woff2Only(), shipLicenses()],
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
