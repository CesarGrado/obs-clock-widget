import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/config/defaults';
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
});
