import { describe, expect, it } from 'vitest';
import { clockClippingIssues, clockPaintMargins, clockTextCandidates, textInkHorizontalBounds } from '../../src/geometry/clock-clipping';
import { cloneClockConfig } from '../../src/config/clone';
import { DEFAULT_CONFIG } from '../../src/config/defaults';

const rect = (left: number, top: number, right: number, bottom: number): DOMRect => ({
  left, top, right, bottom, width: right - left, height: bottom - top, x: left, y: top, toJSON: () => ({}),
});

describe('clock clipping', () => {
  it('uses glyph ink side-bearings, alignment, and half the stroke width', () => {
    const bounds = { left: 0, top: 10, right: 200, bottom: 50 };
    const metrics = { width: 100, actualBoundingBoxLeft: 2, actualBoundingBoxRight: 96 };
    expect(textInkHorizontalBounds(bounds, metrics, 'left')).toEqual({ ...bounds, left: -2, right: 96 });
    expect(textInkHorizontalBounds(bounds, metrics, 'center')).toEqual({ ...bounds, left: 48, right: 146 });
    expect(textInkHorizontalBounds(bounds, metrics, 'right')).toEqual({ ...bounds, left: 98, right: 196 });
    expect(clockPaintMargins(1, 0)).toEqual({ left: 0.5, top: 0.5, right: 0.5, bottom: 0.5 });
    expect(clockPaintMargins(2, 6)).toEqual({ left: 7, top: 5, right: 7, bottom: 9 });
  });

  it('retains conservative DOM bounds when ink metrics are unavailable', () => {
    const bounds = { left: 0, top: 10, right: 200, bottom: 50 };
    expect(textInkHorizontalBounds(bounds, { width: 100 }, 'right')).toBe(bounds);
  });

  it('identifies the offending enabled line and includes stroke/shadow paint', () => {
    const root = document.createElement('div');
    root.getBoundingClientRect = () => rect(100, 50, 900, 290);
    for (let index = 0; index < 2; index += 1) {
      const line = document.createElement('div');
      line.className = 'clock-line';
      line.getBoundingClientRect = () => index === 0 ? rect(108, 58, 892, 282) : rect(300, 150, 400, 200);
      root.append(line);
    }
    const config = cloneClockConfig(DEFAULT_CONFIG);
    config.stroke = 8;
    config.shadow = 30;

    expect(clockClippingIssues(root, config, { width: 800, height: 240 })).toEqual([
      expect.objectContaining({ elementId: 'clock-line-1', label: 'Line 1' }),
    ]);
  });

  it('samples localized calendar changes and countdown lifecycle extremes', () => {
    const config = cloneClockConfig(DEFAULT_CONFIG);
    config.locale = 'en-US'; config.timezone = 'UTC'; config.lines[1].format = 'dddd, MMMM D, YYYY';
    const dates = clockTextCandidates(config, 1);
    expect(dates).toContain('Friday, September 1, 2028');
    expect(dates.some((text) => text.includes('Wednesday, November'))).toBe(true);
    config.lines[0].format = 'HH:mm:ss';
    expect(clockTextCandidates(config, 0)).toContain('00:00:00');

    config.mode = 'countdown'; config.countdownTarget = '2028-12-31T23:59:59Z'; config.overtime = true; config.lines[0].format = `'${'A'.repeat(62)}'`;
    const countdowns = clockTextCandidates(config, 0);
    expect(countdowns.some((text) => text.includes('A'))).toBe(false);
    expect(countdowns).toContain('99d+');
    expect(countdowns).toContain('99d 00:00:00');
    expect(countdowns).toContain('98d 23:59:59');
    expect(countdowns).toContain('+99d 00:00:00');
    expect(countdowns).toContain('00:00:00');
  });
});
