import { describe, expect, it } from 'vitest';
import { formatClock, validateFormat } from '../../src/time/format';

const instant = new Date('2024-02-29T17:05:09.000Z');
describe('clock token formatter', () => {
  it('formats 12/24-hour, date, and literals', () => {
    expect(formatClock(instant, "HH:mm:ss", 'UTC', 'en-US')).toBe('17:05:09');
    expect(formatClock(instant, "h:mm a", 'UTC', 'en-US')).toBe('5:05 PM');
    expect(formatClock(instant, "dddd, MMMM D, YYYY", 'UTC', 'en-US')).toBe('Thursday, February 29, 2024');
    expect(formatClock(instant, "HH:mm 'UTC'", 'UTC', 'en-US')).toBe('17:05 UTC');
  });
  it('supports timezone conversion', () => expect(formatClock(instant, 'HH:mm', 'Asia/Kathmandu', 'en-US')).toBe('22:50'));
  it('rejects unsupported tokens and unterminated literals', () => {
    expect(validateFormat('HH:mm X')).toMatch(/Unsupported/);
    expect(validateFormat("HH:mm 'oops")).toMatch(/literal/);
  });
});
