import { readFileSync, readdirSync } from 'node:fs';
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
