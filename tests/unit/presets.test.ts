import { describe, expect, it } from 'vitest';
import { PRESETS } from '../../src/config/presets';

describe('clock presets', () => {
  it('defines the revised Minimal preset exactly for a stable single-line clock', () => {
    expect(PRESETS.Minimal).toEqual({
      version: 1,
      mode: 'clock',
      countdownTarget: '',
      overtime: false,
      timezone: 'local',
      locale: 'auto',
      align: 'center',
      gap: 0,
      stroke: 0,
      shadow: 4,
      lines: [
        {
          enabled: true,
          format: 'HH:mm',
          font: 'mono',
          size: 88,
          weight: 600,
          color: '#FFFFFF',
          opacity: 1,
          transform: 'none',
        },
        {
          enabled: false,
          format: 'dddd, MMMM D',
          font: 'system',
          size: 30,
          weight: 500,
          color: '#FFFFFF',
          opacity: 0.9,
          transform: 'none',
        },
      ],
    });
  });

  it('defines the Gameplay preset exactly for high-contrast moving backgrounds', () => {
    expect(PRESETS.Gameplay).toEqual({
      version: 1,
      mode: 'clock',
      countdownTarget: '',
      overtime: false,
      timezone: 'local',
      locale: 'auto',
      align: 'center',
      gap: 6,
      stroke: 4,
      shadow: 0,
      lines: [
        {
          enabled: true,
          format: 'HH:mm:ss',
          font: 'system',
          size: 80,
          weight: 700,
          color: '#FFFFFF',
          opacity: 1,
          transform: 'none',
        },
        {
          enabled: true,
          format: 'ddd, MMM D',
          font: 'system',
          size: 28,
          weight: 700,
          color: '#FFD54A',
          opacity: 1,
          transform: 'uppercase',
        },
      ],
    });
  });
});

describe('stream start preset', () => {
  it('showcases handwritten library fonts with valid weights', () => {
    const preset = PRESETS['Stream Start']!;
    expect(preset.lines[0]).toMatchObject({ font: 'permanent-marker', weight: 400 });
    expect(preset.lines[1]).toMatchObject({ font: 'caveat', weight: 600 });
    expect(preset.lines[0]!.format).toContain('stream starts soon');
  });
});
