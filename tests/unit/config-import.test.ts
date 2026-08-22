import { describe, expect, it } from 'vitest';
import { encodeConfig } from '../../src/config/codec';
import { parseConfigImport } from '../../src/config/import';
import { PRESETS } from '../../src/config/presets';

describe('strict config import', () => {
  it('imports a canonical event countdown URL with explicit overtime', () => {
    const input = 'https://obs-clock-widget.pages.dev/v1/clock/#v=1&m=countdown&ct=2026-08-24T18%3A30%3A00Z&ot=1';
    const result = parseConfigImport(input, 'https://obs-clock-widget.pages.dev');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.config).toMatchObject({ mode: 'countdown', countdownTarget: '2026-08-24T18:30:00Z', overtime: true });
  });

  it.each([
    'v=1&tz=Pacific%2FChatham&f1=HH%3Amm+%27NZ%27',
    '#v=1&tz=Pacific%2FChatham&f1=HH%3Amm+%27NZ%27',
    'http://127.0.0.1:4173/v1/clock/#v=1&tz=Pacific%2FChatham&f1=HH%3Amm+%27NZ%27',
    'https://obs-clock-widget.pages.dev/v1/clock#v=1&tz=Pacific%2FChatham&f1=HH%3Amm+%27NZ%27',
  ])('imports a generated URL or raw fragment canonically: %s', (input) => {
    const result = parseConfigImport(input, 'http://127.0.0.1:4173');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.timezone).toBe('Pacific/Chatham');
    expect(result.config.lines[0].format).toBe("HH:mm 'NZ'");
    expect(encodeConfig(result.config)).toBe("v=1&tz=Pacific%2FChatham&f1=HH%3Amm+%27NZ%27");
  });

  it('round trips a complete generated configuration without changing its canonical fragment', () => {
    const fragment = encodeConfig(PRESETS.Puzzlr!);
    const result = parseConfigImport(`https://obs-clock-widget.pages.dev/v1/clock/#${fragment}`, 'http://127.0.0.1:4173');

    expect(result.ok).toBe(true);
    if (result.ok) expect(encodeConfig(result.config)).toBe(fragment);
  });

  it('rejects a full widget URL import with an unsupported font weight instead of accepting mismatched state', () => {
    const result = parseConfigImport('https://obs-clock-widget.pages.dev/v1/clock/#v=1&ft1=bebas-neue&w1=700', 'http://127.0.0.1:4173');
    expect(result).toEqual({ ok: false, code: 'noncanonical-fragment' });
  });

  it('rejects a weight-limited font import whose omitted weight implies an unsupported default', () => {
    const result = parseConfigImport('https://obs-clock-widget.pages.dev/v1/clock/#v=1&ft1=bebas-neue', 'http://127.0.0.1:4173');
    expect(result).toEqual({ ok: false, code: 'noncanonical-fragment' });
  });

  it('accepts the canonical clamped URL so editor controls, preview, and runtime agree', () => {
    const result = parseConfigImport('https://obs-clock-widget.pages.dev/v1/clock/#v=1&ft1=bebas-neue&w1=400', 'http://127.0.0.1:4173');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.lines[0].font).toBe('bebas-neue');
    expect(result.config.lines[0].weight).toBe(400);
    expect(encodeConfig(result.config)).toBe('v=1&ft1=bebas-neue&w1=400');
  });

  it.each([
    ['v=1&f1=%E0%A4%A', 'malformed-escape'],
    ['v=1&v=1', 'duplicate-key'],
    [`v=1&f1=${'x'.repeat(2049)}`, 'oversized-fragment'],
    ['v=1&unexpected=value', 'invalid-key'],
    ['v=1&%5F%5Fproto%5F%5F=value', 'invalid-key'],
    ['v=1&e1=2', 'invalid-value'],
    ['v=2', 'unsupported-version'],
    ['%76=%31', 'noncanonical-fragment'],
    ['tz=UTC&v=1', 'noncanonical-fragment'],
    ['v=1&tz=local', 'noncanonical-fragment'],
    ['v=1&gap=8.0', 'noncanonical-fragment'],
    ['v=1&', 'noncanonical-fragment'],
    ['v=1&&', 'noncanonical-fragment'],
    ['https://obs-clock-widget.pages.dev/v1/clock/#tz=UTC&v=1', 'noncanonical-fragment'],
    ['https://obs-clock-widget.pages.dev/v1/clock/#v=\t1', 'noncanonical-fragment'],
  ] as const)('reports the precise fragment failure for %s', (input, code) => {
    expect(parseConfigImport(input, 'http://127.0.0.1:4173')).toEqual({ ok: false, code });
  });

  it.each([
    ['https://evil.test/v1/clock/#v=1', 'foreign-origin'],
    ['https://obs-clock-widget.pages.dev/editor/#v=1', 'wrong-route'],
    ['ftp://obs-clock-widget.pages.dev/v1/clock/#v=1', 'invalid-protocol'],
    ['https://user:secret@obs-clock-widget.pages.dev/v1/clock/#v=1', 'credentials'],
    ['https://obs-clock-widget.pages.dev/v1/clock/?v=1#v=1', 'query-config'],
    ['https://obs-clock-widget.pages.dev/v1/clock/', 'fragment-required'],
    ['//evil.test/v1/clock/#v=1', 'raw-fragment-only'],
    ['/v1/clock/#v=1', 'raw-fragment-only'],
    ['v=1?tz=UTC', 'raw-fragment-only'],
    ['v=1#tz=UTC', 'raw-fragment-only'],
  ] as const)('rejects an unsafe URL or non-payload raw value: %s', (input, code) => {
    expect(parseConfigImport(input, 'http://127.0.0.1:4173')).toEqual({ ok: false, code });
  });
});
