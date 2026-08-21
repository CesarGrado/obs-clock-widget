import { describe, expect, it } from 'vitest';
import { decodeConfig } from '../../src/config/codec';
import { DEFAULT_CONFIG } from '../../src/config/defaults';
import { renderClock } from '../../src/clock/renderer';

const payloads = ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', 'url(https://evil.test)', '@import', 'expression(alert(1))', 'javascript:', 'data:text/html,x', '\u202Eevil'];
describe('injection boundary', () => {
  it.each(payloads)('does not pass payload into DOM or styles: %s', (payload) => {
    const config = decodeConfig(`v=1&f1=${encodeURIComponent(payload)}&c1=${encodeURIComponent(payload)}`);
    const root = document.createElement('div'); const controller = renderClock(root, config, () => new Date(0));
    expect(root.innerHTML).not.toContain(payload); expect(root.querySelectorAll('*')).toHaveLength(3); expect(config).toEqual(DEFAULT_CONFIG); controller.stop();
  });
});
