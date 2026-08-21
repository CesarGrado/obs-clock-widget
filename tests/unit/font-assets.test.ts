import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const entries = ['src/editor/main.ts', 'src/clock/main.ts'];
const families = ['inter', 'montserrat', 'roboto-mono'];

describe('distributed font weights', () => {
  it('loads advertised weight 600 in every browser entry', () => {
    for (const entry of entries) {
      const source = readFileSync(entry, 'utf8');
      for (const family of families) expect(source).toContain(`@fontsource/${family}/latin-600.css`);
    }
  });
});
