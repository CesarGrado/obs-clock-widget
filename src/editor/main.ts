import '../config/fonts';
import '../styles/base.css';
import '../styles/editor.css';
import '../styles/clock.css';
import { decodeConfig, URL_WARNING_LENGTH, widgetUrl } from '../config/codec';
import { DEFAULT_CONFIG, LOCALES, type ClockConfig, type ClockLine } from '../config/defaults';
import { FONTS, FONT_CATEGORIES, clampWeight, fontById } from '../config/fonts';
import { isCatalogTimezone, isTimezoneSupported, searchTimezones, type TimezoneId } from '../timezones/catalog';
import { cloneClockConfig } from '../config/clone';
import { PRESETS } from '../config/presets';
import { renderClock } from '../clock/renderer';
import { validateFormat } from '../time/format';
import { parseConfigImport } from '../config/import';
import { isAbsoluteIsoTarget } from '../time/countdown';
import { resolveTimezoneOffsetMs } from './tz';

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag); Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value)); if (text !== undefined) node.textContent = text; return node;
};
const labeled = (parent: HTMLElement, label: string, control: HTMLElement) => { parent.append(element('label', { for: control.id }, label), control); };
const option = (value: string, label = value) => element('option', { value }, label);
const fontSelect = (id: string) => { const node = element('select', { id }); FONT_CATEGORIES.forEach((category) => { const group = element('optgroup', { label: category }); FONTS.filter((font) => font.category === category).forEach((font) => group.append(option(font.id, font.label))); node.append(group); }); return node; };
const select = (id: string, values: readonly string[]) => { const node = element('select', { id }); values.forEach((value) => node.append(option(value))); return node; };
const input = (id: string, type: string, min?: number, max?: number, step?: number) => element('input', { id, type, ...(type === 'number' ? { required: '' } : {}), ...(min === undefined ? {} : { min: String(min) }), ...(max === undefined ? {} : { max: String(max) }), ...(step === undefined ? {} : { step: String(step) }) });


const FORMAT_PRESETS = [
  ['', 'Custom'],
  ['HH:mm:ss', '24-hour with seconds — HH:mm:ss'],
  ['HH:mm', '24-hour — HH:mm'],
  ['h:mm:ss a', '12-hour with seconds — h:mm:ss a'],
  ['h:mm a', '12-hour — h:mm a'],
  ['M/D/YYYY', 'Numeric date — M/D/YYYY'],
  ['ddd, MMM D', 'Compact date — ddd, MMM D'],
  ['dddd, MMMM D, YYYY', 'Full date — dddd, MMMM D, YYYY'],
  ["HH:mm 'UTC'", "UTC label — HH:mm 'UTC'"],
] as const;

function buildLine(parent: HTMLElement, n: number) {
  const section = element('fieldset'); section.append(element('legend', {}, `Line ${n}`));
  const enabled = input(`line${n}-enabled`, 'checkbox'); labeled(section, 'Enabled', enabled);
  const presets = element('select', { id: `line${n}-format-preset` }); FORMAT_PRESETS.forEach(([value, label]) => presets.append(option(value, label))); labeled(section, 'Format preset', presets);
  const format = input(`line${n}-format`, 'text'); format.maxLength = 64; format.setAttribute('aria-describedby', `line${n}-error token-help`); labeled(section, 'Format', format);
  section.append(element('p', { id: `line${n}-error`, class: 'error', role: 'alert' }));
  labeled(section, 'Font', fontSelect(`line${n}-font`)); labeled(section, 'Size (px)', input(`line${n}-size`, 'number', 10, 240, 1));
  labeled(section, 'Weight', element('select', { id: `line${n}-weight` })); labeled(section, 'Color', input(`line${n}-color`, 'color'));
  labeled(section, 'Opacity', input(`line${n}-opacity`, 'range', 0, 1, .05)); labeled(section, 'Transform', select(`line${n}-transform`, ['none','uppercase','lowercase'])); parent.append(section);
}

