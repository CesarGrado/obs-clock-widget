import { describe, expect, it } from 'vitest';
import { PRESETS } from '../../src/config/presets';

describe('clock presets', () => {
  it('defines the Gameplay preset exactly for high-contrast moving backgrounds', () => {
    expect(PRESETS.Gameplay).toEqual({
      version: 1,
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
