import { beforeEach, describe, expect, it, vi } from 'vitest';
import { copyText } from '../../src/editor/clipboard';

beforeEach(() => {
  document.body.innerHTML = '<main id="app"></main>';
});

describe('clipboard copying', () => {
  it('falls back to the legacy copy command when the async clipboard rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
    Object.assign(navigator, { clipboard: { writeText } });
    const execCommand = vi.fn((command: string) => {
      expect(command).toBe('copy');
      const selected = document.activeElement as HTMLTextAreaElement;
      expect(selected.tagName).toBe('TEXTAREA');
      expect(selected.value).toBe('OBS Browser Source\nURL: https://timer.puxxlr.com/v1/clock/#v=1');
      return true;
    });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });

    await expect(copyText('OBS Browser Source\nURL: https://timer.puxxlr.com/v1/clock/#v=1')).resolves.toBe(true);

    expect(writeText).toHaveBeenCalledOnce();
    expect(execCommand).toHaveBeenCalledOnce();
    expect(document.querySelector('textarea')).toBeNull();
  });
});
