import { afterEach, describe, expect, it, vi } from 'vitest';
import { alignedDelay, startClock } from '../../src/time/scheduler';
afterEach(() => vi.useRealTimers());
describe('drift-free scheduler', () => {
  it('aligns seconds and minutes', () => { expect(alignedDelay(1250, true)).toBe(750); expect(alignedDelay(1250, false)).toBe(58750); });
  it('maintains one timer and cleans it up', () => {
    vi.useFakeTimers(); vi.setSystemTime(1250); const tick = vi.fn(); const stop = startClock(tick, true);
    expect(tick).toHaveBeenCalledTimes(1); vi.advanceTimersByTime(750); expect(tick).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(1); stop(); expect(vi.getTimerCount()).toBe(0);
  });
});
