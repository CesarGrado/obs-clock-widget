const TOKENS = ['YYYY','MMMM','dddd','MMM','ddd','YY','HH','hh','mm','ss','M','D','H','h','m','s','a'] as const;
const tokenSet = new Set<string>(TOKENS);

function lex(format: string): { value: string; token: boolean }[] | string {
  if (!format || format.length > 64) return 'Format must be 1–64 characters.';
  const result: { value: string; token: boolean }[] = [];
  for (let i = 0; i < format.length;) {
    if (format[i] === "'") { const end = format.indexOf("'", i + 1); if (end < 0) return 'Unterminated literal.'; result.push({ value: format.slice(i + 1, end), token: false }); i = end + 1; continue; }
    const token = TOKENS.find((candidate) => format.startsWith(candidate, i));
    if (token) { result.push({ value: token, token: true }); i += token.length; continue; }
    const char = format[i]!; if (/[A-Za-z]/.test(char)) return `Unsupported token near “${char}”.`;
    result.push({ value: char, token: false }); i += 1;
  }
  return result;
}

export function validateFormat(format: string): string | null { const result = lex(format); return typeof result === 'string' ? result : null; }

export function formatClock(date: Date, format: string, timezone: string, locale: string): string {
  const parsed = lex(format); if (typeof parsed === 'string') throw new Error(parsed);
  const lang = locale === 'auto' ? undefined : locale; const timeZone = timezone === 'local' ? undefined : timezone;
  const parts = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const getNumber = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? '');
  const localizedNumber = (value: number, minimumIntegerDigits = 1) => formatLocalizedNumber(value, lang, minimumIntegerDigits);
  const name = (month: 'long' | 'short' | undefined, weekday: 'long' | 'short' | undefined) => new Intl.DateTimeFormat(lang, { timeZone, calendar: 'gregory', month, weekday }).format(date);
  const year = getNumber('year'); const month = getNumber('month'); const day = getNumber('day');
  const h24 = getNumber('hour'); const hour12 = h24 % 12 || 12; const minute = getNumber('minute'); const second = getNumber('second');
  const values: Record<string, string> = {
    YYYY: localizedNumber(year, 4), YY: localizedNumber(year % 100, 2), MMMM: name('long', undefined), MMM: name('short', undefined), M: localizedNumber(month),
    D: localizedNumber(day), dddd: name(undefined, 'long'), ddd: name(undefined, 'short'), HH: localizedNumber(h24, 2), H: localizedNumber(h24),
    hh: localizedNumber(hour12, 2), h: localizedNumber(hour12), mm: localizedNumber(minute, 2), m: localizedNumber(minute), ss: localizedNumber(second, 2), s: localizedNumber(second),
    a: new Intl.DateTimeFormat(lang, { timeZone, calendar: 'gregory', hour: 'numeric', hour12: true }).formatToParts(date).find((part) => part.type === 'dayPeriod')?.value ?? (h24 < 12 ? 'AM' : 'PM'),
  };
  return parsed.map((part) => part.token && tokenSet.has(part.value) ? values[part.value] : part.value).join('');
}

export const formatHasSeconds = (format: string): boolean => { const parsed = lex(format); return Array.isArray(parsed) && parsed.some((part) => part.token && (part.value === 's' || part.value === 'ss')); };

export const formatLocalizedNumber = (value: number, locale?: string, minimumIntegerDigits = 1): string => new Intl.NumberFormat(locale, {
  useGrouping: false,
  minimumIntegerDigits,
  maximumFractionDigits: 0,
}).format(value);
