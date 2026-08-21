import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/montserrat/latin-400.css';
import '@fontsource/montserrat/latin-500.css';
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/latin-700.css';
import '@fontsource/roboto-mono/latin-400.css';
import '@fontsource/roboto-mono/latin-500.css';
import '@fontsource/roboto-mono/latin-600.css';
import '@fontsource/roboto-mono/latin-700.css';
import '../styles/base.css';
import '../styles/editor.css';
import '../styles/clock.css';
import { decodeConfig, URL_WARNING_LENGTH, widgetUrl } from '../config/codec';
import { DEFAULT_CONFIG, FONT_IDS, LOCALES, type ClockLine } from '../config/defaults';
import { isCatalogTimezone, isTimezoneSupported, searchTimezones, type TimezoneId } from '../timezones/catalog';
import { cloneClockConfig } from '../config/clone';
import { PRESETS } from '../config/presets';
import { renderClock } from '../clock/renderer';
import { validateFormat } from '../time/format';
import { parseConfigImport } from '../config/import';

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag); Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value)); if (text !== undefined) node.textContent = text; return node;
};
const labeled = (parent: HTMLElement, label: string, control: HTMLElement) => { parent.append(element('label', { for: control.id }, label), control); };
const option = (value: string, label = value) => element('option', { value }, label);
const select = (id: string, values: readonly string[]) => { const node = element('select', { id }); values.forEach((value) => node.append(option(value))); return node; };
const input = (id: string, type: string, min?: number, max?: number, step?: number) => element('input', { id, type, ...(type === 'number' ? { required: '' } : {}), ...(min === undefined ? {} : { min: String(min) }), ...(max === undefined ? {} : { max: String(max) }), ...(step === undefined ? {} : { step: String(step) }) });

function buildLine(parent: HTMLElement, n: number) {
  const section = element('fieldset'); section.append(element('legend', {}, `Line ${n}`));
  const enabled = input(`line${n}-enabled`, 'checkbox'); labeled(section, 'Enabled', enabled);
  const presets = select(`line${n}-format-preset`, ['', 'HH:mm:ss', 'h:mm a', 'dddd, MMMM D, YYYY', "HH:mm 'UTC'"]); presets.options[0]!.text = 'Custom'; labeled(section, 'Format preset', presets);
  const format = input(`line${n}-format`, 'text'); format.maxLength = 64; format.setAttribute('aria-describedby', `line${n}-error token-help`); labeled(section, 'Format', format);
  section.append(element('p', { id: `line${n}-error`, class: 'error', role: 'alert' }));
  labeled(section, 'Font', select(`line${n}-font`, FONT_IDS)); labeled(section, 'Size (px)', input(`line${n}-size`, 'number', 10, 240, 1));
  labeled(section, 'Weight', select(`line${n}-weight`, ['400','500','600','700'])); labeled(section, 'Color', input(`line${n}-color`, 'color'));
  labeled(section, 'Opacity', input(`line${n}-opacity`, 'range', 0, 1, .05)); labeled(section, 'Transform', select(`line${n}-transform`, ['none','uppercase','lowercase'])); parent.append(section);
}

