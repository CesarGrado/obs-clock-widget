import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/config/defaults';
import { decodeConfig } from '../../src/config/codec';
import { renderClock } from '../../src/clock/renderer';

describe('safe clock renderer', () => {
  it('renders fixed text nodes and independently styled lines', () => {
    const root = document.createElement('div'); const controller = renderClock(root, DEFAULT_CONFIG, () => new Date('2024-02-29T17:05:09Z'));
    expect(root.querySelectorAll('.clock-line')).toHaveLength(2);
    expect(root.textContent).toContain('17:05:09'); expect(root.querySelector('script')).toBeNull();
    expect((root.querySelector('.clock-line') as HTMLElement).style.fontSize).toBe('72px'); controller.stop();
  });
  it('renders nothing when both lines are disabled', () => {
    const root = document.createElement('div'); const config = { ...DEFAULT_CONFIG, lines: [
      { ...DEFAULT_CONFIG.lines[0], enabled: false },
      { ...DEFAULT_CONFIG.lines[1], enabled: false },
    ] as typeof DEFAULT_CONFIG.lines };
    const controller = renderClock(root, config); expect(root.textContent).toBe(''); controller.stop();
  });
  it('renders countdown on line one and keeps line two as the configured event label', () => {
    const root = document.createElement('div');
    const config = { ...DEFAULT_CONFIG, mode: 'countdown' as const, countdownTarget: '2026-08-24T18:30:00Z', lines: [
      { ...DEFAULT_CONFIG.lines[0] },
      { ...DEFAULT_CONFIG.lines[1], format: "'Stream starts soon'" },
    ] as typeof DEFAULT_CONFIG.lines };
    const controller = renderClock(root, config, () => new Date('2026-08-22T13:15:51Z'));
    expect(root.querySelectorAll('.clock-line')[0]?.textContent).toBe('2d 05:14:09');
    expect(root.querySelectorAll('.clock-line')[1]?.textContent).toBe('Stream starts soon');
    controller.stop();
  });
  it('falls back to the normal line-one clock after the five-second zero hold', () => {
    const root = document.createElement('div');
    const config = { ...DEFAULT_CONFIG, mode: 'countdown' as const, countdownTarget: '2026-08-22T10:00:00Z' };
    let instant = new Date('2026-08-22T10:00:04.999Z');
    const controller = renderClock(root, config, () => instant);
    expect(root.querySelector('.clock-line')?.textContent).toBe('00:00:00');
    instant = new Date('2026-08-22T10:00:05.000Z'); controller.update();
    expect(root.querySelector('.clock-line')?.textContent).toBe('10:00:05');
    controller.stop();
  });
  it('preserves the frozen legacy v1 DOM fixture when countdown keys are absent', () => {
    const root = document.createElement('div');
    const config = decodeConfig('v=1&tz=UTC&f1=HH%3Amm%3Ass&e2=0');
    const controller = renderClock(root, config, () => new Date('2026-08-22T13:15:51Z'));
    expect(root.textContent).toBe('13:15:51');
    expect(root.querySelectorAll('.clock-line')).toHaveLength(1);
    expect(root.querySelector('.clock-line')?.getAttribute('style')).toBe('font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 72px; font-weight: 700; color: rgb(255, 255, 255); opacity: 1; text-transform: none; -webkit-text-stroke: 0px; text-shadow: 0 1px 2px rgba(0,0,0,.85);');
    controller.stop();
  });
  it('fails safely when the runtime Intl data does not support a catalog timezone', () => {
    const Original = Intl.DateTimeFormat;
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(((locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) => {
      if (options?.timeZone === 'Pacific/Chatham') throw new RangeError('host detail must not leak');
      return new Original(locales, options);
    }) as typeof Intl.DateTimeFormat);
    const root = document.createElement('div');
    expect(() => renderClock(root, { ...DEFAULT_CONFIG, timezone: 'Pacific/Chatham' })).not.toThrow();
    expect(root.querySelector('[role="alert"]')?.textContent).toBe('Timezone unavailable in this browser.');
    expect(root.textContent).not.toContain('host detail');
    vi.restoreAllMocks();
  });
});
