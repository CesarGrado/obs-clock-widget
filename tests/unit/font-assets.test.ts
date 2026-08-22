import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FONTS } from '../../src/config/fonts';

const entries = ['src/editor/main.ts', 'src/clock/main.ts'];
const families = ['inter', 'montserrat', 'roboto-mono'];

describe('distributed font weights', () => {
  it('loads advertised weight 600 in every browser entry', () => {
    const registry = readFileSync('src/config/fonts.ts', 'utf8');
    for (const family of families) expect(registry).toContain(`@fontsource/${family}/latin-600.css`);
  });

  it('imports both entry points from the shared font registry module', () => {
    for (const entry of entries) expect(readFileSync(entry, 'utf8')).toContain("'../config/fonts'");
  });

  it('imports a latin CSS file for every advertised weight of every font', () => {
    const registry = readFileSync('src/config/fonts.ts', 'utf8');
    const packages = new Map<string, string[]>([
      ['system', ['inter']], ['mono', ['roboto-mono']], ['display', ['montserrat']], ['retro', ['roboto-mono']],
    ]);
    for (const font of FONTS) {
      const pkgs = packages.get(font.id) ?? [font.id];
      for (const pkg of pkgs) for (const weight of font.weights) expect(registry, `${pkg} ${weight}`).toContain(`@fontsource/${pkg}/latin-${weight}.css`);
    }
  });
});
