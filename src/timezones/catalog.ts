import { GENERATED_TIMEZONE_IDS } from './generated';

export const TIMEZONE_IDS = ['local', 'UTC', ...GENERATED_TIMEZONE_IDS] as const;
export type TimezoneId = typeof TIMEZONE_IDS[number];
export type TimezoneDescription = { id: TimezoneId; label: string; offset: string; display: string };

const timezoneSet: ReadonlySet<string> = new Set(TIMEZONE_IDS);
const words = (value: string) => value.replace(/_/g, ' ').replace(/\//g, ' / ');

export function isCatalogTimezone(value: unknown): value is TimezoneId {
  return typeof value === 'string' && timezoneSet.has(value);
}

export function isTimezoneSupported(timezone: string): boolean {
  if (timezone === 'local') return true;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

function offsetMinutes(timezone: TimezoneId, date: Date): number {
  if (timezone === 'local') return -date.getTimezoneOffset();
  if (timezone === 'UTC') return 0;
  const parts = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const number = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const representedAsUtc = Date.UTC(number('year'), number('month') - 1, number('day'), number('hour'), number('minute'), number('second'));
  return Math.round((representedAsUtc - date.getTime()) / 60_000);
}

function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+';
  const absolute = Math.abs(minutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const remainder = String(absolute % 60).padStart(2, '0');
  return minutes === 0 ? 'UTC+00:00' : `UTC${sign}${hours}:${remainder}`;
}

export function describeTimezone(id: TimezoneId, date = new Date()): TimezoneDescription {
  const label = id === 'local' ? 'Local time' : id === 'UTC' ? 'Coordinated Universal Time' : words(id.split('/').slice(-1)[0] ?? id);
  const offset = formatOffset(offsetMinutes(id, date));
  return { id, label, offset, display: `${label} — ${id === 'local' ? 'Local' : id} (${offset})` };
}

export function searchTimezones(query: string, date = new Date(), limit = 50): TimezoneDescription[] {
  const normalizeSearch = (value: string) => value.toLocaleLowerCase().replace(/−/g, '-');
  const terms = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  const matches: TimezoneDescription[] = [];
  for (const id of TIMEZONE_IDS) {
    if (!isTimezoneSupported(id)) continue;
    const description = describeTimezone(id, date);
    const searchable = normalizeSearch(`${description.label} ${words(id)} ${description.offset}`);
    if (terms.every((term) => searchable.includes(term))) matches.push(description);
    if (matches.length >= limit) break;
  }
  return matches;
}
