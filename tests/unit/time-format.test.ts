import { describe, expect, it, vi } from 'vitest';
import { LOCALES } from '../../src/config/defaults';
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
  it('preserves Arabic-Indic digits without producing NaN', () => {
    const time = formatClock(instant, 'HH:mm:ss', 'UTC', 'ar-EG');
    const date = formatClock(instant, 'dddd, MMMM D, YYYY', 'UTC', 'ar-EG');
    expect(time).toBe('١٧:٠٥:٠٩');
    expect(date).toBe('الخميس, فبراير ٢٩, ٢٠٢٤');
    expect(`${time} ${date}`).not.toContain('NaN');
  });
  it('keeps representative Latin locale behavior', () => {
    expect(formatClock(instant, 'D/M/YYYY HH:mm', 'UTC', 'en-GB')).toBe('29/2/2024 17:05');
  });
  it('produces valid numeric output for every allowlisted locale', () => {
    for (const locale of LOCALES) {
      expect(formatClock(instant, 'YYYY M D HH H hh h mm m ss s', 'UTC', locale)).not.toContain('NaN');
    }
  });
  it('reuses Intl formatters for repeated geometry samples', () => {
    const NativeDateTimeFormat = Intl.DateTimeFormat;
    const NativeNumberFormat = Intl.NumberFormat;
    const dateTime = vi.fn((locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) => new NativeDateTimeFormat(locales, options));
    const number = vi.fn((locales?: Intl.LocalesArgument, options?: Intl.NumberFormatOptions) => new NativeNumberFormat(locales, options));
    Object.defineProperty(Intl, 'DateTimeFormat', { configurable: true, value: dateTime });
    Object.defineProperty(Intl, 'NumberFormat', { configurable: true, value: number });
    try {
      formatClock(instant, 'HH:mm:ss', 'Pacific/Kiritimati', 'en-US-u-nu-fullwide');
      const afterFirst = { dateTime: dateTime.mock.calls.length, number: number.mock.calls.length };
      formatClock(new Date(instant.getTime() + 1_000), 'HH:mm:ss', 'Pacific/Kiritimati', 'en-US-u-nu-fullwide');
      expect({ dateTime: dateTime.mock.calls.length, number: number.mock.calls.length }).toEqual(afterFirst);
    } finally {
      Object.defineProperty(Intl, 'DateTimeFormat', { configurable: true, value: NativeDateTimeFormat });
      Object.defineProperty(Intl, 'NumberFormat', { configurable: true, value: NativeNumberFormat });
    }
  });
  it('rejects unsupported tokens and unterminated literals', () => {
    expect(validateFormat('HH:mm X')).toMatch(/Unsupported/);
    expect(validateFormat("HH:mm 'oops")).toMatch(/literal/);
  });
});
