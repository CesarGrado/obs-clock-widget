export const resolveTimezoneOffsetMs = (instant: Date, timeZone: string): number => {
  // Offset (ms to add to a local wall-clock time in `timeZone` to get UTC) via the z/ZZ hour-minute pattern.
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? '0');
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return asUtc - instant.getTime();
};

export type WallTime = { year: number; month: number; day: number; hour: number; minute: number };

/**
 * Convert a selected wall time in `timeZone` (undefined = device timezone) to an absolute
 * UTC instant. Enumerates plausible offsets around the wall time, keeps instants that
 * round-trip to the exact selected wall time, and picks the EARLIEST — the explicit
 * "first occurrence" policy for DST fall-back overlaps. Zero candidates means the wall
 * time does not exist (DST gap) and the result is null.
 */
export function wallTimeToInstant(wall: WallTime, timeZone?: string): Date | null {
  const candidate = new Date(Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute));
  const offsetFor = (instant: Date) => timeZone ? resolveTimezoneOffsetMs(instant, timeZone) : -instant.getTimezoneOffset() * 60_000;
  const backFmt = new Intl.DateTimeFormat('en-US', { ...(timeZone ? { timeZone } : {}), hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const roundTrips = (instant: Date) => {
    const parts = backFmt.formatToParts(instant); const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? '0');
    return get('year') === wall.year && get('month') === wall.month && get('day') === wall.day && get('hour') % 24 === wall.hour && get('minute') === wall.minute;
  };
  const probes = [candidate.getTime() - 15 * 3_600_000, candidate.getTime(), candidate.getTime() + 15 * 3_600_000].map((ms) => offsetFor(new Date(ms)));
  const instants = [...new Set(probes)].map((offset) => new Date(candidate.getTime() - offset)).filter(roundTrips);
  if (instants.length === 0) return null;
  return new Date(Math.min(...instants.map((instant) => instant.getTime())));
}

/** Format an absolute instant as date (YYYY-MM-DD) and time (HH:mm) in `timeZone` (undefined = device). */
export function instantToWallFields(instant: Date, timeZone?: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', { ...(timeZone ? { timeZone } : {}), year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(instant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour') === '24' ? '00' : get('hour')}:${get('minute')}` };
}

/** Human timezone label, e.g. "America/New_York (EDT)" or the offset string. */
export function timezoneLabel(timeZone?: string): string {
  const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offsetLabel = new Intl.DateTimeFormat('en-US', { ...(timeZone ? { timeZone } : {}), timeZoneName: 'short' }).format(new Date()).split(', ').pop();
  return offsetLabel ? `${zone} (${offsetLabel})` : zone;
}
