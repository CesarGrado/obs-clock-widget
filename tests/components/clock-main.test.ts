import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '<main id="clock-root"></main>';
  history.replaceState(null, '', '/v1/clock/#v=2&f1=HH:mm');
});

describe('standalone clock runtime', () => {
  it('shows a non-sensitive explicit error for unsupported configuration majors', async () => {
    await import('../../src/clock/main');
    const root = document.querySelector('#clock-root')!;
    expect(root.querySelector('[role="alert"]')?.textContent).toBe('Unsupported clock configuration version. Recreate this widget URL in the clock editor.');
    expect(root.querySelectorAll('.clock-line')).toHaveLength(0);
    expect(root.textContent).not.toContain('HH:mm');
  });
});
