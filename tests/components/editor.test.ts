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

  it('reports clipboard success', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } }); const app = document.querySelector('#app') as HTMLElement; const editor = initEditor(app);
    (app.querySelector('#copy-url') as HTMLButtonElement).click(); await vi.waitFor(() => expect(app.querySelector('#copy-status')?.textContent).toBe('OBS URL copied.')); editor.destroy();
  });
});
