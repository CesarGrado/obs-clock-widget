import { describe, expect, it } from 'vitest';
import { FONTS, FONT_IDS, fontById, fontFamiliesFor } from '../../src/config/fonts';
import { encodeConfig, decodeConfig } from '../../src/config/codec';
import { DEFAULT_CONFIG } from '../../src/config/defaults';
import { normalizeConfig } from '../../src/config/schema';

describe('font registry', () => {
  it('has unique ids', () => {
    const ids = FONTS.map((font) => font.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('exposes a FONT_IDS list that matches the registry exactly', () => {
    expect([...FONT_IDS].sort()).toEqual(FONTS.map((font) => font.id).sort());
  });

  it('preserves every legacy font id with its exact legacy family stack', () => {
    expect(fontById('system')?.family).toBe('Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
    expect(fontById('mono')?.family).toBe('"Roboto Mono", ui-monospace, SFMono-Regular, Consolas, monospace');
    expect(fontById('display')?.family).toBe('Montserrat, ui-sans-serif, system-ui, sans-serif');
    expect(fontById('retro')?.family).toBe('"Roboto Mono", ui-monospace, monospace');
  });

  it('keeps every category non-empty', () => {
    const categories = new Set(FONTS.map((font) => font.category));
    expect(categories.size).toBeGreaterThan(1);
    for (const category of categories) expect(FONTS.some((font) => font.category === category)).toBe(true);
  });

  it('ships a curated library of at least 35 fonts', () => {
    expect(FONTS.length).toBeGreaterThanOrEqual(39);
  });

  it('only advertises weights in 400–700', () => {
    for (const font of FONTS) {
      for (const weight of font.weights) expect([400, 500, 600, 700]).toContain(weight);
      expect(new Set(font.weights).size).toBe(font.weights.length);
    }
  });

  it('records single-weight fonts as 400-only', () => {
    for (const id of ['bebas-neue', 'anton', 'archivo-black', 'permanent-marker', 'patrick-hand']) expect(fontById(id)?.weights).toEqual([400]);
  });

  it('falls back to the system stack for unknown ids', () => {
    expect(fontFamiliesFor('definitely-not-a-font')).toBe(fontById('system')?.family);
  });
});

describe('font registry integration', () => {
  it('round-trips a config using a non-legacy font id through the codec', () => {
    const config = { ...DEFAULT_CONFIG, lines: [
      { ...DEFAULT_CONFIG.lines[0], font: 'bebas-neue', weight: 400 },
      { ...DEFAULT_CONFIG.lines[1], font: 'jetbrains-mono' },
    ] as typeof DEFAULT_CONFIG.lines };
    const decoded = decodeConfig(encodeConfig(config));
    expect(decoded.lines[0]?.font).toBe('bebas-neue');
    expect(decoded.lines[1]?.font).toBe('jetbrains-mono');
  });

  it('accepts legacy font ids in the schema', () => {
    for (const id of ['system', 'mono', 'display', 'retro'] as const) {
      const config = { ...DEFAULT_CONFIG, lines: [
        { ...DEFAULT_CONFIG.lines[0], font: id },
        { ...DEFAULT_CONFIG.lines[1], font: id },
      ] as typeof DEFAULT_CONFIG.lines };
      expect(normalizeConfig(config).lines[0]?.font).toBe(id);
    }
  });

  it('accepts new library font ids in the schema and rejects unknown ids', () => {
    const withOswald = { ...DEFAULT_CONFIG, lines: [
      { ...DEFAULT_CONFIG.lines[0], font: 'oswald' },
      { ...DEFAULT_CONFIG.lines[1], font: 'oswald' },
    ] as typeof DEFAULT_CONFIG.lines };
    expect(normalizeConfig(withOswald).lines[0]?.font).toBe('oswald');
    const bogus = { ...DEFAULT_CONFIG, lines: [
      { ...DEFAULT_CONFIG.lines[0], font: 'comic-sans-neo' },
      { ...DEFAULT_CONFIG.lines[1] },
    ] as unknown as typeof DEFAULT_CONFIG.lines };
    expect(normalizeConfig(bogus)).toEqual(DEFAULT_CONFIG);
  });
});
