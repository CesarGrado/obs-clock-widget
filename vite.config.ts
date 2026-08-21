import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
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
