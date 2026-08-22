import { formatLocalizedNumber } from './format';

const ABSOLUTE_ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|([+-])(\d{2}):(\d{2}))$/;
const DAY_MS = 86_400_000;
const HOLD_MS = 5_000;

export type CountdownDisplay = { kind: 'countdown' | 'hold' | 'overtime'; text: string } | { kind: 'clock' };

export function isAbsoluteIsoTarget(value: string): boolean {
  const match = ABSOLUTE_ISO.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second = '0', fraction = '0', zone, sign, offsetHour = '0', offsetMinute = '0'] = match;
  const offsetHours = Number(offsetHour); const offsetMinutes = Number(offsetMinute);
  if (offsetHours > 23 || offsetMinutes > 59) return false;
  const milliseconds = Number(fraction.padEnd(3, '0'));
  let expected = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second), milliseconds);
  if (zone !== 'Z') expected += (sign === '+' ? -1 : 1) * (offsetHours * 60 + offsetMinutes) * 60_000;
  const numericYear = Number(year); const numericMonth = Number(month); const numericDay = Number(day);
  const daysInMonth = new Date(Date.UTC(numericYear, numericMonth, 0)).getUTCDate();
  return Number.isFinite(expected) && Date.parse(value) === expected
    && numericMonth >= 1 && numericMonth <= 12 && numericDay >= 1 && numericDay <= daysInMonth
    && Number(hour) <= 23 && Number(minute) <= 59 && Number(second) <= 59;
}

function durationText(milliseconds: number, locale: string, prefix = ''): string {
  const totalSeconds = Math.floor(milliseconds / 1_000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor(totalSeconds % 86_400 / 3_600);
  const minutes = Math.floor(totalSeconds % 3_600 / 60);
  const seconds = totalSeconds % 60;
  const lang = locale === 'auto' ? undefined : locale;
  const number = (value: number, digits = 2) => formatLocalizedNumber(value, lang, digits);
  const clock = `${number(hours)}:${number(minutes)}:${number(seconds)}`;
  return `${prefix}${days ? `${number(days, 1)}d ` : ''}${clock}`;
}

export function countdownDisplay(target: string, now: Date, overtime: boolean, locale: string): CountdownDisplay {
  if (!isAbsoluteIsoTarget(target)) return { kind: 'clock' };
  const remaining = Date.parse(target) - now.getTime();
  if (remaining > 99 * DAY_MS) return { kind: 'countdown', text: '99d+' };
  if (remaining > 0) return { kind: 'countdown', text: durationText(remaining, locale) };
  const elapsed = -remaining;
  if (elapsed < HOLD_MS) return { kind: 'hold', text: '00:00:00' };
  if (overtime) return { kind: 'overtime', text: durationText(elapsed, locale, '+') };
  return { kind: 'clock' };
}