function buildEditor(app: HTMLElement) {
  const header = element('header'); header.append(element('p', { class: 'eyebrow' }, 'OBS BROWSER SOURCE'), element('h1', {}, 'Clock Overlay Studio'), element('p', {}, 'Design a transparent two-line clock, then copy its permanent URL into OBS.'), element('p', { class: 'scene-link' }, '')); (header.lastChild as HTMLElement).append(element('a', { href: '/scene-editor/' }, 'Need a full starting-soon scene? Build one →'));
  const layout = element('div', { class: 'editor-layout' }); const panel = element('section', { class: 'controls', 'aria-label': 'Clock settings' });
  const global = element('fieldset'); global.append(element('legend', {}, 'Preset, time & appearance'));
  const preset = select('preset', ['Custom', ...Object.keys(PRESETS)]); labeled(global, 'Preset', preset);
  const modeCards = element('div', { id: 'mode-cards', class: 'mode-cards', role: 'radiogroup', 'aria-label': 'Widget mode' });
  const modeCard = (value: 'clock' | 'countdown', title: string, hint: string) => {
    const radio = element('input', { type: 'radio', id: `mode-${value}`, name: 'mode', value, class: 'mode-radio', 'aria-label': title });
    const card = element('label', { for: `mode-${value}`, class: 'mode-card' });
    card.append(radio, element('span', { class: 'mode-card-title' }, title), element('span', { class: 'mode-card-hint' }, hint));
    return card;
  };
  modeCards.append(modeCard('clock', 'Clock', 'Shows the current time'), modeCard('countdown', 'Countdown', 'Counts down to a moment you pick'));
  global.append(modeCards);
  const countdownSetup = element('fieldset', { id: 'countdown-setup', class: 'countdown-setup' });
  countdownSetup.append(element('legend', {}, 'Countdown'));
  countdownSetup.append(element('p', { id: 'countdown-help', class: 'help' }, 'Pick when your countdown ends — quick minutes from now, or a specific date and time.'));
  const quick = element('div', { id: 'countdown-quick', class: 'quick-buttons', role: 'group', 'aria-label': 'Quick durations' });
  [5, 10, 15, 30, 60].forEach((minutes) => quick.append(element('button', { type: 'button', class: 'quick-button', id: `quick-${minutes}`, 'data-minutes': String(minutes) }, `${minutes} min`)));
  countdownSetup.append(quick);
  const schedule = element('div', { class: 'schedule-row' });
  const scheduleDate = input('countdown-date', 'date'); const scheduleTime = input('countdown-time', 'time'); scheduleTime.setAttribute('step', '60');
  labeled(schedule, 'Ends on', scheduleDate); labeled(schedule, 'At', scheduleTime); labeled(schedule, 'Timezone', element('output', { id: 'countdown-timezone', class: 'timezone-note', for: 'timezone' }));
  countdownSetup.append(schedule, element('p', { id: 'resolved-target', class: 'resolved-summary', 'aria-live': 'polite' }), element('p', { id: 'countdown-error', class: 'error', role: 'alert' }));
  const postZero = element('fieldset', { class: 'post-zero' }); postZero.append(element('legend', {}, 'When it reaches zero'));
  postZero.append(element('label', { for: 'post-zero-clock' }, 'Return to clock after 5 seconds'), element('input', { type: 'radio', id: 'post-zero-clock', name: 'post-zero', value: 'clock', class: 'post-zero-radio', checked: '' }));
  postZero.append(element('label', { for: 'post-zero-overtime' }, 'Continue counting up'), element('input', { type: 'radio', id: 'post-zero-overtime', name: 'post-zero', value: 'overtime', class: 'post-zero-radio' }));
  countdownSetup.append(postZero);
  const advanced = element('details', { id: 'countdown-advanced', class: 'advanced' });
  advanced.append(element('summary', {}, 'Advanced: edit exact end time'));
  const target = input('countdown-target', 'text'); target.maxLength = 32; target.placeholder = '2026-08-23T18:30:00Z'; target.setAttribute('aria-describedby', 'countdown-advanced-help countdown-error resolved-target');
  labeled(advanced, 'Target (ISO 8601)', target);
  advanced.append(element('p', { id: 'countdown-advanced-help', class: 'help' }, 'Technical users only: absolute time ending in Z or an explicit offset, up to 99 days ahead. Paste this to recover or share an exact end time.'));
  countdownSetup.append(advanced);
  global.append(countdownSetup);
  const timezoneWrap = element('div', { class: 'timezone-picker' });
  const timezone = input('timezone', 'text');
  timezone.setAttribute('role', 'combobox'); timezone.setAttribute('autocomplete', 'off'); timezone.setAttribute('aria-autocomplete', 'list'); timezone.setAttribute('aria-controls', 'timezone-options'); timezone.setAttribute('aria-expanded', 'false'); timezone.setAttribute('aria-describedby', 'timezone-help timezone-error');
  timezoneWrap.append(timezone, element('div', { id: 'timezone-options', class: 'timezone-options', role: 'listbox' }));
  global.append(element('label', { for: 'timezone' }, 'Timezone'), timezoneWrap, element('p', { id: 'timezone-help', class: 'help' }, 'Search by city, region, canonical ID, or UTC offset.'), element('p', { id: 'timezone-error', class: 'error', role: 'alert' }));
  labeled(global, 'Locale', select('locale', LOCALES));
  labeled(global, 'Alignment', select('align', ['left','center','right'])); labeled(global, 'Line gap', input('gap', 'number', 0, 80)); labeled(global, 'Stroke', input('stroke', 'number', 0, 8)); labeled(global, 'Shadow', input('shadow', 'number', 0, 30)); panel.append(global);
  buildLine(panel, 1); buildLine(panel, 2); panel.append(element('button', { id: 'swap-lines', type: 'button', class: 'secondary' }, 'Swap lines'), element('button', { id: 'match-line2-style', type: 'button', class: 'secondary' }, 'Match Line 2 style to Line 1'), element('button', { id: 'match-line1-style', type: 'button', class: 'secondary' }, 'Match Line 1 style to Line 2'), element('p', { id: 'token-help', class: 'help' }, "Tokens: HH H h mm m ss s a, dddd ddd, MMMM MMM M, D, YYYY YY. Put literal text in 'single quotes'."));
  const output = element('fieldset'); output.append(element('legend', {}, 'Output'));
  const obsSize = select('obs-size', ['1920 × 300', '800 × 240']); labeled(output, 'OBS Browser Source size', obsSize);
  const url = input('obs-url', 'text'); url.readOnly = true; labeled(output, 'OBS URL', url);
  const importForm = element('form', { class: 'import-existing', novalidate: '' }); const existingUrl = input('existing-obs-url', 'text'); existingUrl.maxLength = 4096; existingUrl.setAttribute('autocomplete', 'off'); existingUrl.setAttribute('aria-describedby', 'import-help import-status');
  importForm.append(element('label', { for: 'existing-obs-url' }, 'Load existing OBS URL or fragment'), existingUrl, element('button', { id: 'load-existing', type: 'submit' }, 'Load'));
  output.append(importForm, element('p', { id: 'import-help', class: 'help' }, 'Paste a generated /v1/clock/ URL, or its fragment beginning with v=1 or #v=1.'), element('p', { id: 'import-status', role: 'status', 'aria-live': 'polite' }));
  const actions = element('div', { class: 'actions' }); actions.append(element('button', { id: 'copy-url', type: 'button' }, 'Copy OBS URL'), element('button', { id: 'copy-setup', type: 'button' }, 'Copy setup text'), element('button', { id: 'open-preview', type: 'button' }, 'Open widget preview'), element('button', { id: 'reset', type: 'button', class: 'secondary' }, 'Reset'), element('button', { id: 'undo-reset', type: 'button', class: 'secondary', disabled: '' }, 'Undo reset'));
  output.append(actions, element('p', { id: 'copy-status', role: 'status', 'aria-live': 'polite' }), element('p', { id: 'url-warning', class: 'warning' })); panel.append(output);
  const help = element('section', { class: 'instructions' }); help.append(element('h2', {}, 'Add to OBS'), element('ol'));
  const steps = ['Sources → + → Browser; create “Stream Clock”.','Paste the generated URL.','Use 1920 × 300 (or 800 × 240 for compact presets).','Leave custom CSS empty.','Leave “Shutdown source when not visible” and “Refresh browser when scene becomes active” off for uninterrupted operation.']; steps.forEach((step) => help.querySelector('ol')!.append(element('li', {}, step)));
  help.append(element('p', { class: 'privacy' }, 'Anyone with this URL can view its visual settings. Do not enter secrets or personal information. No settings are stored or tracked.')); panel.append(help);
  const previewPanel = element('section', { class: 'preview-panel', 'aria-label': 'Live preview' }); const previewHead = element('div', { class: 'preview-head' });
  const backdrop = select('backdrop', ['checkerboard','dark','light']); backdrop.setAttribute('aria-label', 'Preview backdrop'); previewHead.append(element('h2', {}, 'Live preview'), backdrop);
  const stage = element('div', { id: 'preview-stage', class: 'preview-stage checkerboard' }); stage.append(element('div', { id: 'preview-root' })); previewPanel.append(previewHead, stage, element('p', { id: 'empty-warning', class: 'warning' }));
  layout.append(panel, previewPanel); app.append(header, layout);
}