function buildEditor(app: HTMLElement) {
  const header = element('header'); header.append(element('p', { class: 'eyebrow' }, 'OBS BROWSER SOURCE'), element('h1', {}, 'Clock Overlay Studio'), element('p', {}, 'Design a transparent two-line clock, then copy its permanent URL into OBS.'));
  const layout = element('div', { class: 'editor-layout' }); const panel = element('section', { class: 'controls', 'aria-label': 'Clock settings' });
  const global = element('fieldset'); global.append(element('legend', {}, 'Preset, time & appearance'));
  const preset = select('preset', ['Custom', ...Object.keys(PRESETS)]); labeled(global, 'Preset', preset);
  const timezoneWrap = element('div', { class: 'timezone-picker' });
  const timezone = input('timezone', 'text');
  timezone.setAttribute('role', 'combobox'); timezone.setAttribute('autocomplete', 'off'); timezone.setAttribute('aria-autocomplete', 'list'); timezone.setAttribute('aria-controls', 'timezone-options'); timezone.setAttribute('aria-expanded', 'false'); timezone.setAttribute('aria-describedby', 'timezone-help timezone-error');
  timezoneWrap.append(timezone, element('div', { id: 'timezone-options', class: 'timezone-options', role: 'listbox' }));
  global.append(element('label', { for: 'timezone' }, 'Timezone'), timezoneWrap, element('p', { id: 'timezone-help', class: 'help' }, 'Search by city, region, canonical ID, or UTC offset.'), element('p', { id: 'timezone-error', class: 'error', role: 'alert' }));
  labeled(global, 'Locale', select('locale', LOCALES));
  labeled(global, 'Alignment', select('align', ['left','center','right'])); labeled(global, 'Line gap', input('gap', 'number', 0, 80)); labeled(global, 'Stroke', input('stroke', 'number', 0, 8)); labeled(global, 'Shadow', input('shadow', 'number', 0, 30)); panel.append(global);
  buildLine(panel, 1); buildLine(panel, 2); panel.append(element('p', { id: 'token-help', class: 'help' }, "Tokens: HH H h mm m ss s a, dddd ddd, MMMM MMM M, D, YYYY YY. Put literal text in 'single quotes'."));
  const output = element('fieldset'); output.append(element('legend', {}, 'Output')); const url = input('obs-url', 'text'); url.readOnly = true; labeled(output, 'OBS URL', url);
  const importForm = element('form', { class: 'import-existing', novalidate: '' }); const existingUrl = input('existing-obs-url', 'text'); existingUrl.maxLength = 4096; existingUrl.setAttribute('autocomplete', 'off'); existingUrl.setAttribute('aria-describedby', 'import-help import-status');
  importForm.append(element('label', { for: 'existing-obs-url' }, 'Load existing OBS URL or fragment'), existingUrl, element('button', { id: 'load-existing', type: 'submit' }, 'Load'));
  output.append(importForm, element('p', { id: 'import-help', class: 'help' }, 'Paste a generated /v1/clock/ URL, or its fragment beginning with v=1 or #v=1.'), element('p', { id: 'import-status', role: 'status', 'aria-live': 'polite' }));
  const actions = element('div', { class: 'actions' }); actions.append(element('button', { id: 'copy-url', type: 'button' }, 'Copy OBS URL'), element('button', { id: 'copy-setup', type: 'button' }, 'Copy setup text'), element('button', { id: 'open-preview', type: 'button' }, 'Open widget preview'), element('button', { id: 'reset', type: 'button', class: 'secondary' }, 'Reset'));
  output.append(actions, element('p', { id: 'copy-status', role: 'status', 'aria-live': 'polite' }), element('p', { id: 'url-warning', class: 'warning' })); panel.append(output);
  const help = element('section', { class: 'instructions' }); help.append(element('h2', {}, 'Add to OBS'), element('ol'));
  const steps = ['Sources → + → Browser; create “Stream Clock”.','Paste the generated URL.','Use 1920 × 300 (or 800 × 240 for compact presets).','Leave custom CSS empty.','Leave “Shutdown source when not visible” and “Refresh browser when scene becomes active” off for uninterrupted operation.']; steps.forEach((step) => help.querySelector('ol')!.append(element('li', {}, step)));
  help.append(element('p', { class: 'privacy' }, 'Anyone with this URL can view its visual settings. Do not enter secrets or personal information. No settings are stored or tracked.')); panel.append(help);
  const previewPanel = element('section', { class: 'preview-panel', 'aria-label': 'Live preview' }); const previewHead = element('div', { class: 'preview-head' });
  const backdrop = select('backdrop', ['checkerboard','dark','light']); backdrop.setAttribute('aria-label', 'Preview backdrop'); previewHead.append(element('h2', {}, 'Live preview'), backdrop);
  const stage = element('div', { id: 'preview-stage', class: 'preview-stage checkerboard' }); stage.append(element('div', { id: 'preview-root' })); previewPanel.append(previewHead, stage, element('p', { id: 'empty-warning', class: 'warning' }));
  layout.append(panel, previewPanel); app.append(header, layout);
}

