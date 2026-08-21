import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'jsdom', include: ['tests/unit/**/*.test.ts', 'tests/components/**/*.test.ts', 'tests/security/**/*.test.ts'] },
});
