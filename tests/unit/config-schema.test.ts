import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/config/defaults';
import { cloneClockConfig } from '../../src/config/clone';
import { normalizeConfig } from '../../src/config/schema';

describe('configuration schema', () => {
  it('accepts documented defaults', () => expect(normalizeConfig(DEFAULT_CONFIG)).toEqual(DEFAULT_CONFIG));
  it('bounds and allowlists every field', () => {
    const value = normalizeConfig({
      version: 1, timezone: 'javascript:alert(1)', locale: 'x'.repeat(100), align: 'evil', gap: 999,
      stroke: 99, shadow: 99,
      lines: [{ enabled: true, format: '<script>', font: 'url(evil)', size: 9999, weight: 999, color: 'url(evil)', opacity: 9, transform: 'evil' }],
    });
    expect(value).toEqual(DEFAULT_CONFIG);
  });
  it('supports two independently styled valid lines', () => {
    const value = normalizeConfig({ ...DEFAULT_CONFIG, align: 'left', timezone: 'UTC', locale: 'en-GB', lines: [
      { enabled: true, format: 'HH:mm', font: 'mono', size: 120, weight: 700, color: '#00FFAA', opacity: 0.8, transform: 'uppercase' },
      { enabled: false, format: 'dddd, MMMM D', font: 'system', size: 32, weight: 400, color: '#FFFFFF', opacity: 1, transform: 'none' },
    ] });
    expect(value.align).toBe('left');
    expect(value.lines[0]?.font).toBe('mono');
  });
  it('rejects line formats that the clock formatter cannot lex', () => {
    const invalid = cloneClockConfig(DEFAULT_CONFIG);
    invalid.lines[0].format = 'HH:mm X';
    expect(normalizeConfig(invalid)).toEqual(DEFAULT_CONFIG);
  });
  it('rejects unsupported major versions', () => expect(normalizeConfig({ ...DEFAULT_CONFIG, version: 2 })).toEqual(DEFAULT_CONFIG));
});
