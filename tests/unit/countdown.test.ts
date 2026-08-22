import { describe, expect, it } from 'vitest';
import { countdownDisplay, isAbsoluteIsoTarget } from '../../src/time/countdown';

describe('event countdown', () => {
  it.each([
    '2026-08-23T18:30Z',
    '2026-08-23T18:30:45Z',
    '2026-08-23T18:30:45.123-04:00',
  ])('accepts an ISO instant with an explicit offset: %s', (target) => expect(isAbsoluteIsoTarget(target)).toBe(true));

  it.each([
    '2026-08-23T18:30',
    'tomorrow',
    '2026-02-30T18:30Z',
    '2026-08-23T25:30Z',
    '2026-08-23T18:30+24:00',
  ])('rejects malformed or naive targets: %s', (target) => expect(isAbsoluteIsoTarget(target)).toBe(false));

  it('formats durations longer than a day without rolling hours past 23', () => {
    const now = new Date('2026-08-20T13:15:51Z');
    expect(countdownDisplay('2026-08-22T18:30:00Z', now, false, 'en-US')).toEqual({ kind: 'countdown', text: '2d 05:14:09' });
  });

  it('clamps renderer output beyond 99 days', () => {
    expect(countdownDisplay('2027-08-22T00:00:00Z', new Date('2026-08-22T00:00:00Z'), false, 'en-US')).toEqual({ kind: 'countdown', text: '99d+' });
  });

  it('holds zero for exactly five seconds then resumes the clock', () => {
    const target = '2026-08-22T10:00:00Z';
    expect(countdownDisplay(target, new Date('2026-08-22T10:00:04.999Z'), false, 'en-US')).toEqual({ kind: 'hold', text: '00:00:00' });
    expect(countdownDisplay(target, new Date('2026-08-22T10:00:05.000Z'), false, 'en-US')).toEqual({ kind: 'clock' });
  });

  it('counts up after zero only when overtime is enabled', () => {
    expect(countdownDisplay('2026-08-22T10:00:00Z', new Date('2026-08-22T10:00:06Z'), true, 'en-US')).toEqual({ kind: 'overtime', text: '+00:00:06' });
  });
});
