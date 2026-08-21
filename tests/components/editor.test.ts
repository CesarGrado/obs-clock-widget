import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initEditor } from '../../src/editor/main';

beforeEach(() => { document.body.innerHTML = '<main id="app"></main>'; history.replaceState(null, '', '/editor/'); });
describe('clock editor', () => {
  it('builds accessible controls and updates preview and URL', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const format = app.querySelector<HTMLInputElement>('#line1-format')!; format.value = 'HH:mm'; format.dispatchEvent(new Event('input', { bubbles: true }));
    expect(app.querySelector('#preview-root')?.textContent).toMatch(/^\d\d:\d\d/);
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('f1=HH%3Amm');
    expect(app.querySelectorAll('label[for="line1-format"]')).toHaveLength(1); editor.destroy();
  });
  it('applies presets and resets defaults', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const preset = app.querySelector<HTMLSelectElement>('#preset')!; preset.value = 'Puzzlr'; preset.dispatchEvent(new Event('change', { bubbles: true }));
    expect((app.querySelector('#line1-color') as HTMLInputElement).value).toBe('#7c5cfc');
    (app.querySelector('#reset') as HTMLButtonElement).click(); expect((app.querySelector('#line1-color') as HTMLInputElement).value).toBe('#ffffff'); editor.destroy();
  });
  it('rejects invalid formats without replacing the last preview', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app); const before = app.querySelector('#preview-root')?.textContent;
    const format = app.querySelector<HTMLInputElement>('#line1-format')!; format.value = 'HH:mm X'; format.dispatchEvent(new Event('input', { bubbles: true }));
    expect(app.querySelector('#line1-error')?.textContent).toContain('Unsupported'); expect(app.querySelector('#preview-root')?.textContent).toBe(before); editor.destroy();
  });
  it('reports clipboard success', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } }); const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    (app.querySelector('#copy-url') as HTMLButtonElement).click(); await vi.waitFor(() => expect(app.querySelector('#copy-status')?.textContent).toBe('OBS URL copied.')); editor.destroy();
  });
});
