import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/config/defaults';
import {
  TIMEZONE_IDS,
  describeTimezone,
  isCatalogTimezone,
  isTimezoneSupported,
  searchTimezones,
} from '../../src/timezones/catalog';

describe('canonical timezone catalog', () => {
  it('keeps Local and UTC first and contains representative global canonical zones', () => {
    expect(TIMEZONE_IDS.slice(0, 2)).toEqual(['local', 'UTC']);
    expect(TIMEZONE_IDS.length).toBeGreaterThan(400);
    expect(TIMEZONE_IDS).toEqual(expect.arrayContaining([
      'America/New_York',
      'Europe/London',
      'Asia/Kathmandu',
      'Australia/Lord_Howe',
      'Pacific/Chatham',
    ]));
  });

  it('fails closed for malformed, linked, and arbitrary timezone strings', () => {
    expect(isCatalogTimezone('America/New_York')).toBe(true);
    expect(isCatalogTimezone('US/Eastern')).toBe(false);
    expect(isCatalogTimezone('../etc/passwd')).toBe(false);
    expect(isCatalogTimezone('javascript:alert(1)')).toBe(false);
    expect(isCatalogTimezone('')).toBe(false);
  });

  it('searches friendly labels, canonical IDs, and keyboard-style negative UTC offsets', () => {
    const winter = new Date('2024-01-15T12:00:00Z');
    expect(searchTimezones('new york', winter)[0]?.id).toBe('America/New_York');
    expect(searchTimezones('kathmandu', winter).some((zone) => zone.id === 'Asia/Kathmandu')).toBe(true);
    expect(searchTimezones('UTC-05:00', winter).some((zone) => zone.id === 'America/New_York')).toBe(true);
    expect(searchTimezones('UTC-03:30', winter).some((zone) => zone.id === 'America/St_Johns')).toBe(true);
  });

  it('shows calculated DST and fractional current UTC offsets without modern Intl offset APIs', () => {
    expect(describeTimezone('Asia/Kathmandu', new Date('2024-01-15T12:00:00Z')).offset).toBe('UTC+05:45');
    expect(describeTimezone('America/New_York', new Date('2024-01-15T12:00:00Z')).offset).toBe('UTC−05:00');
    expect(describeTimezone('America/New_York', new Date('2024-07-15T12:00:00Z')).offset).toBe('UTC−04:00');
    expect(describeTimezone('Australia/Lord_Howe', new Date('2024-07-15T12:00:00Z')).offset).toBe('UTC+10:30');
  });

  it('checks actual Intl support independently from catalog membership', () => {
    expect(isTimezoneSupported('local')).toBe(true);
    expect(isTimezoneSupported('UTC')).toBe(true);
    expect(isTimezoneSupported('Not/A_Zone')).toBe(false);
  });

  it('allows a catalog timezone through the strict schema while retaining defaults', () => {
    expect({ ...DEFAULT_CONFIG, timezone: 'Pacific/Chatham' }.timezone).toBe('Pacific/Chatham');
  });
});
