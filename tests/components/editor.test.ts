import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initEditor } from '../../src/editor/main';
import { parseConfigImport } from '../../src/config/import';
import { DEFAULT_CONFIG } from '../../src/config/defaults';

beforeEach(() => { document.body.innerHTML = '<main id="app"></main>'; history.replaceState(null, '', '/editor/'); });
describe('clock editor', () => {
  it('builds accessible controls and updates preview and URL', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const format = app.querySelector<HTMLInputElement>('#line1-format')!; format.value = 'HH:mm'; format.dispatchEvent(new Event('input', { bubbles: true }));
    expect(app.querySelector('#preview-root')?.textContent).toMatch(/^\d\d:\d\d/);
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('f1=HH%3Amm');
    expect(app.querySelectorAll('label[for="line1-format"]')).toHaveLength(1); editor.destroy();
  });
  it('configures an absolute event countdown and displays its resolved target', () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const countdownCard = app.querySelector<HTMLInputElement>('#mode-countdown')!; countdownCard.checked = true; countdownCard.dispatchEvent(new Event('change', { bubbles: true }));
    const target = app.querySelector<HTMLInputElement>('#countdown-target')!;
    target.value = '2026-08-24T18:30:00Z'; target.dispatchEvent(new Event('input', { bubbles: true }));
    const url = (app.querySelector('#obs-url') as HTMLInputElement).value;
    expect(url).toContain('m=countdown&ct=2026-08-24T18%3A30%3A00Z');
    expect(app.querySelector('#resolved-target')?.textContent).toMatch(/^Ends \w+day, .+ · .+ remaining$/);
    expect(app.querySelector('#preview-root .clock-line')?.textContent).toMatch(/^2d 06:30:/);
    expect((app.querySelector('#post-zero-clock') as HTMLInputElement).checked).toBe(true);
    expect((app.querySelector('#post-zero-overtime') as HTMLInputElement).checked).toBe(false);
    editor.destroy(); vi.useRealTimers();
  });
  it('starts a quick 10-minute countdown from an absolute target', () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const countdownCard = app.querySelector<HTMLInputElement>('#mode-countdown')!; countdownCard.checked = true; countdownCard.dispatchEvent(new Event('change', { bubbles: true }));
    (app.querySelector('#quick-10') as HTMLButtonElement).click();
    const url = (app.querySelector('#obs-url') as HTMLInputElement).value;
    expect(url).toContain('m=countdown&ct=2026-08-22T12%3A10%3A00Z');
    expect(app.querySelector('#resolved-target')?.textContent).toContain('10 minutes remaining');
    expect(app.querySelector<HTMLInputElement>('#countdown-date')!.value).toBe('2026-08-22');
    expect(app.querySelector<HTMLInputElement>('#countdown-time')!.value).toBe('12:10');
    editor.destroy(); vi.useRealTimers();
  });
  it('schedules a specific date and time with friendly validation', () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const countdownCard = app.querySelector<HTMLInputElement>('#mode-countdown')!; countdownCard.checked = true; countdownCard.dispatchEvent(new Event('change', { bubbles: true }));
    const date = app.querySelector<HTMLInputElement>('#countdown-date')!; const time = app.querySelector<HTMLInputElement>('#countdown-time')!;
    date.value = '2026-08-24'; date.dispatchEvent(new Event('change', { bubbles: true }));
    time.value = '18:30'; time.dispatchEvent(new Event('change', { bubbles: true }));
    const url = (app.querySelector('#obs-url') as HTMLInputElement).value;
    expect(url).toContain('m=countdown&ct=2026-08-24T18%3A30%3A00');
    date.value = '2027-08-24'; date.dispatchEvent(new Event('change', { bubbles: true }));
    expect(app.querySelector('#countdown-error')?.textContent).toContain('99 days');
    editor.destroy(); vi.useRealTimers();
  });
  it('rejects a wall time inside the spring-forward DST gap instead of silently shifting it', () => {
    vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const timezone = app.querySelector<HTMLInputElement>('#timezone')!;
    timezone.value = 'new york'; timezone.dispatchEvent(new Event('input', { bubbles: true }));
    timezone.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    timezone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(timezone.value).toBe('America/New_York');
    const countdownCard = app.querySelector<HTMLInputElement>('#mode-countdown')!; countdownCard.checked = true; countdownCard.dispatchEvent(new Event('change', { bubbles: true }));
    const date = app.querySelector<HTMLInputElement>('#countdown-date')!; const time = app.querySelector<HTMLInputElement>('#countdown-time')!;
    date.value = '2026-03-08'; time.value = '02:30';
    date.dispatchEvent(new Event('change', { bubbles: true })); time.dispatchEvent(new Event('change', { bubbles: true }));
    expect(app.querySelector('#countdown-error')?.textContent).toContain('does not exist');
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).not.toContain('ct=2026-03-08T');
    editor.destroy(); vi.useRealTimers();
  });
  it('resolves the fall-back DST overlap deterministically to the first occurrence', () => {
    vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const timezone = app.querySelector<HTMLInputElement>('#timezone')!;
    timezone.value = 'new york'; timezone.dispatchEvent(new Event('input', { bubbles: true }));
    timezone.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    timezone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const countdownCard = app.querySelector<HTMLInputElement>('#mode-countdown')!; countdownCard.checked = true; countdownCard.dispatchEvent(new Event('change', { bubbles: true }));
    const date = app.querySelector<HTMLInputElement>('#countdown-date')!; const time = app.querySelector<HTMLInputElement>('#countdown-time')!;
    date.value = '2026-11-01'; time.value = '01:30';
    date.dispatchEvent(new Event('change', { bubbles: true })); time.dispatchEvent(new Event('change', { bubbles: true }));
    // Documented behavior: ambiguous fall-back times resolve to the FIRST (daylight) occurrence — 01:30 EDT = 05:30Z.
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('ct=2026-11-01T05%3A30%3A00Z');
    expect(app.querySelector('#countdown-error')?.textContent).toBe('');
    editor.destroy(); vi.useRealTimers();
  });
  it('resolves the Pacific/Chatham fall-back overlap to the first occurrence too', () => {
    vi.setSystemTime(new Date('2026-04-01T12:00:00Z'));
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const timezone = app.querySelector<HTMLInputElement>('#timezone')!;
    timezone.value = 'chatham'; timezone.dispatchEvent(new Event('input', { bubbles: true }));
    timezone.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    timezone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const countdownCard = app.querySelector<HTMLInputElement>('#mode-countdown')!; countdownCard.checked = true; countdownCard.dispatchEvent(new Event('change', { bubbles: true }));
    const date = app.querySelector<HTMLInputElement>('#countdown-date')!; const time = app.querySelector<HTMLInputElement>('#countdown-time')!;
    // 2026-04-05 03:00 is ambiguous in Chatham (fall-back +13:45 → +12:45): first occurrence 13:15Z (2026-04-04 UTC).
    date.value = '2026-04-05'; time.value = '03:00';
    date.dispatchEvent(new Event('change', { bubbles: true })); time.dispatchEvent(new Event('change', { bubbles: true }));
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('ct=2026-04-04T13%3A15%3A00Z');
    expect(app.querySelector('#countdown-error')?.textContent).toBe('');
    editor.destroy(); vi.useRealTimers();
  });
  it('round-trips exact wall times in fractional-offset and normal timezones', () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const timezone = app.querySelector<HTMLInputElement>('#timezone')!;
    timezone.value = 'chatham'; timezone.dispatchEvent(new Event('input', { bubbles: true }));
    timezone.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    timezone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(timezone.value).toBe('Pacific/Chatham');
    const countdownCard = app.querySelector<HTMLInputElement>('#mode-countdown')!; countdownCard.checked = true; countdownCard.dispatchEvent(new Event('change', { bubbles: true }));
    const date = app.querySelector<HTMLInputElement>('#countdown-date')!; const time = app.querySelector<HTMLInputElement>('#countdown-time')!;
    date.value = '2026-08-25'; time.value = '14:45';
    date.dispatchEvent(new Event('change', { bubbles: true })); time.dispatchEvent(new Event('change', { bubbles: true }));
    // Chatham in August is UTC+12:45, so 14:45 wall = 02:00Z.
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('ct=2026-08-25T02%3A00%3A00Z');
    expect(app.querySelector<HTMLInputElement>('#countdown-time')!.value).toBe('14:45');
    editor.destroy(); vi.useRealTimers();
  });
  it('round-trips a wall time adjacent to the fall-back transition (02:30 after the shift)', () => {
    vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const timezone = app.querySelector<HTMLInputElement>('#timezone')!;
    timezone.value = 'new york'; timezone.dispatchEvent(new Event('input', { bubbles: true }));
    timezone.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    timezone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const countdownCard = app.querySelector<HTMLInputElement>('#mode-countdown')!; countdownCard.checked = true; countdownCard.dispatchEvent(new Event('change', { bubbles: true }));
    const date = app.querySelector<HTMLInputElement>('#countdown-date')!; const time = app.querySelector<HTMLInputElement>('#countdown-time')!;
    // 02:30 on 2026-11-01 exists only in EST (UTC-5) — the post-transition offset — so it must resolve to 07:30Z.
    date.value = '2026-11-01'; time.value = '02:30';
    date.dispatchEvent(new Event('change', { bubbles: true })); time.dispatchEvent(new Event('change', { bubbles: true }));
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('ct=2026-11-01T07%3A30%3A00Z');
    expect(app.querySelector('#countdown-error')?.textContent).toBe('');
    editor.destroy(); vi.useRealTimers();
  });
  it('rejects a Chatham spring-forward gap wall time', () => {
    vi.setSystemTime(new Date('2026-09-20T12:00:00Z'));
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const timezone = app.querySelector<HTMLInputElement>('#timezone')!;
    timezone.value = 'chatham'; timezone.dispatchEvent(new Event('input', { bubbles: true }));
    timezone.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    timezone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const countdownCard = app.querySelector<HTMLInputElement>('#mode-countdown')!; countdownCard.checked = true; countdownCard.dispatchEvent(new Event('change', { bubbles: true }));
    const date = app.querySelector<HTMLInputElement>('#countdown-date')!; const time = app.querySelector<HTMLInputElement>('#countdown-time')!;
    // 2026-09-27 02:45 does not exist in Pacific/Chatham (spring forward 02:45→03:45 NZDT->NZST+…): must be rejected, not shifted to 01:45.
    date.value = '2026-09-27'; time.value = '02:45';
    date.dispatchEvent(new Event('change', { bubbles: true })); time.dispatchEvent(new Event('change', { bubbles: true }));
    expect(app.querySelector('#countdown-error')?.textContent).toContain('does not exist');
    editor.destroy(); vi.useRealTimers();
  });
  it('clears stale aria-invalid when a quick duration replaces a malformed target', () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const countdownCard = app.querySelector<HTMLInputElement>('#mode-countdown')!; countdownCard.checked = true; countdownCard.dispatchEvent(new Event('change', { bubbles: true }));
    const target = app.querySelector<HTMLInputElement>('#countdown-target')!;
    target.value = 'not-a-date'; target.dispatchEvent(new Event('input', { bubbles: true }));
    expect(target.getAttribute('aria-invalid')).toBe('true');
    (app.querySelector('#quick-10') as HTMLButtonElement).click();
    expect(target.getAttribute('aria-invalid')).toBeNull();
    expect(app.querySelector('#countdown-error')?.textContent).toBe('');
    editor.destroy(); vi.useRealTimers();
  });
  it('clears stale aria-invalid and errors when a valid config is imported, reset, or preset-selected', () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const countdownCard = app.querySelector<HTMLInputElement>('#mode-countdown')!; countdownCard.checked = true; countdownCard.dispatchEvent(new Event('change', { bubbles: true }));
    const target = app.querySelector<HTMLInputElement>('#countdown-target')!;
    // Malformed manual entry sets aria-invalid and an error message…
    target.value = 'not-a-date'; target.dispatchEvent(new Event('input', { bubbles: true }));
    expect(target.getAttribute('aria-invalid')).toBe('true');
    expect(app.querySelector('#countdown-error')?.textContent).not.toBe('');
    // …but importing a valid fragment synchronizes a valid config and must clear both.
    const imported = parseConfigImport('https://obs-clock-widget.pages.dev/v1/clock/#v=1&m=countdown&ct=2026-08-24T18%3A30%3A00Z');
    if (!imported.ok) throw new Error(`Expected import to succeed, got ${imported.code}`);
    editor.applyConfig(imported.config);
    expect(target.value).toBe('2026-08-24T18:30:00Z');
    expect(target.getAttribute('aria-invalid')).toBeNull();
    expect(app.querySelector('#countdown-error')?.textContent).toBe('');
    // Same after a malformed entry followed by reset to defaults.
    target.value = 'garbage'; target.dispatchEvent(new Event('input', { bubbles: true }));
    expect(target.getAttribute('aria-invalid')).toBe('true');
    editor.applyConfig({ ...DEFAULT_CONFIG });
    expect(target.getAttribute('aria-invalid')).toBeNull();
    expect(app.querySelector('#countdown-error')?.textContent).toBe('');
    editor.destroy(); vi.useRealTimers();
  });
  it('schedules no summary timer for an expired target and cleans up on retarget, mode switch, and destroy', () => {
    vi.useFakeTimers({ now: new Date('2026-08-22T12:00:00Z'), shouldAdvanceTime: false });
    const app = document.querySelector('#app') as HTMLElement;
    const editor = initEditor(app);
    const countdownCard = app.querySelector<HTMLInputElement>('#mode-countdown')!; countdownCard.checked = true; countdownCard.dispatchEvent(new Event('change', { bubbles: true }));
    const target = app.querySelector<HTMLInputElement>('#countdown-target')!;
    // Expired target: text renders once, and no NEW timer appears beyond the preview renderer's.
    const rendererBaseline = vi.getTimerCount();
    target.value = '2026-08-22T11:30:00Z'; target.dispatchEvent(new Event('input', { bubbles: true }));
    expect(app.querySelector('#resolved-target')?.textContent).toContain('It has ended');
    // Expired target: the summary timer is removed; only the preview renderer's tick remains.
    expect(vi.getTimerCount()).toBe(rendererBaseline - 1);
    // Retarget to the future restores exactly one summary timer, replaced (not accumulated) on each retarget.
    target.value = '2026-08-22T12:02:10Z'; target.dispatchEvent(new Event('input', { bubbles: true }));
    const timersAfterRetarget = vi.getTimerCount();
    expect(timersAfterRetarget).toBe(rendererBaseline);
    target.value = '2026-08-22T12:05:10Z'; target.dispatchEvent(new Event('input', { bubbles: true }));
    expect(vi.getTimerCount()).toBe(timersAfterRetarget);
    // Mode switch to clock clears the summary timer.
    const clockCard = app.querySelector<HTMLInputElement>('#mode-clock')!; clockCard.checked = true; clockCard.dispatchEvent(new Event('change', { bubbles: true }));
    expect(vi.getTimerCount()).toBeLessThan(timersAfterRetarget);
    // Re-entering countdown re-adds it (back to the full countdown baseline), and destroying the editor leaves no timers.
    countdownCard.checked = true; countdownCard.dispatchEvent(new Event('change', { bubbles: true }));
    expect(vi.getTimerCount()).toBe(timersAfterRetarget);
    editor.destroy();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
  it('renders a sensible summary for an expired target and updates the summary as time passes', () => {
    vi.useFakeTimers({ now: new Date('2026-08-22T12:00:00Z'), shouldAdvanceTime: false });
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const countdownCard = app.querySelector<HTMLInputElement>('#mode-countdown')!; countdownCard.checked = true; countdownCard.dispatchEvent(new Event('change', { bubbles: true }));
    const target = app.querySelector<HTMLInputElement>('#countdown-target')!;
    target.value = '2026-08-22T11:30:00Z'; target.dispatchEvent(new Event('input', { bubbles: true }));
    expect(app.querySelector('#resolved-target')?.textContent).toContain('It has ended');
    // Summary ticks: the minute-aligned timer refreshes the text as time passes.
    target.value = '2026-08-22T12:02:10Z'; target.dispatchEvent(new Event('input', { bubbles: true }));
    expect(app.querySelector('#resolved-target')?.textContent).toContain('2 minutes remaining');
    vi.advanceTimersByTime(71_000); // first aligned tick at +10s, then the interval's tick at +70s
    expect(app.querySelector('#resolved-target')?.textContent).toContain('1 minute remaining');
    editor.destroy(); vi.useRealTimers();
  });
  it('switches post-zero behavior with plain-language radios', () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const countdownCard = app.querySelector<HTMLInputElement>('#mode-countdown')!; countdownCard.checked = true; countdownCard.dispatchEvent(new Event('change', { bubbles: true }));
    const overtime = app.querySelector<HTMLInputElement>('#post-zero-overtime')!; overtime.checked = true; overtime.dispatchEvent(new Event('change', { bubbles: true }));
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('ot=1');
    const clock = app.querySelector<HTMLInputElement>('#post-zero-clock')!; clock.checked = true; clock.dispatchEvent(new Event('change', { bubbles: true }));
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).not.toContain('ot=1');
    editor.destroy(); vi.useRealTimers();
  });
  it('rejects naive or targets beyond the 99-day editor limit', () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const countdownCard = app.querySelector<HTMLInputElement>('#mode-countdown')!; countdownCard.checked = true; countdownCard.dispatchEvent(new Event('change', { bubbles: true }));
    const target = app.querySelector<HTMLInputElement>('#countdown-target')!;
    target.value = '2026-08-24T18:30'; target.dispatchEvent(new Event('input', { bubbles: true }));
    expect(app.querySelector('#countdown-error')?.textContent).toContain('offset');
    target.value = '2027-08-24T18:30:00Z'; target.dispatchEvent(new Event('input', { bubbles: true }));
    expect(app.querySelector('#countdown-error')?.textContent).toContain('99 days');
    editor.destroy(); vi.useRealTimers();
  });
  it('applies presets and resets defaults', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const preset = app.querySelector<HTMLSelectElement>('#preset')!; preset.value = 'Puzzlr'; preset.dispatchEvent(new Event('change', { bubbles: true }));
    expect((app.querySelector('#line1-color') as HTMLInputElement).value).toBe('#7c5cfc');
    (app.querySelector('#reset') as HTMLButtonElement).click(); expect((app.querySelector('#line1-color') as HTMLInputElement).value).toBe('#ffffff'); editor.destroy();
  });
  it('restores the configuration that was replaced by reset', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const format = app.querySelector<HTMLInputElement>('#line1-format')!;
    format.value = 'HH:mm'; format.dispatchEvent(new Event('input', { bubbles: true }));
    const customizedUrl = (app.querySelector('#obs-url') as HTMLInputElement).value;
    const undo = app.querySelector<HTMLButtonElement>('#undo-reset')!;
    expect(undo.disabled).toBe(true);

    (app.querySelector('#reset') as HTMLButtonElement).click();
    expect(undo.disabled).toBe(false);
    expect(format.value).toBe('HH:mm:ss');
    undo.click();

    expect(format.value).toBe('HH:mm');
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toBe(customizedUrl);
    expect(undo.disabled).toBe(true);
    editor.destroy();
  });
  it('updates undo to the configuration immediately before the latest reset', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const format = app.querySelector<HTMLInputElement>('#line1-format')!;
    format.value = 'HH:mm'; format.dispatchEvent(new Event('input', { bubbles: true }));
    (app.querySelector('#reset') as HTMLButtonElement).click();
    format.value = 'h:mm a'; format.dispatchEvent(new Event('input', { bubbles: true }));

    (app.querySelector('#reset') as HTMLButtonElement).click();
    (app.querySelector('#undo-reset') as HTMLButtonElement).click();

    expect(format.value).toBe('h:mm a');
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('f1=h%3Amm+a');
    expect(app.querySelector('#copy-status')?.textContent).toBe('Previous settings restored.');
    editor.destroy();
  });
  it('applies revised Minimal as one monospaced line without reserved date space', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const preset = app.querySelector<HTMLSelectElement>('#preset')!; preset.value = 'Minimal'; preset.dispatchEvent(new Event('change', { bubbles: true }));
    expect((app.querySelector('#shadow') as HTMLInputElement).value).toBe('4');
    expect((app.querySelector('#stroke') as HTMLInputElement).value).toBe('0');
    expect((app.querySelector('#line1-format') as HTMLInputElement).value).toBe('HH:mm');
    expect((app.querySelector('#line1-font') as HTMLSelectElement).value).toBe('mono');
    expect((app.querySelector('#line1-weight') as HTMLSelectElement).value).toBe('600');
    expect((app.querySelector('#line2-enabled') as HTMLInputElement).checked).toBe(false);
    const renderedLines = app.querySelectorAll<HTMLElement>('#preview-root .clock-line');
    expect(renderedLines).toHaveLength(1);
    expect(renderedLines[0]?.style.fontFamily).toContain('Roboto Mono');
    expect((app.querySelector('#preview-root .clock-content') as HTMLElement).children).toHaveLength(1);
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('sh=4&f1=HH%3Amm&ft1=mono&s1=88&w1=600&e2=0');
    editor.destroy();
  });

  it('applies the Gameplay preset to every relevant editor control', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const preset = app.querySelector<HTMLSelectElement>('#preset')!; preset.value = 'Gameplay'; preset.dispatchEvent(new Event('change', { bubbles: true }));
    const value = (id: string) => (app.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!).value;
    expect({
      timezone: value('timezone'), locale: value('locale'), align: value('align'), gap: value('gap'), stroke: value('stroke'), shadow: value('shadow'),
      format1: value('line1-format'), font1: value('line1-font'), size1: value('line1-size'), weight1: value('line1-weight'), color1: value('line1-color'), opacity1: value('line1-opacity'), transform1: value('line1-transform'),
      format2: value('line2-format'), font2: value('line2-font'), size2: value('line2-size'), weight2: value('line2-weight'), color2: value('line2-color'), opacity2: value('line2-opacity'), transform2: value('line2-transform'),
    }).toEqual({
      timezone: 'local', locale: 'auto', align: 'center', gap: '6', stroke: '4', shadow: '0',
      format1: 'HH:mm:ss', font1: 'system', size1: '80', weight1: '700', color1: '#ffffff', opacity1: '1', transform1: 'none',
      format2: 'ddd, MMM D', font2: 'system', size2: '28', weight2: '700', color2: '#ffd54a', opacity2: '1', transform2: 'uppercase',
    });
    expect((app.querySelector('#line1-enabled') as HTMLInputElement).checked).toBe(true);
    expect((app.querySelector('#line2-enabled') as HTMLInputElement).checked).toBe(true);
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('gap=6&st=4&sh=0');
    editor.destroy();
  });

  it('swaps the two configured lines without changing their styling', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const preset = app.querySelector<HTMLSelectElement>('#preset')!; preset.value = 'Gameplay'; preset.dispatchEvent(new Event('change', { bubbles: true }));

    (app.querySelector('#swap-lines') as HTMLButtonElement).click();

    expect((app.querySelector('#line1-format') as HTMLInputElement).value).toBe('ddd, MMM D');
    expect((app.querySelector('#line1-size') as HTMLInputElement).value).toBe('28');
    expect((app.querySelector('#line1-color') as HTMLInputElement).value).toBe('#ffd54a');
    expect((app.querySelector('#line1-transform') as HTMLSelectElement).value).toBe('uppercase');
    expect((app.querySelector('#line2-format') as HTMLInputElement).value).toBe('HH:mm:ss');
    expect((app.querySelector('#line2-size') as HTMLInputElement).value).toBe('80');
    expect((app.querySelector('#line2-color') as HTMLInputElement).value).toBe('#ffffff');
    expect((app.querySelector('#preset') as HTMLSelectElement).value).toBe('Custom');
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('f1=ddd%2C+MMM+D');
    editor.destroy();
  });

  it('matches Line 2 styling to Line 1 without replacing its content settings', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const preset = app.querySelector<HTMLSelectElement>('#preset')!; preset.value = 'Gameplay'; preset.dispatchEvent(new Event('change', { bubbles: true }));
    const change = (id: string, value: string) => { const control = app.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!; control.value = value; control.dispatchEvent(new Event(control instanceof HTMLInputElement && control.type === 'range' ? 'input' : 'change', { bubbles: true })); };
    change('line1-font', 'mono'); change('line1-weight', '600'); change('line1-opacity', '0.5');
    (app.querySelector('#line1-enabled') as HTMLInputElement).click();

    (app.querySelector('#match-line2-style') as HTMLButtonElement).click();

    expect((app.querySelector('#line2-enabled') as HTMLInputElement).checked).toBe(true);
    expect((app.querySelector('#line2-format') as HTMLInputElement).value).toBe('ddd, MMM D');
    expect((app.querySelector('#line2-font') as HTMLSelectElement).value).toBe('mono');
    expect((app.querySelector('#line2-size') as HTMLInputElement).value).toBe('80');
    expect((app.querySelector('#line2-weight') as HTMLSelectElement).value).toBe('600');
    expect((app.querySelector('#line2-color') as HTMLInputElement).value).toBe('#ffffff');
    expect((app.querySelector('#line2-opacity') as HTMLInputElement).value).toBe('0.5');
    expect((app.querySelector('#line2-transform') as HTMLSelectElement).value).toBe('none');
    expect((app.querySelector('#preset') as HTMLSelectElement).value).toBe('Custom');
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('f2=ddd%2C+MMM+D&ft2=mono&s2=80&w2=600&o2=0.5');
    editor.destroy();
  });

  it('matches Line 1 styling to Line 2 without replacing its content settings', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const preset = app.querySelector<HTMLSelectElement>('#preset')!; preset.value = 'Gameplay'; preset.dispatchEvent(new Event('change', { bubbles: true }));
    const change = (id: string, value: string) => { const control = app.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!; control.value = value; control.dispatchEvent(new Event(control instanceof HTMLInputElement && control.type === 'range' ? 'input' : 'change', { bubbles: true })); };
    change('line2-font', 'mono'); change('line2-opacity', '0.5');
    (app.querySelector('#line1-enabled') as HTMLInputElement).click();

    (app.querySelector('#match-line1-style') as HTMLButtonElement).click();

    expect((app.querySelector('#line1-enabled') as HTMLInputElement).checked).toBe(false);
    expect((app.querySelector('#line1-format') as HTMLInputElement).value).toBe('HH:mm:ss');
    expect((app.querySelector('#line1-font') as HTMLSelectElement).value).toBe('mono');
    expect((app.querySelector('#line1-size') as HTMLInputElement).value).toBe('28');
    expect((app.querySelector('#line1-weight') as HTMLSelectElement).value).toBe('700');
    expect((app.querySelector('#line1-color') as HTMLInputElement).value).toBe('#ffd54a');
    expect((app.querySelector('#line1-opacity') as HTMLInputElement).value).toBe('0.5');
    expect((app.querySelector('#line1-transform') as HTMLSelectElement).value).toBe('uppercase');
    expect((app.querySelector('#preset') as HTMLSelectElement).value).toBe('Custom');
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('ft1=mono&s1=28&c1=%23FFD54A&o1=0.5&tr1=uppercase');
    editor.destroy();
  });

  it('groups more than 30 fonts into category optgroups', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const font = app.querySelector<HTMLSelectElement>('#line1-font')!;
    const options = Array.from(font.options);
    expect(options.length).toBeGreaterThan(30);
    expect(options.find(({ value }) => value === 'bebas-neue')?.textContent).toBe('Bebas Neue');
    const groups = Array.from(font.querySelectorAll('optgroup'));
    expect(groups.map((group) => group.getAttribute('label'))).toEqual(['Classic', 'Sans', 'Display', 'Mono', 'Handwritten', 'Serif']);
    for (const group of groups) expect(group.querySelectorAll('option').length).toBeGreaterThan(0);
    editor.destroy();
  });

  it('filters weight options to the selected font and clamps the current weight', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const font = app.querySelector<HTMLSelectElement>('#line1-font')!;
    const weight = app.querySelector<HTMLSelectElement>('#line1-weight')!;
    expect(Array.from(weight.options).map(({ value }) => value)).toEqual(['400', '500', '600', '700']);
    font.value = 'bebas-neue'; font.dispatchEvent(new Event('change', { bubbles: true }));
    expect(Array.from(weight.options).map(({ value }) => value)).toEqual(['400']);
    expect(weight.value).toBe('400');
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('ft1=bebas-neue');
    expect((app.querySelector('#preview-root .clock-line') as HTMLElement).style.fontFamily).toContain('Bebas Neue');
    font.value = 'lato'; font.dispatchEvent(new Event('change', { bubbles: true }));
    expect(Array.from(weight.options).map(({ value }) => value)).toEqual(['400', '700']);
    font.value = 'system'; font.dispatchEvent(new Event('change', { bubbles: true }));
    expect(Array.from(weight.options).map(({ value }) => value)).toEqual(['400', '500', '600', '700']);
    editor.destroy();
  });

  it('labels format presets with a readable description and their exact format', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const options = Array.from(app.querySelector<HTMLSelectElement>('#line1-format-preset')!.options);

    expect(options.find(({ value }) => value === 'HH:mm:ss')?.textContent).toBe('24-hour with seconds — HH:mm:ss');
    expect(options.find(({ value }) => value === 'h:mm a')?.textContent).toBe('12-hour — h:mm a');
    expect(options.find(({ value }) => value === 'M/D/YYYY')?.textContent).toBe('Numeric date — M/D/YYYY');
    expect(options.find(({ value }) => value === "HH:mm 'UTC'")?.textContent).toBe("UTC label — HH:mm 'UTC'");
    editor.destroy();
  });

  it('offers a 12-hour format preset with seconds', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const preset = app.querySelector<HTMLSelectElement>('#line1-format-preset')!;
    expect(Array.from(preset.options).map(({ value }) => value)).toContain('h:mm:ss a');

    preset.value = 'h:mm:ss a'; preset.dispatchEvent(new Event('change', { bubbles: true }));

    expect((app.querySelector('#line1-format') as HTMLInputElement).value).toBe('h:mm:ss a');
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('f1=h%3Amm%3Ass+a');
    editor.destroy();
  });

  it('offers a seconds-free 24-hour format preset', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const preset = app.querySelector<HTMLSelectElement>('#line1-format-preset')!;
    expect(Array.from(preset.options).map(({ value }) => value)).toContain('HH:mm');

    preset.value = 'HH:mm'; preset.dispatchEvent(new Event('change', { bubbles: true }));

    expect((app.querySelector('#line1-format') as HTMLInputElement).value).toBe('HH:mm');
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('f1=HH%3Amm');
    expect(preset.value).toBe('HH:mm');
    editor.destroy();
  });

  it('offers a compact date format preset', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const preset = app.querySelector<HTMLSelectElement>('#line2-format-preset')!;
    expect(Array.from(preset.options).map(({ value }) => value)).toContain('ddd, MMM D');

    preset.value = 'ddd, MMM D'; preset.dispatchEvent(new Event('change', { bubbles: true }));

    expect((app.querySelector('#line2-format') as HTMLInputElement).value).toBe('ddd, MMM D');
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('f2=ddd%2C+MMM+D');
    editor.destroy();
  });

  it('offers a numeric month/day/year date format preset', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const preset = app.querySelector<HTMLSelectElement>('#line2-format-preset')!;
    expect(Array.from(preset.options).map(({ value }) => value)).toContain('M/D/YYYY');

    preset.value = 'M/D/YYYY'; preset.dispatchEvent(new Event('change', { bubbles: true }));

    expect((app.querySelector('#line2-format') as HTMLInputElement).value).toBe('M/D/YYYY');
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('f2=M%2FD%2FYYYY');
    expect(preset.value).toBe('M/D/YYYY');
    editor.destroy();
  });

  it('keeps each format preset indicator synchronized with the active format', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const preset = app.querySelector<HTMLSelectElement>('#preset')!;
    preset.value = 'Gameplay'; preset.dispatchEvent(new Event('change', { bubbles: true }));
    expect((app.querySelector('#line1-format-preset') as HTMLSelectElement).value).toBe('HH:mm:ss');
    expect((app.querySelector('#line2-format-preset') as HTMLSelectElement).value).toBe('ddd, MMM D');

    const format = app.querySelector<HTMLInputElement>('#line1-format')!;
    format.value = "HH:mm 'LIVE'"; format.dispatchEvent(new Event('input', { bubbles: true }));
    const linePreset = app.querySelector<HTMLSelectElement>('#line1-format-preset')!;
    expect(linePreset.value).toBe('');
    expect(linePreset.selectedIndex).toBe(0);
    expect(linePreset.selectedOptions[0]?.textContent).toBe('Custom');

    linePreset.value = 'h:mm a'; linePreset.dispatchEvent(new Event('change', { bubbles: true }));
    expect(preset.value).toBe('Custom');
    expect(linePreset.value).toBe('h:mm a');
    editor.destroy();
  });

  it('rejects invalid formats without replacing the last preview', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app); const before = app.querySelector('#preview-root')?.textContent;
    const format = app.querySelector<HTMLInputElement>('#line1-format')!; format.value = 'HH:mm X'; format.dispatchEvent(new Event('input', { bubbles: true }));
    expect(app.querySelector('#line1-error')?.textContent).toContain('Unsupported'); expect(app.querySelector('#preview-root')?.textContent).toBe(before); editor.destroy();
  });
  it('rejects empty global numeric controls without changing preview or URL', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const gap = app.querySelector<HTMLInputElement>('#gap')!;
    const beforeUrl = (app.querySelector('#obs-url') as HTMLInputElement).value;
    const beforeGap = (app.querySelector('.clock-content') as HTMLElement).style.gap;
    gap.value = ''; gap.dispatchEvent(new Event('input', { bubbles: true }));
    expect(gap.validity.valid).toBe(false);
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toBe(beforeUrl);
    expect((app.querySelector('.clock-content') as HTMLElement).style.gap).toBe(beforeGap);
    editor.destroy();
  });
  it('rejects out-of-range line numeric controls without changing preview or URL', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const size = app.querySelector<HTMLInputElement>('#line1-size')!;
    const beforeUrl = (app.querySelector('#obs-url') as HTMLInputElement).value;
    const beforeSize = (app.querySelector('.clock-line') as HTMLElement).style.fontSize;
    size.value = '241'; size.dispatchEvent(new Event('input', { bubbles: true }));
    expect(size.validity.valid).toBe(false);
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toBe(beforeUrl);
    expect((app.querySelector('.clock-line') as HTMLElement).style.fontSize).toBe(beforeSize);
    editor.destroy();
  });
  it('searches and keyboard-selects a canonical timezone while storing only its ID', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const timezone = app.querySelector<HTMLInputElement>('#timezone')!;
    expect(timezone.getAttribute('role')).toBe('combobox');
    expect(timezone.getAttribute('aria-controls')).toBe('timezone-options');
    timezone.value = 'kathmandu'; timezone.dispatchEvent(new Event('input', { bubbles: true }));
    expect(app.querySelector('[role="option"]')?.textContent).toContain('Asia/Kathmandu');
    timezone.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    timezone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(timezone.value).toBe('Asia/Kathmandu');
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('tz=Asia%2FKathmandu');
    expect(app.querySelector('#timezone-error')?.textContent).toBe('');
    editor.destroy();
  });
  it('rejects arbitrary timezone text and preserves the last valid URL and preview', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const timezone = app.querySelector<HTMLInputElement>('#timezone')!;
    const beforeUrl = (app.querySelector('#obs-url') as HTMLInputElement).value;
    const beforePreview = app.querySelector('#preview-root')?.textContent;
    timezone.value = 'Not/A_Zone'; timezone.dispatchEvent(new Event('change', { bubbles: true }));
    expect(app.querySelector('#timezone-error')?.textContent).toContain('Choose a timezone');
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toBe(beforeUrl);
    expect(app.querySelector('#preview-root')?.textContent).toBe(beforePreview);
    editor.destroy();
  });
  it('reports catalog zones unavailable in the current browser and preserves valid config', () => {
    const Original = Intl.DateTimeFormat;
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(((locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) => {
      if (options?.timeZone === 'Pacific/Chatham') throw new RangeError('unsupported');
      return new Original(locales, options);
    }) as typeof Intl.DateTimeFormat);
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const timezone = app.querySelector<HTMLInputElement>('#timezone')!;
    const beforeUrl = (app.querySelector('#obs-url') as HTMLInputElement).value;
    timezone.value = 'Pacific/Chatham'; timezone.dispatchEvent(new Event('change', { bubbles: true }));
    expect(app.querySelector('#timezone-error')?.textContent).toContain('not supported');
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toBe(beforeUrl);
    editor.destroy(); vi.restoreAllMocks();
  });
  it('selects a timezone option through click activation', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const timezone = app.querySelector<HTMLInputElement>('#timezone')!;
    timezone.value = 'mexico city'; timezone.dispatchEvent(new Event('input', { bubbles: true }));
    const option = app.querySelector<HTMLElement>('[role="option"]')!;
    expect(option.textContent).toContain('America/Mexico_City');
    option.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(timezone.value).toBe('America/Mexico_City');
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('tz=America%2FMexico_City');
    expect(app.querySelector('#timezone-error')?.textContent).toBe('');
    editor.destroy();
  });

  it('clears stale active descendants when timezone search results are rebuilt', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const timezone = app.querySelector<HTMLInputElement>('#timezone')!;
    timezone.value = 'america'; timezone.dispatchEvent(new Event('input', { bubbles: true }));
    timezone.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(timezone.getAttribute('aria-activedescendant')).toBeTruthy();

    timezone.value = 'america new'; timezone.dispatchEvent(new Event('input', { bubbles: true }));
    expect(timezone.hasAttribute('aria-activedescendant')).toBe(false);
    expect(timezone.getAttribute('aria-expanded')).toBe('true');

    timezone.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(timezone.getAttribute('aria-activedescendant')).toBeTruthy();
    timezone.value = 'definitely no timezone'; timezone.dispatchEvent(new Event('input', { bubbles: true }));
    expect(timezone.hasAttribute('aria-activedescendant')).toBe(false);
    expect(timezone.getAttribute('aria-expanded')).toBe('false');
    editor.destroy();
  });

  it('loads an existing OBS URL and supports Enter submission', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const existing = app.querySelector<HTMLInputElement>('#existing-obs-url')!;
    expect(app.querySelector('label[for="existing-obs-url"]')?.textContent).toContain('Load existing');
    existing.value = 'https://obs-clock-widget.pages.dev/v1/clock/#v=1&tz=Asia%2FKathmandu&f1=HH%3Amm';
    existing.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect((app.querySelector('#timezone') as HTMLInputElement).value).toBe('Asia/Kathmandu');
    expect((app.querySelector('#line1-format') as HTMLInputElement).value).toBe('HH:mm');
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('tz=Asia%2FKathmandu&f1=HH%3Amm');
    expect(location.hash).toBe('#v=1&tz=Asia%2FKathmandu&f1=HH%3Amm');
    expect(app.querySelector('#import-status')?.textContent).toBe('Existing OBS URL loaded.');
    editor.destroy();
  });

  it('preserves editor state after a failed import', () => {
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const format = app.querySelector<HTMLInputElement>('#line1-format')!;
    format.value = 'HH:mm'; format.dispatchEvent(new Event('input', { bubbles: true }));
    const before = {
      format: format.value,
      timezone: (app.querySelector('#timezone') as HTMLInputElement).value,
      preview: app.querySelector('#preview-root')?.textContent,
      hash: location.hash,
      url: (app.querySelector('#obs-url') as HTMLInputElement).value,
    };
    const existing = app.querySelector<HTMLInputElement>('#existing-obs-url')!;
    existing.value = '#v=1&tz=UTC&tz=UTC';
    (app.querySelector('#load-existing') as HTMLButtonElement).click();

    expect({
      format: format.value,
      timezone: (app.querySelector('#timezone') as HTMLInputElement).value,
      preview: app.querySelector('#preview-root')?.textContent,
      hash: location.hash,
      url: (app.querySelector('#obs-url') as HTMLInputElement).value,
    }).toEqual(before);
    expect(app.querySelector('#import-status')?.textContent).toContain('could not be loaded');
    expect(app.querySelector('#import-status')?.textContent).not.toContain('duplicate-key');
    expect(existing.getAttribute('aria-invalid')).toBe('true');

    existing.value = '#v=1'; existing.dispatchEvent(new Event('input', { bubbles: true }));
    expect(existing.hasAttribute('aria-invalid')).toBe(false);
    expect(app.querySelector('#import-status')?.textContent).toBe('');
    editor.destroy();
  });

  it('copies setup text with the selected OBS Browser Source size', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const size = app.querySelector<HTMLSelectElement>('#obs-size')!;
    expect(Array.from(size.options).map(({ value }) => value)).toEqual(['1920 × 300', '800 × 240']);
    size.value = '800 × 240'; size.dispatchEvent(new Event('change', { bubbles: true }));
    (app.querySelector('#copy-setup') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Size: 800 × 240')));
    expect(app.querySelector('#copy-status')?.textContent).toBe('Setup text copied.');
    editor.destroy();
  });

  it('waits for fonts and settled layout before warning about named line clipping at the selected OBS size', async () => {
    let releaseFonts!: () => void;
    const fontsReady = new Promise<void>((resolve) => { releaseFonts = resolve; });
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: fontsReady } });
    const rect = (left: number, top: number, right: number, bottom: number): DOMRect => ({
      left, top, right, bottom, width: right - left, height: bottom - top, x: left, y: top, toJSON: () => ({}),
    });
    const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.matches('[data-clock-measurement]')) return rect(0, 0, 800, 240);
      if (this.matches('[data-clock-measurement] .clock-line:first-child')) return rect(20, 20, 980, 180);
      if (this.matches('[data-clock-measurement] .clock-line:nth-child(2)')) return rect(20, 185, 300, 220);
      return rect(0, 0, 320, 180);
    });
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(0); return 1; });
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    const size = app.querySelector<HTMLSelectElement>('#obs-size')!;
    size.value = '800 × 240'; size.dispatchEvent(new Event('change', { bubbles: true }));

    expect(app.querySelector('#clipping-warning')?.textContent).toBe('');
    releaseFonts();
    await vi.waitFor(() => expect(app.querySelector('#clipping-warning')?.textContent).toContain('Line 1'));
    expect(app.querySelector('#clipping-warning')?.textContent).toContain('shorten its format');
    expect((app.querySelector('#obs-url') as HTMLInputElement).value).toContain('/v1/clock/');

    editor.destroy(); bounds.mockRestore(); raf.mockRestore();
    Object.defineProperty(document, 'fonts', { configurable: true, value: undefined });
  });

  it('marks immediate copies pending instead of reusing stale clock clipping results', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const rect = (left: number, top: number, right: number, bottom: number): DOMRect => ({
      left, top, right, bottom, width: right - left, height: bottom - top, x: left, y: top, toJSON: () => ({}),
    });
    const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.matches('[data-clock-measurement]')) return rect(0, 0, 800, 240);
      if (this.matches('[data-clock-measurement] .clock-line:first-child')) return this.textContent?.includes('A') ? rect(-20, 0, 980, 260) : rect(20, 20, 300, 100);
      return rect(20, 110, 300, 180);
    });
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(0); return 1; });
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve() } });
    const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    await vi.waitFor(() => expect(app.querySelector('#clipping-warning')?.textContent).toBe(''));

    let releaseFonts!: () => void;
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: new Promise<void>((resolve) => { releaseFonts = resolve; }) } });
    const format = app.querySelector<HTMLInputElement>('#line1-format')!;
    format.value = `'${'A'.repeat(62)}'`; format.dispatchEvent(new Event('input', { bubbles: true }));
    (app.querySelector('#copy-url') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(app.querySelector('#copy-status')?.textContent).toContain('wait for the clipping check'));
    releaseFonts();
    await vi.waitFor(() => expect(app.querySelector('#clipping-warning')?.textContent).toContain('Line 1'));

    let releaseRecovery!: () => void;
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: new Promise<void>((resolve) => { releaseRecovery = resolve; }) } });
    format.value = 'HH:mm'; format.dispatchEvent(new Event('input', { bubbles: true }));
    (app.querySelector('#copy-url') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(app.querySelector('#copy-status')?.textContent).toContain('wait for the clipping check'));
    expect(app.querySelector('#copy-status')?.textContent).not.toContain('fix the clipping warning');
    releaseRecovery();

    editor.destroy(); bounds.mockRestore(); raf.mockRestore();
    Object.defineProperty(document, 'fonts', { configurable: true, value: undefined });
  });

  it('reports clipboard success', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } }); const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    (app.querySelector('#copy-url') as HTMLButtonElement).click(); await vi.waitFor(() => expect(app.querySelector('#copy-status')?.textContent).toBe('OBS URL copied.')); editor.destroy();
  });
});
