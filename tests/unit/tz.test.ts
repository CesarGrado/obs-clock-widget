import { describe, expect, it } from 'vitest';
import { wallTimeToInstant, instantToWallFields, timezoneLabel } from '../../src/editor/tz';

describe('wallTimeToInstant (explicit timezones)', () => {
  it('rejects the New York spring-forward gap', () => {
    expect(wallTimeToInstant({ year: 2026, month: 3, day: 8, hour: 2, minute: 30 }, 'America/New_York')).toBeNull();
  });
  it('resolves the New York fall-back overlap to the first occurrence', () => {
    expect(wallTimeToInstant({ year: 2026, month: 11, day: 1, hour: 1, minute: 30 }, 'America/New_York')?.toISOString().slice(0, 16)).toBe('2026-11-01T05:30');
  });
  it('resolves transition-adjacent times with the post-transition offset', () => {
    expect(wallTimeToInstant({ year: 2026, month: 11, day: 1, hour: 2, minute: 30 }, 'America/New_York')?.toISOString().slice(0, 16)).toBe('2026-11-01T07:30');
  });
  it('rejects the Pacific/Chatham gap and honors the fractional offset', () => {
    expect(wallTimeToInstant({ year: 2026, month: 9, day: 27, hour: 2, minute: 45 }, 'Pacific/Chatham')).toBeNull();
    // Normal time: 2026-04-05 03:00 Chatham (+13:45 still, first occurrence) → 2026-04-04T13:15Z.
    expect(wallTimeToInstant({ year: 2026, month: 4, day: 5, hour: 3, minute: 0 }, 'Pacific/Chatham')?.toISOString().slice(0, 16)).toBe('2026-04-04T13:15');
  });
  it('round-trips instants back to wall fields', () => {
    const instant = new Date('2026-08-25T18:30:00Z');
    const ny = instantToWallFields(instant, 'America/New_York');
    expect(ny).toEqual({ date: '2026-08-25', time: '14:30' });
  });
  it('labels timezones with a short name', () => {
    expect(timezoneLabel('America/New_York')).toMatch(/America\/New_York \(/);
  });
});
