import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/config/defaults';
import { decodeConfig, encodeConfig, widgetUrl } from '../../src/config/codec';
import { PRESETS } from '../../src/config/presets';

describe('fragment codec', () => {
  it('omits defaults and is deterministic', () => expect(encodeConfig(DEFAULT_CONFIG)).toBe('v=1'));
  it('round trips every preset canonically', () => Object.values(PRESETS).forEach((preset) => expect(decodeConfig(encodeConfig(preset))).toEqual(preset)));
  it.each(['v=1&v=1', 'v=2', '__proto__=x', 'v=1&x=y', 'v=1&e1=2', 'v=1&s1=0x40', '%E0%A4%A', `v=1&f1=${'x'.repeat(2100)}`])('fails safely for malformed fragment %s', (fragment) => expect(decodeConfig(fragment)).toEqual(DEFAULT_CONFIG));
  it('round trips a global canonical timezone and stores only its canonical ID', () => {
    const config = { ...DEFAULT_CONFIG, timezone: 'Pacific/Chatham' as const };
    expect(encodeConfig(config)).toBe('v=1&tz=Pacific%2FChatham');
    expect(decodeConfig(encodeConfig(config))).toEqual(config);
  });
  it('keeps existing timezone URLs unchanged and backward compatible', () => {
    expect(encodeConfig(decodeConfig('v=1&tz=America%2FNew_York'))).toBe('v=1&tz=America%2FNew_York');
  });
  it.each(['v=1&tz=US%2FEastern', 'v=1&tz=Not%2FA_Zone', 'v=1&tz=..%2Fetc%2Fpasswd'])('fails closed for non-canonical timezone fragment %s', (fragment) => expect(decodeConfig(fragment)).toEqual(DEFAULT_CONFIG));
  it('builds a permanent runtime URL', () => expect(widgetUrl(DEFAULT_CONFIG, 'https://clock.test')).toBe('https://clock.test/v1/clock/#v=1'));
  it('round trips countdown mode with overtime defaulting off', () => {
    const config = { ...DEFAULT_CONFIG, mode: 'countdown' as const, countdownTarget: '2026-08-23T18:30:00-04:00' };
    expect(encodeConfig(config)).toBe('v=1&m=countdown&ct=2026-08-23T18%3A30%3A00-04%3A00');
    expect(decodeConfig(encodeConfig(config))).toEqual(config);
  });
  it.each([
    'v=1&m=countdown&ct=2026-08-23T18%3A30',
    'v=1&m=countdown&ct=tomorrow',
    'v=1&m=countdown&ct=2026-08-23T18%3A30Z&ct=2026-08-24T18%3A30Z',
    'v=1&m=countdown&ct=2026-08-23T18%3A30Z&ot=2',
  ])('fails safely for invalid countdown fragment %s', (fragment) => expect(decodeConfig(fragment)).toEqual(DEFAULT_CONFIG));
  it('keeps the legacy canonical fragment byte-identical', () => expect(encodeConfig(decodeConfig('v=1&tz=America%2FNew_York&f1=hh%3Amm%3Ass+a'))).toBe('v=1&tz=America%2FNew_York&f1=hh%3Amm%3Ass+a'));
  it('never throws for arbitrary payloads', () => fc.assert(fc.property(fc.string(), (payload) => { expect(() => decodeConfig(payload)).not.toThrow(); }), { numRuns: 200 }));
});
