import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initSceneEditor } from '../../src/scene-editor/main';
import { DEFAULT_SCENE_CONFIG } from '../../src/config/scene-defaults';
import { cloneSceneConfig } from '../../src/config/clone';
import { wallTimeToInstant } from '../../src/editor/tz';

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
  it('shows a timezone label and wall-time date fields for the current target', () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const app = document.querySelector('#app') as HTMLElement;
    const editor = initSceneEditor(app);
    const tz = app.querySelector('#countdown-timezone')!;
    expect(tz.textContent).toMatch(/\(.*\)$/); // e.g. "America/New_York (EDT)"
    // Display fields are wall time in the device timezone, not UTC.
    const utc = new Date('2026-08-24T18:30:00Z');
    const expected = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(utc);
    const get = (t: string) => expected.find((p) => p.type === t)?.value;
    editor.applyConfig({ ...cloneSceneConfig(DEFAULT_SCENE_CONFIG), countdownTarget: '2026-08-24T18:30:00Z' });
    expect((app.querySelector('#countdown-date') as HTMLInputElement).value).toBe(`${get('year')}-${get('month')}-${get('day')}`);
    expect((app.querySelector('#countdown-time') as HTMLInputElement).value).toBe(`${get('hour') === '24' ? '00' : get('hour')}:${get('minute')}`);
    editor.destroy(); vi.useRealTimers();
  });
  it('schedules a normal date/time as a DST-safe absolute instant', () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const app = document.querySelector('#app') as HTMLElement;
    const editor = initSceneEditor(app);
    const date = app.querySelector<HTMLInputElement>('#countdown-date')!; const time = app.querySelector<HTMLInputElement>('#countdown-time')!;
    date.value = '2026-08-25'; time.value = '19:30';
    date.dispatchEvent(new Event('change', { bubbles: true })); time.dispatchEvent(new Event('change', { bubbles: true }));
    const url = (app.querySelector('#scene-url') as HTMLInputElement).value;
    // Wall 19:30 in the device timezone must decode back to the same wall time.
    const ct = new URLSearchParams(url.split('#')[1]!).get('ct')!;
    const back = new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(ct));
    expect(back.find((p) => p.type === 'hour')?.value).toBe('19'); expect(back.find((p) => p.type === 'minute')?.value).toBe('30');
    editor.destroy(); vi.useRealTimers();
  });
  it('rejects DST gap wall times with a friendly error', () => {
    // 2026-03-08 02:30 does not exist in America/New_York (and in any spring-forward zone with a 02:00–03:00 gap).
    vi.setSystemTime(new Date('2026-03-07T12:00:00Z'));
    const app = document.querySelector('#app') as HTMLElement;
    const editor = initSceneEditor(app);
    const date = app.querySelector<HTMLInputElement>('#countdown-date')!; const time = app.querySelector<HTMLInputElement>('#countdown-time')!;
    date.value = '2026-03-08'; time.value = '02:30';
    date.dispatchEvent(new Event('change', { bubbles: true })); time.dispatchEvent(new Event('change', { bubbles: true }));
    const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const wallExists = wallTimeToInstant({ year: 2026, month: 3, day: 8, hour: 2, minute: 30 }) !== null;
    if (!wallExists) {
      expect(app.querySelector('#countdown-error')?.textContent).toContain('daylight-saving');
    } else {
      // Zone without that gap: accept and verify exact round-trip instead.
      expect(app.querySelector('#countdown-error')?.textContent).toBe('');
      const ct = new URLSearchParams((app.querySelector('#scene-url') as HTMLInputElement).value.split('#')[1]!).get('ct')!;
      const back = new Intl.DateTimeFormat('en-CA', { timeZone: tzName, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(ct));
      expect(back.find((p) => p.type === 'hour')?.value).toBe('02'); expect(back.find((p) => p.type === 'minute')?.value).toBe('30');
    }
    editor.destroy(); vi.useRealTimers();
  });
  it('exposes the reveal delay control and serializes it', () => {
    const app = document.querySelector('#app') as HTMLElement;
    const editor = initSceneEditor(app);
    const delay = app.querySelector<HTMLSelectElement>('#reveal-delay')!;
    expect([...delay.options].map((o) => o.value)).toEqual(['0', '1', '2', '3']);
    expect(delay.value).toBe('1');
    delay.value = '2'; delay.dispatchEvent(new Event('change', { bubbles: true }));
    expect((app.querySelector('#scene-url') as HTMLInputElement).value).toContain('rd=2');
    editor.destroy();
  });
});
