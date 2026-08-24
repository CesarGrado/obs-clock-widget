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
  it('starts unscheduled and keeps schedule, clear, quick duration, and zero-message timing synchronized', () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const app = document.querySelector('#app') as HTMLElement;
    const editor = initSceneEditor(app);
    const date = app.querySelector<HTMLInputElement>('#countdown-date')!;
    const time = app.querySelector<HTMLInputElement>('#countdown-time')!;
    const schedule = app.querySelector<HTMLButtonElement>('#schedule-scene')!;
    const clear = app.querySelector<HTMLButtonElement>('#clear-schedule')!;
    const beforeUrl = app.querySelector<HTMLInputElement>('#scene-url')!.value;

    expect(date.value).toBe(''); expect(time.value).toBe('');
    expect(date.disabled).toBe(true); expect(time.disabled).toBe(true);
    expect(schedule.textContent).toBe('Schedule scene'); expect(schedule.disabled).toBe(false);
    expect(clear.textContent).toBe('Clear schedule'); expect(clear.disabled).toBe(true);
    expect(app.querySelector('#resolved-target')?.textContent).toContain('Not scheduled');
    expect(document.body.textContent).not.toContain('2099');
    const timing = app.querySelector<HTMLSelectElement>('#reveal-delay')!;
    expect(app.querySelector(`label[for="${timing.id}"]`)?.textContent).toBe('Zero-message timing');
    expect([...timing.options].map((item) => item.textContent)).toEqual([
      'After the 5-second hold',
      '1 minute after the 5-second hold',
      '2 minutes after the 5-second hold',
      '3 minutes after the 5-second hold',
    ]);

    schedule.click();
    expect(date.disabled).toBe(false); expect(time.disabled).toBe(false);
    expect(schedule.disabled).toBe(true); expect(clear.disabled).toBe(false);
    expect(date.value).toBe(''); expect(time.value).toBe('');

    date.value = '2026-08-22'; time.value = '12:30';
    time.dispatchEvent(new Event('change', { bubbles: true }));
    expect(app.querySelector<HTMLInputElement>('#scene-url')!.value).toContain('ct=2026-08-22T12%3A30%3A00Z');

    clear.click();
    expect(date.value).toBe(''); expect(time.value).toBe('');
    expect(date.disabled).toBe(true); expect(time.disabled).toBe(true);
    expect(app.querySelector<HTMLInputElement>('#scene-url')!.value).toBe(beforeUrl);
    expect(document.body.textContent).not.toContain('2099');

    (app.querySelector('#quick-10') as HTMLButtonElement).click();
    expect(date.disabled).toBe(false); expect(time.disabled).toBe(false);
    expect(date.value).toBe('2026-08-22'); expect(time.value).toBe('12:10');
    expect(app.querySelector<HTMLInputElement>('#scene-url')!.value).toContain('ct=2026-08-22T12%3A10%3A00Z');
    editor.destroy(); vi.useRealTimers();
  });
  it('keeps text validation field-specific, persistent, and state-safe until each field recovers', () => {
    const app = document.querySelector('#app') as HTMLElement;
    const editor = initSceneEditor(app);
    const headline = app.querySelector<HTMLInputElement>('#headline')!;
    const reveal = app.querySelector<HTMLInputElement>('#reveal')!;
    const beforeUrl = app.querySelector<HTMLInputElement>('#scene-url')!.value;
    const beforePreview = app.querySelector('.scene-headline')!.textContent;

    headline.value = ''; headline.dispatchEvent(new Event('input', { bubbles: true }));
    reveal.value = 'bad <script>'; reveal.dispatchEvent(new Event('input', { bubbles: true }));

    expect(headline.getAttribute('aria-describedby')).toBe('headline-error');
    expect(reveal.getAttribute('aria-describedby')).toBe('reveal-error');
    expect(headline.getAttribute('aria-invalid')).toBe('true');
    expect(reveal.getAttribute('aria-invalid')).toBe('true');
    expect(app.querySelector('#headline-error')?.textContent).toContain('required');
    expect(app.querySelector('#reveal-error')?.textContent).toContain('punctuation');
    expect(app.querySelector<HTMLInputElement>('#scene-url')!.value).toBe(beforeUrl);
    expect(app.querySelector('.scene-headline')!.textContent).toBe(beforePreview);

    headline.value = 'GAME NIGHT'; headline.dispatchEvent(new Event('input', { bubbles: true }));
    expect(headline.getAttribute('aria-invalid')).toBeNull();
    expect(app.querySelector('#headline-error')?.textContent).toBe('');
    expect(reveal.getAttribute('aria-invalid')).toBe('true');
    expect(app.querySelector('#reveal-error')?.textContent).toContain('punctuation');
    expect(app.querySelector<HTMLInputElement>('#scene-url')!.value).toContain('h=GAME+NIGHT');
    expect(app.querySelector<HTMLInputElement>('#scene-url')!.value).not.toContain('script');
    editor.destroy();
  });
  it('surfaces each typography size boundary without changing rendered or exported state', () => {
    const app = document.querySelector('#app') as HTMLElement;
    const editor = initSceneEditor(app);
    const headlineSize = app.querySelector<HTMLInputElement>('#headline-size')!;
    const numberSize = app.querySelector<HTMLInputElement>('#number-size')!;
    const beforeUrl = app.querySelector<HTMLInputElement>('#scene-url')!.value;
    const beforeHeadlineSize = (app.querySelector('.scene-headline') as HTMLElement).style.fontSize;
    const beforeNumberSize = (app.querySelector('.scene-number') as HTMLElement).style.fontSize;

    headlineSize.value = '9'; headlineSize.dispatchEvent(new Event('input', { bubbles: true }));
    numberSize.value = '999'; numberSize.dispatchEvent(new Event('input', { bubbles: true }));

    expect(headlineSize.getAttribute('aria-describedby')).toBe('headline-size-error');
    expect(numberSize.getAttribute('aria-describedby')).toBe('number-size-error');
    expect(headlineSize.getAttribute('aria-invalid')).toBe('true');
    expect(numberSize.getAttribute('aria-invalid')).toBe('true');
    expect(app.querySelector('#headline-size-error')?.textContent).toContain('10');
    expect(app.querySelector('#number-size-error')?.textContent).toContain('240');
    expect(app.querySelector<HTMLInputElement>('#scene-url')!.value).toBe(beforeUrl);
    expect((app.querySelector('.scene-headline') as HTMLElement).style.fontSize).toBe(beforeHeadlineSize);
    expect((app.querySelector('.scene-number') as HTMLElement).style.fontSize).toBe(beforeNumberSize);

    headlineSize.value = '10'; headlineSize.dispatchEvent(new Event('input', { bubbles: true }));
    expect(headlineSize.getAttribute('aria-invalid')).toBeNull();
    expect(app.querySelector('#headline-size-error')?.textContent).toBe('');
    expect(numberSize.getAttribute('aria-invalid')).toBe('true');
    expect(app.querySelector<HTMLInputElement>('#scene-url')!.value).toContain('hs=10');
    expect(app.querySelector<HTMLInputElement>('#scene-url')!.value).not.toContain('ns=999');
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
  it('labels every weight option and keeps the selected label synchronized after font clamping', () => {
    const app = document.querySelector('#app') as HTMLElement;
    const editor = initSceneEditor(app);
    const weightSelects = [...app.querySelectorAll<HTMLSelectElement>('[id$="-weight"]')];
    expect(weightSelects).toHaveLength(4);
    expect(weightSelects.flatMap((select) => [...select.options].map((item) => item.textContent))).not.toContain('');

    const font = app.querySelector<HTMLSelectElement>('#headline-font')!;
    font.value = 'bebas-neue'; font.dispatchEvent(new Event('change', { bubbles: true }));
    const weight = app.querySelector<HTMLSelectElement>('#headline-weight')!;
    expect([...weight.options].map((item) => [item.value, item.textContent])).toEqual([['400', '400 Regular']]);
    expect(weight.selectedOptions[0]?.textContent).toBe('400 Regular');
    const url = (app.querySelector('#scene-url') as HTMLInputElement).value;
    expect(url).toContain('hf=bebas-neue');
    expect(url).toContain('hw=400');
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
  it('keeps date/time errors linked and exported state unchanged through missing, >99-day, and recovery states', () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const app = document.querySelector('#app') as HTMLElement;
    const editor = initSceneEditor(app);
    const date = app.querySelector<HTMLInputElement>('#countdown-date')!;
    const time = app.querySelector<HTMLInputElement>('#countdown-time')!;
    const beforeUrl = app.querySelector<HTMLInputElement>('#scene-url')!.value;

    date.value = ''; time.value = '';
    date.dispatchEvent(new Event('change', { bubbles: true }));
    time.dispatchEvent(new Event('change', { bubbles: true }));
    expect(date.getAttribute('aria-describedby')).toContain('countdown-date-error');
    expect(time.getAttribute('aria-describedby')).toContain('countdown-time-error');
    expect(date.getAttribute('aria-invalid')).toBe('true');
    expect(time.getAttribute('aria-invalid')).toBe('true');
    expect(app.querySelector('#countdown-date-error')?.textContent).toContain('date');
    expect(app.querySelector('#countdown-time-error')?.textContent).toContain('time');
    expect(app.querySelector<HTMLInputElement>('#scene-url')!.value).toBe(beforeUrl);

    date.value = '2026-12-31'; time.value = '12:00';
    date.dispatchEvent(new Event('change', { bubbles: true }));
    expect(date.getAttribute('aria-invalid')).toBe('true');
    expect(time.getAttribute('aria-invalid')).toBe('true');
    expect(app.querySelector('#countdown-error')?.textContent).toContain('99 days');
    expect(app.querySelector<HTMLInputElement>('#scene-url')!.value).toBe(beforeUrl);

    date.value = '2026-08-25'; time.value = '19:30';
    time.dispatchEvent(new Event('change', { bubbles: true }));
    expect(date.getAttribute('aria-invalid')).toBeNull();
    expect(time.getAttribute('aria-invalid')).toBeNull();
    expect(app.querySelector('#countdown-date-error')?.textContent).toBe('');
    expect(app.querySelector('#countdown-time-error')?.textContent).toBe('');
    expect(app.querySelector('#countdown-error')?.textContent).toBe('');
    expect(app.querySelector<HTMLInputElement>('#scene-url')!.value).not.toBe(beforeUrl);
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
      expect(date.getAttribute('aria-invalid')).toBe('true'); expect(time.getAttribute('aria-invalid')).toBe('true');
      date.value = '2026-03-09'; time.value = '02:30'; time.dispatchEvent(new Event('change', { bubbles: true }));
      expect(app.querySelector('#countdown-error')?.textContent).toBe('');
      expect(date.getAttribute('aria-invalid')).toBeNull(); expect(time.getAttribute('aria-invalid')).toBeNull();
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
  it('waits for fonts and settled 1080p layout before warning about named scene clipping and preserving copy', async () => {
    let releaseFonts!: () => void;
    const fontsReady = new Promise<void>((resolve) => { releaseFonts = resolve; });
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: fontsReady } });
    const rect = (left: number, top: number, right: number, bottom: number): DOMRect => ({
      left, top, right, bottom, width: right - left, height: bottom - top, x: left, y: top, toJSON: () => ({}),
    });
    const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.matches('[data-scene-measurement]')) return rect(0, 0, 1920, 1080);
      if (this.matches('[data-scene-measurement] .scene-headline')) return this.textContent?.startsWith('A') ? rect(80, 100, 2100, 300) : rect(80, 100, 1700, 300);
      return rect(100, 100, 800, 500);
    });
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(0); return 1; });
    const writeText = vi.fn().mockResolvedValue(undefined); Object.assign(navigator, { clipboard: { writeText } });
    const app = document.querySelector('#app') as HTMLElement; const editor = initSceneEditor(app);
    editor.applyConfig({ ...cloneSceneConfig(DEFAULT_SCENE_CONFIG), headline: 'A'.repeat(48) });

    expect(app.querySelector('#scene-clipping-warning')?.textContent).toBe('');
    releaseFonts();
    await vi.waitFor(() => expect(app.querySelector('#scene-clipping-warning')?.textContent).toContain('Headline'));
    (app.querySelector('#copy-url') as HTMLButtonElement).click();
    const url = (app.querySelector('#scene-url') as HTMLInputElement).value;
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(url));
    expect(app.querySelector('#copy-status')?.textContent).toContain('copied, but fix the clipping warning');

    editor.applyConfig(cloneSceneConfig(DEFAULT_SCENE_CONFIG));
    await vi.waitFor(() => expect(app.querySelector('#scene-clipping-warning')?.textContent).toBe(''));
    editor.destroy(); bounds.mockRestore(); raf.mockRestore();
    Object.defineProperty(document, 'fonts', { configurable: true, value: undefined });
  });
});
