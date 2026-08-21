import { describe, expect, it } from 'vitest';
import { encodeConfig } from '../../src/config/codec';
import { parseConfigImport } from '../../src/config/import';
import { PRESETS } from '../../src/config/presets';

describe('strict config import', () => {
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
