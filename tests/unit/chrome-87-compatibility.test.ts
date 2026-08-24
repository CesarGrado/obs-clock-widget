import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

describe('Chrome/CEF 87 compatibility', () => {
  it('contains no source references to the unavailable clone API', () => {
    const files = readdirSync('src', { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
      .map((entry) => join(entry.parentPath, entry.name));
    const unavailableApi = ['structured', 'Clone'].join('');
    for (const file of files) expect(readFileSync(file, 'utf8')).not.toContain(unavailableApi);
  });

  it('scans emitted JavaScript and CSS for post-Chrome-87 APIs and syntax', () => {
    expect(existsSync('dist/assets'), 'dist/ is missing — run npm run build first (or use npm run test:gate)').toBe(true);
    const assets = existsSync('dist/assets') ? readdirSync('dist/assets').filter((name) => /\.(?:js|css)$/.test(name)) : [];
    expect(assets.some((name) => name.endsWith('.js'))).toBe(true);
    expect(assets.some((name) => name.endsWith('.css'))).toBe(true);
    const forbiddenJavaScript = /structuredClone|Object\.hasOwn|Promise\.any|\.replaceAll\(|\.at\(|WeakRef|FinalizationRegistry|Array\.fromAsync|\.toSorted\(/;
    const forbiddenCss = /:has\(|@container|color-mix\(|\d+(?:dvh|svh|lvh)\b|grid-template-(?:rows|columns):[^;}]*\bsubgrid\b/;
    for (const name of assets) {
      const emitted = readFileSync(join('dist/assets', name), 'utf8');
      expect(emitted, `${name} contains a post-Chrome-87 feature`).not.toMatch(name.endsWith('.js') ? forbiddenJavaScript : forbiddenCss);
    }
  });

  it('clones and normalizes clock configs without structuredClone', async () => {
    vi.stubGlobal('structuredClone', undefined);
    vi.resetModules();

    const [{ DEFAULT_CONFIG }, { PRESETS }, { decodeConfig }, { normalizeConfig }] = await Promise.all([
      import('../../src/config/defaults'),
      import('../../src/config/presets'),
      import('../../src/config/codec'),
      import('../../src/config/schema'),
    ]);

    const normalized = normalizeConfig(DEFAULT_CONFIG);
    expect(normalized).toEqual(DEFAULT_CONFIG);
    expect(normalized).not.toBe(DEFAULT_CONFIG);
    expect(normalized.lines[0]).not.toBe(DEFAULT_CONFIG.lines[0]);
    expect(decodeConfig('#v=1')).toEqual(DEFAULT_CONFIG);
    expect(PRESETS.Minimal).toBeDefined();
  });

  it('uses countdown primitives available in Chrome/CEF 87', async () => {
    const { countdownDisplay, isAbsoluteIsoTarget } = await import('../../src/time/countdown');
    expect(isAbsoluteIsoTarget('2026-08-23T18:30:00Z')).toBe(true);
    expect(countdownDisplay('2026-08-24T18:30:00Z', new Date('2026-08-22T13:15:51Z'), false, 'en-US')).toEqual({ kind: 'countdown', text: '2d 05:14:09' });
  });
});