export function initEditor(app: HTMLElement): { destroy: () => void } {
  buildEditor(app); let config = location.hash ? decodeConfig(location.hash) : cloneClockConfig(DEFAULT_CONFIG); let clock: ReturnType<typeof renderClock> | undefined;
  const byId = <T extends HTMLElement>(id: string) => app.querySelector<T>(`#${id}`)!;
  const sync = () => {
    byId<HTMLInputElement>('timezone').value = config.timezone; byId<HTMLSelectElement>('locale').value = config.locale; byId<HTMLSelectElement>('align').value = config.align;
    byId<HTMLInputElement>('gap').value = String(config.gap); byId<HTMLInputElement>('stroke').value = String(config.stroke); byId<HTMLInputElement>('shadow').value = String(config.shadow);
    config.lines.forEach((line, i) => { const n = i + 1; byId<HTMLInputElement>(`line${n}-enabled`).checked = line.enabled; byId<HTMLInputElement>(`line${n}-format`).value = line.format;
      byId<HTMLSelectElement>(`line${n}-font`).value = line.font; byId<HTMLInputElement>(`line${n}-size`).value = String(line.size); byId<HTMLSelectElement>(`line${n}-weight`).value = String(line.weight);
      byId<HTMLInputElement>(`line${n}-color`).value = line.color.slice(0, 7).toLowerCase(); byId<HTMLInputElement>(`line${n}-opacity`).value = String(line.opacity); byId<HTMLSelectElement>(`line${n}-transform`).value = line.transform; });
  };
  const refresh = () => { clock?.stop(); clock = renderClock(byId('preview-root'), config); const url = widgetUrl(config); byId<HTMLInputElement>('obs-url').value = url; history.replaceState(null, '', `#${url.split('#')[1]}`); byId('url-warning').textContent = url.length >= URL_WARNING_LENGTH ? 'This URL is unusually long; shorten format literals.' : ''; byId('empty-warning').textContent = config.lines.some((line) => line.enabled) ? '' : 'Both lines are disabled; the OBS widget will be fully transparent.'; };
  const timezoneInput = byId<HTMLInputElement>('timezone'); const timezoneOptions = byId('timezone-options'); let activeTimezone = -1; let visibleTimezones: TimezoneId[] = [];
  const closeTimezoneOptions = () => { timezoneOptions.replaceChildren(); visibleTimezones = []; activeTimezone = -1; timezoneInput.setAttribute('aria-expanded', 'false'); timezoneInput.removeAttribute('aria-activedescendant'); };
  const chooseTimezone = (timezone: TimezoneId) => {
    if (!isTimezoneSupported(timezone)) { byId('timezone-error').textContent = 'This timezone is not supported by the current browser. Choose another timezone.'; closeTimezoneOptions(); return; }
    config.timezone = timezone; timezoneInput.value = timezone; byId('timezone-error').textContent = ''; byId<HTMLSelectElement>('preset').value = 'Custom'; closeTimezoneOptions(); refresh();
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
    if (field === 'format') { const error = validateFormat(control.value); byId(`line${n}-error`).textContent = error ?? ''; if (error) return; }
    (config.lines[n - 1] as unknown as Record<string, unknown>)[field] = parse(control); byId<HTMLSelectElement>('preset').value = 'Custom'; refresh();
  }); };
  [1,2].forEach((n) => { lineControl(n, 'enabled', (c) => (c as HTMLInputElement).checked); lineControl(n, 'format', (c) => c.value); lineControl(n, 'font', (c) => c.value); lineControl(n, 'size', (c) => Number(c.value)); lineControl(n, 'weight', (c) => Number(c.value)); lineControl(n, 'color', (c) => c.value.toUpperCase()); lineControl(n, 'opacity', (c) => Number(c.value)); lineControl(n, 'transform', (c) => c.value);
    byId<HTMLSelectElement>(`line${n}-format-preset`).addEventListener('change', (event) => { const value = (event.target as HTMLSelectElement).value; if (value) { byId<HTMLInputElement>(`line${n}-format`).value = value; config.lines[n - 1]!.format = value; refresh(); } }); });
  (['locale','align'] as const).forEach((key) => byId<HTMLSelectElement>(key).addEventListener('change', (event) => { (config as unknown as Record<string, unknown>)[key] = (event.target as HTMLSelectElement).value; refresh(); }));
  (['gap','stroke','shadow'] as const).forEach((key) => byId<HTMLInputElement>(key).addEventListener('input', (event) => { const control = event.target as HTMLInputElement; if (!control.validity.valid) return; config[key] = Number(control.value); refresh(); }));
  byId<HTMLSelectElement>('preset').addEventListener('change', (event) => { const chosen = PRESETS[(event.target as HTMLSelectElement).value]; if (chosen) { config = cloneClockConfig(chosen); sync(); refresh(); } });
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
  byId('reset').addEventListener('click', () => { config = cloneClockConfig(DEFAULT_CONFIG); byId<HTMLSelectElement>('preset').value = 'Custom'; sync(); refresh(); });
  const copy = async (text: string, success: string) => { try { await navigator.clipboard.writeText(text); byId('copy-status').textContent = success; } catch { byId('copy-status').textContent = 'Clipboard unavailable. Select and copy the URL field manually.'; byId<HTMLInputElement>('obs-url').select(); } };
  byId('copy-url').addEventListener('click', () => void copy(widgetUrl(config), 'OBS URL copied.')); byId('copy-setup').addEventListener('click', () => void copy(`OBS Browser Source\nURL: ${widgetUrl(config)}\nSize: 1920 × 300\nLeave custom CSS empty and both source lifecycle options off.`, 'Setup text copied.'));
  byId('open-preview').addEventListener('click', () => window.open(widgetUrl(config), '_blank', 'noopener'));
  sync(); refresh(); return { destroy: () => clock?.stop() };
}

const app = document.querySelector<HTMLElement>('#app'); if (app) initEditor(app);
