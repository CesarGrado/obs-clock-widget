import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initSceneEditor } from '../../src/scene-editor/main';

beforeEach(() => { document.body.innerHTML = '<main id="app"></main>'; history.replaceState(null, '', '/scene-editor/'); });

describe('scene editor', () => {
  it('renders the default scene with preview, theme cards, and a valid URL', () => {
    const app = document.querySelector('#app') as HTMLElement;
    const editor = initSceneEditor(app);
    expect(app.querySelector('#headline')?.getAttribute('value') ?? (app.querySelector('#headline') as HTMLInputElement).value).toBe('STREAM STARTING SOON');
    expect(app.querySelectorAll('.theme-card').length).toBe(5);
    expect(app.querySelector('#scene-root') || document.querySelector('#preview-root')).toBeTruthy();
    const url = (app.querySelector('#scene-url') as HTMLInputElement).value;
    expect(url).toContain('/v1/scene/#v=1');
    editor.destroy();
  });
  it('validates headline length and characters with friendly errors', () => {
    const app = document.querySelector('#app') as HTMLElement;
    const editor = initSceneEditor(app);
    const headline = app.querySelector<HTMLInputElement>('#headline')!;
    headline.value = 'x'.repeat(60); headline.dispatchEvent(new Event('input', { bubbles: true }));
    expect(app.querySelector('#text-error')?.textContent).toContain('characters');
    expect(headline.getAttribute('aria-invalid')).toBe('true');
    headline.value = 'bad <script>'; headline.dispatchEvent(new Event('input', { bubbles: true }));
    expect(app.querySelector('#text-error')?.textContent).toContain('punctuation');
    headline.value = 'GAME NIGHT'; headline.dispatchEvent(new Event('input', { bubbles: true }));
    expect(headline.getAttribute('aria-invalid')).toBeNull();
    expect(app.querySelector('#text-error')?.textContent).toBe('');
    editor.destroy();
  });
  it('quick durations produce absolute targets and the URL stays canonical', () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const app = document.querySelector('#app') as HTMLElement;
    const editor = initSceneEditor(app);
    (app.querySelector('#quick-10') as HTMLButtonElement).click();
    const url = (app.querySelector('#scene-url') as HTMLInputElement).value;
    expect(url).toContain('ct=2026-08-22T12%3A10%3A00Z');
    expect(app.querySelector<HTMLInputElement>('#countdown-date')!.value).toBe('2026-08-22');
    editor.destroy(); vi.useRealTimers();
  });
  it('switches themes and motion and reflects them in the preview', () => {
    const app = document.querySelector('#app') as HTMLElement;
    const editor = initSceneEditor(app);
    (app.querySelector('#theme-sunset') as HTMLInputElement).checked = true;
    (app.querySelector('#theme-sunset') as HTMLInputElement).dispatchEvent(new Event('change', { bubbles: true }));
    (app.querySelector('#motion-none') as HTMLInputElement).checked = true;
    (app.querySelector('#motion-none') as HTMLInputElement).dispatchEvent(new Event('change', { bubbles: true }));
    const previewRoot = document.querySelector('#preview-root') as HTMLElement;
    expect(previewRoot.getAttribute('data-theme')).toBe('sunset');
    expect(previewRoot.getAttribute('data-motion')).toBe('none');
    const url = (app.querySelector('#scene-url') as HTMLInputElement).value;
    expect(url).toContain('th=sunset');
    expect(url).toContain('mo=none');
    editor.destroy();
  });
  it('toggles the zero-state preview to show the reveal message', () => {
    const app = document.querySelector('#app') as HTMLElement;
    const editor = initSceneEditor(app);
    const previewRoot = document.querySelector('#preview-root') as HTMLElement;
    expect(previewRoot.querySelector('.scene-reveal')?.classList.contains('scene-shown')).toBe(false);
    const toggle = app.querySelector<HTMLInputElement>('#preview-zero')!;
    toggle.checked = true; toggle.dispatchEvent(new Event('change', { bubbles: true }));
    expect(previewRoot.querySelector('.scene-reveal')?.classList.contains('scene-shown')).toBe(true);
    toggle.checked = false; toggle.dispatchEvent(new Event('change', { bubbles: true }));
    expect(previewRoot.querySelector('.scene-reveal')?.classList.contains('scene-shown')).toBe(false);
    editor.destroy();
  });
  it('changes a headline font and clamps weight to the font registry', () => {
    const app = document.querySelector('#app') as HTMLElement;
    const editor = initSceneEditor(app);
    const font = app.querySelector<HTMLSelectElement>('#headline-font')!;
    font.value = 'bebas-neue'; font.dispatchEvent(new Event('change', { bubbles: true }));
    const weight = app.querySelector<HTMLSelectElement>('#headline-weight')!;
    expect([...weight.options].map((o) => o.value)).toEqual(['400']);
    expect(weight.value).toBe('400');
    const url = (app.querySelector('#scene-url') as HTMLInputElement).value;
    expect(url).toContain('hf=bebas-neue');
    editor.destroy();
  });
});