export function initEditor(app: HTMLElement): { destroy: () => void; applyConfig: (next: ClockConfig) => void } {
  buildEditor(app); let config = location.hash ? decodeConfig(location.hash) : cloneClockConfig(DEFAULT_CONFIG); let resetSnapshot: typeof config | undefined; let clock: ReturnType<typeof renderClock> | undefined;
  const byId = <T extends HTMLElement>(id: string) => app.querySelector<T>(`#${id}`)!;
  const weightOptions = (n: number, fontId: string, weight: number) => {
    const control = byId<HTMLSelectElement>(`line${n}-weight`);
    control.replaceChildren(...(fontById(fontId)?.weights ?? [400, 500, 600, 700]).map((value) => option(String(value))));
    control.value = String(clampWeight(fontId, weight));
  };
  const syncFormatPreset = (n: number, format: string) => { const preset = byId<HTMLSelectElement>(`line${n}-format-preset`); preset.value = Array.from(preset.options).some(({ value }) => value === format) ? format : ''; };
  const targetToDateTime = (iso: string) => {
    const date = new Date(iso); if (Number.isNaN(date.getTime())) return;
    const timeZone = config.timezone === 'local' ? undefined : config.timezone;
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
    byId<HTMLInputElement>('countdown-date').value = `${get('year')}-${get('month')}-${get('day')}`;
    byId<HTMLInputElement>('countdown-time').value = `${get('hour')}:${get('minute')}`;
  };
  const sync = () => {
    (byId<HTMLInputElement>('mode-clock')).checked = config.mode === 'clock'; (byId<HTMLInputElement>('mode-countdown')).checked = config.mode === 'countdown';
    const targetInput = byId<HTMLInputElement>('countdown-target');
    targetInput.value = config.countdownTarget;
    // A synchronized config is by definition valid: clear any stale manual-entry error state.
    targetInput.removeAttribute('aria-invalid');
    byId('countdown-error').textContent = '';
    if (config.mode === 'countdown' && config.countdownTarget) targetToDateTime(config.countdownTarget);
    byId<HTMLInputElement>('post-zero-clock').checked = !config.overtime; byId<HTMLInputElement>('post-zero-overtime').checked = config.overtime;
    byId('countdown-setup').hidden = config.mode !== 'countdown';
    byId('countdown-timezone').textContent = config.timezone === 'local' ? 'This device' : config.timezone;
    app.querySelectorAll<HTMLLabelElement>('.mode-card').forEach((card) => card.classList.toggle('active', card.querySelector('input')?.checked === true));
    byId<HTMLInputElement>('timezone').value = config.timezone; byId<HTMLSelectElement>('locale').value = config.locale; byId<HTMLSelectElement>('align').value = config.align;
    byId<HTMLInputElement>('gap').value = String(config.gap); byId<HTMLInputElement>('stroke').value = String(config.stroke); byId<HTMLInputElement>('shadow').value = String(config.shadow);
    config.lines.forEach((line, i) => { const n = i + 1; byId<HTMLInputElement>(`line${n}-enabled`).checked = line.enabled; byId<HTMLInputElement>(`line${n}-format`).value = line.format; syncFormatPreset(n, line.format);
      byId<HTMLSelectElement>(`line${n}-font`).value = line.font; byId<HTMLInputElement>(`line${n}-size`).value = String(line.size); weightOptions(n, line.font, line.weight);
      byId<HTMLInputElement>(`line${n}-color`).value = line.color.slice(0, 7).toLowerCase(); byId<HTMLInputElement>(`line${n}-opacity`).value = String(line.opacity); byId<HTMLSelectElement>(`line${n}-transform`).value = line.transform; });
  };
  const refreshSummary = () => {
    const resolved = byId('resolved-target');
    if (config.mode === 'countdown' && isAbsoluteIsoTarget(config.countdownTarget)) {
      const lang = config.locale === 'auto' ? undefined : config.locale; const timeZone = config.timezone === 'local' ? undefined : config.timezone;
      const end = new Date(config.countdownTarget);
      const when = new Intl.DateTimeFormat(lang, { weekday: 'long', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone }).format(end);
      const totalSeconds = Math.round((end.getTime() - Date.now()) / 1000);
      const minutesLeft = Math.round(totalSeconds / 60);
      const remaining = totalSeconds > 0 ? (minutesLeft >= 1 ? `${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}` : `${totalSeconds} seconds`) : 'It has ended';
      resolved.textContent = `Ends ${when} · ${remaining}${totalSeconds > 0 ? ' remaining' : ''}`;
    } else resolved.textContent = '';
  };
  let summaryTimer: number | undefined;
  const clearSummaryTimer = () => {
    if (summaryTimer !== undefined) { window.clearTimeout(summaryTimer); window.clearInterval(summaryTimer); summaryTimer = undefined; }
  };
  const scheduleSummary = () => {
    clearSummaryTimer();
    if (config.mode !== 'countdown' || !isAbsoluteIsoTarget(config.countdownTarget)) return;
    const end = new Date(config.countdownTarget).getTime();
    // Already expired: render the final text once; no timer needed.
    if (end <= Date.now()) { refreshSummary(); return; }
    // Tick on each whole minute boundary of the remaining time so the summary stays current.
    const firstDelay = Math.max((end - Date.now()) % 60_000, 250);
    summaryTimer = window.setTimeout(() => {
      refreshSummary();
      if (Date.now() >= end) { summaryTimer = undefined; return; }
      summaryTimer = window.setInterval(() => {
        refreshSummary();
        if (Date.now() >= end) { window.clearInterval(summaryTimer); summaryTimer = undefined; }
      }, 60_000) as unknown as number;
    }, firstDelay) as unknown as number;
  };
  const refresh = () => {
    clock?.stop(); clock = renderClock(byId('preview-root'), config); const url = widgetUrl(config); byId<HTMLInputElement>('obs-url').value = url; history.replaceState(null, '', `#${url.split('#')[1]}`); byId('url-warning').textContent = url.length >= URL_WARNING_LENGTH ? 'This URL is unusually long; shorten format literals.' : ''; byId('empty-warning').textContent = config.lines.some((line) => line.enabled) ? '' : 'Both lines are disabled; the OBS widget will be fully transparent.';
    refreshSummary(); scheduleSummary();
  };
  const timezoneInput = byId<HTMLInputElement>('timezone'); const timezoneOptions = byId('timezone-options'); let activeTimezone = -1; let visibleTimezones: TimezoneId[] = [];
  const setCountdownTarget = (iso: string) => {
    config.countdownTarget = iso;
    const targetInput = byId<HTMLInputElement>('countdown-target');
    targetInput.value = iso; targetInput.removeAttribute('aria-invalid');
    targetToDateTime(iso);
    byId('countdown-error').textContent = '';
    byId<HTMLSelectElement>('preset').value = 'Custom';
    refresh();
  };
  const modeRadios = app.querySelectorAll<HTMLInputElement>('input[name="mode"]');
  modeRadios.forEach((radio) => radio.addEventListener('change', (event) => {
    config.mode = (event.target as HTMLInputElement).value as typeof config.mode;
    if (config.mode === 'countdown' && !config.countdownTarget) setCountdownTarget(new Date(Date.now() + 3_600_000).toISOString().replace('.000Z', 'Z'));
    if (config.mode === 'clock') { config.countdownTarget = ''; config.overtime = false; }
    byId<HTMLSelectElement>('preset').value = 'Custom'; sync(); refresh();
  }));
  app.querySelectorAll<HTMLButtonElement>('.quick-button').forEach((button) => button.addEventListener('click', () => {
    const minutes = Number(button.dataset.minutes);
    setCountdownTarget(new Date(Date.now() + minutes * 60_000).toISOString().replace('.000Z', 'Z'));
  }));
  const scheduleFromInputs = () => {
    const dateValue = byId<HTMLInputElement>('countdown-date').value; const timeValue = byId<HTMLInputElement>('countdown-time').value;
    if (!dateValue) return;
    const [year, month, day] = dateValue.split('-').map(Number); const [hour, minute] = (timeValue || '00:00').split(':').map(Number);
    const candidate = new Date(Date.UTC(year!, (month ?? 1) - 1, day!, hour ?? 0, minute ?? 0));
    const timeZone = config.timezone === 'local' ? undefined : config.timezone;
    // Enumerate plausible offsets around the wall time, keep instants that round-trip to the
    // exact selected wall time, and pick the EARLIEST — the explicit "first occurrence"
    // policy for DST fall-back overlaps. Zero candidates means a DST gap (rejected).
    const offsetFor = (instant: Date) => timeZone ? resolveTimezoneOffsetMs(instant, timeZone) : -instant.getTimezoneOffset() * 60_000;
    const backFmt = new Intl.DateTimeFormat('en-US', { ...(timeZone ? { timeZone } : {}), hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const roundTrips = (instant: Date) => {
      const parts = backFmt.formatToParts(instant); const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? '0');
      return get('year') === year && get('month') === month && get('day') === day && get('hour') % 24 === hour && get('minute') === minute;
    };
    const probes = [candidate.getTime() - 15 * 3_600_000, candidate.getTime(), candidate.getTime() + 15 * 3_600_000].map((ms) => offsetFor(new Date(ms)));
    const instants = [...new Set(probes)].map((offset) => new Date(candidate.getTime() - offset)).filter(roundTrips);
    if (instants.length === 0) {
      byId('countdown-error').textContent = 'That time does not exist because of a daylight-saving change in your timezone — pick 30 minutes earlier or later.';
      return;
    }
    const absolute = new Date(Math.min(...instants.map((instant) => instant.getTime())));
    const iso = `${absolute.toISOString().slice(0, 19)}Z`;
    if (!isAbsoluteIsoTarget(iso)) { byId('countdown-error').textContent = 'Pick a valid date and time for your countdown.'; return; }
    if (absolute.getTime() - Date.now() > 99 * 86_400_000) { byId('countdown-error').textContent = 'That time is more than 99 days away. Choose a closer end time.'; return; }
    setCountdownTarget(iso);
  };
  byId<HTMLInputElement>('countdown-date').addEventListener('change', scheduleFromInputs);
  byId<HTMLInputElement>('countdown-time').addEventListener('change', scheduleFromInputs);
  app.querySelectorAll<HTMLInputElement>('input[name="post-zero"]').forEach((radio) => radio.addEventListener('change', (event) => {
    config.overtime = (event.target as HTMLInputElement).value === 'overtime';
    byId<HTMLSelectElement>('preset').value = 'Custom'; refresh();
  }));
  byId<HTMLInputElement>('countdown-target').addEventListener('input', (event) => {
    const value = (event.target as HTMLInputElement).value.trim(); const error = byId('countdown-error');
    if (!isAbsoluteIsoTarget(value)) { (event.target as HTMLInputElement).setAttribute('aria-invalid', 'true'); error.textContent = 'Enter an exact end time with a Z or ±HH:mm offset (e.g. 2026-08-23T18:30:00Z).'; return; }
    if (Date.parse(value) - Date.now() > 99 * 86_400_000) { (event.target as HTMLInputElement).setAttribute('aria-invalid', 'true'); error.textContent = 'That time is more than 99 days away. Choose a closer end time.'; return; }
    (event.target as HTMLInputElement).removeAttribute('aria-invalid'); error.textContent = ''; config.countdownTarget = value; targetToDateTime(value); byId<HTMLSelectElement>('preset').value = 'Custom'; refresh();
  });
  const closeTimezoneOptions = () => { timezoneOptions.replaceChildren(); visibleTimezones = []; activeTimezone = -1; timezoneInput.setAttribute('aria-expanded', 'false'); timezoneInput.removeAttribute('aria-activedescendant'); };
  const chooseTimezone = (timezone: TimezoneId) => {
    if (!isTimezoneSupported(timezone)) { byId('timezone-error').textContent = 'This timezone is not supported by the current browser. Choose another timezone.'; closeTimezoneOptions(); return; }
    config.timezone = timezone; timezoneInput.value = timezone; byId('timezone-error').textContent = ''; byId<HTMLSelectElement>('preset').value = 'Custom'; closeTimezoneOptions(); if (config.mode === 'countdown' && config.countdownTarget) { targetToDateTime(config.countdownTarget); byId('countdown-timezone').textContent = timezone; } refresh();
  };
  const showTimezoneOptions = (query: string) => {
    const descriptions = searchTimezones(query); visibleTimezones = descriptions.map(({ id }) => id); activeTimezone = -1; timezoneInput.removeAttribute('aria-activedescendant'); timezoneOptions.replaceChildren();
    descriptions.forEach((description, index) => { const item = element('div', { id: `timezone-option-${index}`, role: 'option', class: 'timezone-option', 'aria-selected': 'false' }, description.display); item.addEventListener('mousedown', (event) => event.preventDefault()); item.addEventListener('click', () => chooseTimezone(description.id)); timezoneOptions.append(item); });
    timezoneInput.setAttribute('aria-expanded', String(descriptions.length > 0));
  };
  const validateTimezoneInput = () => {
    const candidate = timezoneInput.value.trim();
    if (!isCatalogTimezone(candidate)) { byId('timezone-error').textContent = 'Choose a timezone from the canonical timezone list.'; closeTimezoneOptions(); return; }
    chooseTimezone(candidate);
  };
  timezoneInput.addEventListener('input', () => { byId('timezone-error').textContent = ''; showTimezoneOptions(timezoneInput.value); });
  timezoneInput.addEventListener('change', validateTimezoneInput);
  timezoneInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { closeTimezoneOptions(); return; }
    if (event.key === 'Enter') { event.preventDefault(); if (activeTimezone >= 0) chooseTimezone(visibleTimezones[activeTimezone]!); else validateTimezoneInput(); return; }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault(); if (!visibleTimezones.length) showTimezoneOptions(timezoneInput.value); if (!visibleTimezones.length) return;
    activeTimezone = event.key === 'ArrowDown' ? Math.min(activeTimezone + 1, visibleTimezones.length - 1) : Math.max(activeTimezone - 1, 0);
    Array.from(timezoneOptions.children).forEach((child, index) => child.setAttribute('aria-selected', String(index === activeTimezone)));
    const activeOption = timezoneOptions.children[activeTimezone] as HTMLElement | undefined;
    if (activeOption && typeof activeOption.scrollIntoView === 'function') activeOption.scrollIntoView({ block: 'nearest' });
    timezoneInput.setAttribute('aria-activedescendant', `timezone-option-${activeTimezone}`);
  });
  timezoneInput.addEventListener('focus', () => showTimezoneOptions(timezoneInput.value === config.timezone ? '' : timezoneInput.value));
  timezoneInput.addEventListener('blur', () => { window.setTimeout(() => { if (document.activeElement !== timezoneInput) closeTimezoneOptions(); }, 0); });
  const lineControl = (n: number, field: keyof ClockLine, parse: (control: HTMLInputElement | HTMLSelectElement) => unknown) => { const control = byId<HTMLInputElement | HTMLSelectElement>(`line${n}-${field}`); const event = control instanceof HTMLInputElement && ['text','number','range'].includes(control.type) ? 'input' : 'change'; control.addEventListener(event, () => {
    if (!control.validity.valid) return;
    if (field === 'format') { const error = validateFormat(control.value); byId(`line${n}-error`).textContent = error ?? ''; if (error) return; syncFormatPreset(n, control.value); }
    (config.lines[n - 1] as unknown as Record<string, unknown>)[field] = parse(control);
    if (field === 'font') { const line = config.lines[n - 1]!; line.weight = clampWeight(line.font, line.weight); weightOptions(n, line.font, line.weight); }
    byId<HTMLSelectElement>('preset').value = 'Custom'; refresh();
  }); };
  [1,2].forEach((n) => { lineControl(n, 'enabled', (c) => (c as HTMLInputElement).checked); lineControl(n, 'format', (c) => c.value); lineControl(n, 'font', (c) => c.value); lineControl(n, 'size', (c) => Number(c.value)); lineControl(n, 'weight', (c) => Number(c.value)); lineControl(n, 'color', (c) => c.value.toUpperCase()); lineControl(n, 'opacity', (c) => Number(c.value)); lineControl(n, 'transform', (c) => c.value);
    byId<HTMLSelectElement>(`line${n}-format-preset`).addEventListener('change', (event) => { const value = (event.target as HTMLSelectElement).value; if (value) { byId<HTMLInputElement>(`line${n}-format`).value = value; config.lines[n - 1]!.format = value; byId<HTMLSelectElement>('preset').value = 'Custom'; refresh(); } }); });
  (['locale','align'] as const).forEach((key) => byId<HTMLSelectElement>(key).addEventListener('change', (event) => { (config as unknown as Record<string, unknown>)[key] = (event.target as HTMLSelectElement).value; refresh(); }));
  (['gap','stroke','shadow'] as const).forEach((key) => byId<HTMLInputElement>(key).addEventListener('input', (event) => { const control = event.target as HTMLInputElement; if (!control.validity.valid) return; config[key] = Number(control.value); refresh(); }));
  byId<HTMLSelectElement>('preset').addEventListener('change', (event) => { const chosen = PRESETS[(event.target as HTMLSelectElement).value]; if (chosen) { config = cloneClockConfig(chosen); sync(); refresh(); } });
  byId('swap-lines').addEventListener('click', () => { config.lines = [config.lines[1], config.lines[0]]; byId<HTMLSelectElement>('preset').value = 'Custom'; sync(); refresh(); });
  byId('match-line2-style').addEventListener('click', () => {
    const source = config.lines[0]; const target = config.lines[1];
    config.lines[1] = { ...target, font: source.font, size: source.size, weight: source.weight, color: source.color, opacity: source.opacity, transform: source.transform };
    byId<HTMLSelectElement>('preset').value = 'Custom'; sync(); refresh();
  });
  byId('match-line1-style').addEventListener('click', () => {
    const source = config.lines[1]; const target = config.lines[0];
    config.lines[0] = { ...target, font: source.font, size: source.size, weight: source.weight, color: source.color, opacity: source.opacity, transform: source.transform };
    byId<HTMLSelectElement>('preset').value = 'Custom'; sync(); refresh();
  });
  byId<HTMLSelectElement>('backdrop').addEventListener('change', (event) => { byId('preview-stage').className = `preview-stage ${(event.target as HTMLSelectElement).value}`; });
  const importForm = app.querySelector<HTMLFormElement>('.import-existing')!;
  const existingUrl = byId<HTMLInputElement>('existing-obs-url');
  importForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = parseConfigImport(existingUrl.value);
    if (!result.ok || !isTimezoneSupported(result.config.timezone)) {
      existingUrl.setAttribute('aria-invalid', 'true');
      byId('import-status').textContent = 'This URL could not be loaded. Check that it is an unmodified generated clock URL or fragment, then try again.';
      return;
    }
    existingUrl.removeAttribute('aria-invalid');
    config = result.config; byId<HTMLSelectElement>('preset').value = 'Custom'; byId('timezone-error').textContent = ''; sync(); refresh();
    byId('import-status').textContent = 'Existing OBS URL loaded.';
  });
  existingUrl.addEventListener('input', () => { existingUrl.removeAttribute('aria-invalid'); byId('import-status').textContent = ''; });
  existingUrl.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); importForm.requestSubmit(); } });
  byId('reset').addEventListener('click', () => {
    resetSnapshot = cloneClockConfig(config);
    config = cloneClockConfig(DEFAULT_CONFIG); byId<HTMLSelectElement>('preset').value = 'Custom'; sync(); refresh();
    byId<HTMLButtonElement>('undo-reset').disabled = false; byId('copy-status').textContent = 'Defaults restored. Undo is available.';
  });
  byId('undo-reset').addEventListener('click', () => {
    if (!resetSnapshot) return;
    config = resetSnapshot; resetSnapshot = undefined; byId<HTMLSelectElement>('preset').value = 'Custom'; sync(); refresh();
    byId<HTMLButtonElement>('undo-reset').disabled = true; byId('copy-status').textContent = 'Previous settings restored.';
  });
  const copy = async (text: string, success: string) => { try { await navigator.clipboard.writeText(text); byId('copy-status').textContent = success; } catch { byId('copy-status').textContent = 'Clipboard unavailable. Select and copy the URL field manually.'; byId<HTMLInputElement>('obs-url').select(); } };
  byId('copy-url').addEventListener('click', () => void copy(widgetUrl(config), 'OBS URL copied.')); byId('copy-setup').addEventListener('click', () => void copy(`OBS Browser Source\nURL: ${widgetUrl(config)}\nSize: ${byId<HTMLSelectElement>('obs-size').value}\nLeave custom CSS empty and both source lifecycle options off.`, 'Setup text copied.'));
  byId('open-preview').addEventListener('click', () => window.open(widgetUrl(config), '_blank', 'noopener'));
  sync(); refresh(); return { destroy: () => { clearSummaryTimer(); clock?.stop(); }, applyConfig: (next: ClockConfig) => { config = cloneClockConfig(next); resetSnapshot = undefined; byId<HTMLSelectElement>('preset').value = 'Custom'; sync(); refresh(); } };
}

const app = document.querySelector<HTMLElement>('#app'); if (app) initEditor(app);
