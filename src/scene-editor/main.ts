import '../config/fonts';
import '../styles/base.css';
import '../styles/editor.css';
import '../styles/scene-editor.css';
import '../styles/scene.css';
import { decodeSceneConfig, sceneUrl, encodeSceneConfig } from '../config/scene-codec';
import { DEFAULT_SCENE_CONFIG, SCENE_THEMES, SCENE_MOTION, type SceneConfig } from '../config/scene-defaults';
import { FONTS, FONT_CATEGORIES, clampWeight, fontById } from '../config/fonts';
import { cloneSceneConfig } from '../config/clone';
import { renderScene } from '../scene/renderer';
import { isAbsoluteIsoTarget } from '../time/countdown';
import { wallTimeToInstant, instantToWallFields, timezoneLabel } from '../editor/tz';
import { clippingCopySuccess } from '../editor/clipboard';
import { createLayoutSettler } from '../editor/layout-settling';
import { sceneClippingIssues } from '../geometry/scene-clipping';
import type { ClippedEdge, ClippingIssue } from '../geometry/clipping';
import { addPreviewNavigation } from '../editor/preview-navigation';

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag); Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value)); if (text !== undefined) node.textContent = text; return node;
};
const labeled = (parent: HTMLElement, label: string, control: HTMLElement) => { parent.append(element('label', { for: control.id }, label), control); };
const labeledField = (parent: HTMLElement, label: string, control: HTMLElement) => { const field = element('div', { class: 'type-field' }); labeled(field, label, control); parent.append(field); return field; };
const option = (value: string, label = value) => element('option', { value }, label);
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const fontSelect = (id: string) => { const node = element('select', { id }); FONT_CATEGORIES.forEach((category) => { const group = element('optgroup', { label: category }); FONTS.filter((font) => font.category === category).forEach((font) => group.append(option(font.id, font.label))); node.append(group); }); return node; };
const numberInput = (id: string, min: number, max: number) => element('input', { id, type: 'number', min: String(min), max: String(max), required: '', 'aria-describedby': `${id}-error` });
const colorInput = (id: string) => element('input', { id, type: 'color' });
const WEIGHT_LABELS: Record<number, string> = { 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold' };
const weightOption = (weight: number) => option(String(weight), `${weight} ${WEIGHT_LABELS[weight] ?? 'Weight'}`);
const weightSelect = (id: string, font: string) => { const node = element('select', { id }); fontById(font)!.weights.forEach((weight) => node.append(weightOption(weight))); return node; };

const THEME_LABELS: Record<SceneConfig['theme'], string> = {
  'dark-gradient': 'Dark Gradient', 'puzzlr-purple': 'Puzzlr Purple', 'neon-blue': 'Neon Blue', sunset: 'Sunset', 'minimal-black': 'Minimal Black',
};
const UNSCHEDULED_TARGET = DEFAULT_SCENE_CONFIG.countdownTarget;
const isUnscheduledTarget = (target: string) => target === UNSCHEDULED_TARGET || Date.parse(target) - Date.now() > 99 * 86_400_000;

export type ScenePresets = Record<string, SceneConfig>;
const withChanges = (changes: Partial<SceneConfig>): SceneConfig => ({ ...cloneSceneConfig(DEFAULT_SCENE_CONFIG), ...changes });
export const SCENE_PRESETS: ScenePresets = {
  'Stream Starting Soon': withChanges({}),
  'Event Countdown': withChanges({ headline: 'COUNTDOWN TO KICKOFF', subtitle: 'perfectly adequate raid night', reveal: 'GO TIME', theme: 'neon-blue', numberSize: 200, headlineFont: 'montserrat-alternates', numberFont: 'montserrat-alternates' }),
  'Puzzlr Night': withChanges({ headline: 'PUZZLR ESCAPE ROOMS', subtitle: 'solve the room before time runs out', reveal: 'GAME ON!', theme: 'puzzlr-purple', headlineFont: 'archivo-black', headlineWeight: 400, numberFont: 'archivo-black', numberWeight: 400, numberColor: '#B9A5FF', revealFont: 'archivo-black', revealWeight: 400 }),
  'Minimal Mono': withChanges({ headline: 'STARTING SOON', subtitle: '', theme: 'minimal-black', motion: 'none', headlineFont: 'space-mono', numberFont: 'space-mono', numberColor: '#7CFCB2', revealFont: 'space-mono', headlineWeight: 700, numberWeight: 700, revealWeight: 700 }),
};

export function initSceneEditor(app: HTMLElement): { destroy: () => void; applyConfig: (next: SceneConfig) => void } {
  const build = () => {
    const form = element('fieldset'); form.append(element('legend', {}, 'Scene text'));
    const headline = element('input', { id: 'headline', type: 'text', maxlength: '48', required: '', 'aria-describedby': 'headline-error' });
    labeled(form, 'Headline', headline); form.append(element('p', { id: 'headline-error', class: 'error', role: 'alert' }));
    const subtitle = element('input', { id: 'subtitle', type: 'text', maxlength: '64', 'aria-describedby': 'subtitle-error' });
    labeled(form, 'Subtitle (optional)', subtitle); form.append(element('p', { id: 'subtitle-error', class: 'error', role: 'alert' }));
    const reveal = element('input', { id: 'reveal', type: 'text', maxlength: '32', required: '', 'aria-describedby': 'reveal-error' });
    labeled(form, 'Message at zero', reveal); form.append(element('p', { id: 'reveal-error', class: 'error', role: 'alert' }));
    app.append(form);
    const typeStyles = element('fieldset'); typeStyles.append(element('legend', {}, 'Typography'));
    for (const [key, label] of [['headline', 'Headline'], ['subtitle', 'Subtitle'], ['number', 'Countdown'], ['reveal', 'Zero message']] as const) {
      const headingId = `${key}-typography-heading`;
      const row = element('div', { class: 'type-row', role: 'group', 'aria-labelledby': headingId });
      row.append(element('h2', { id: headingId }, label));
      labeledField(row, `${label} font`, fontSelect(`${key}-font`));
      const sizeField = labeledField(row, `${label} size (px)`, numberInput(`${key}-size`, 10, 240));
      sizeField.append(element('p', { id: `${key}-size-error`, class: 'error', role: 'alert' }));
      labeledField(row, `${label} weight`, weightSelect(`${key}-weight`, DEFAULT_SCENE_CONFIG[`${key}Font`]));
      labeledField(row, `${label} color`, colorInput(`${key}-color`));
      typeStyles.append(row);
    }
    app.append(typeStyles);
    const themesField = element('fieldset'); themesField.append(element('legend', {}, 'Background'));
    const themeCards = element('div', { id: 'theme-cards', class: 'theme-cards', role: 'radiogroup', 'aria-label': 'Background theme' });
    SCENE_THEMES.forEach((theme) => {
      const radio = element('input', { type: 'radio', id: `theme-${theme}`, name: 'theme', value: theme, class: 'theme-radio', 'aria-label': THEME_LABELS[theme] });
      const card = element('label', { for: `theme-${theme}`, class: 'theme-card', 'data-theme': theme }, THEME_LABELS[theme]);
      card.prepend(radio); themeCards.append(card);
    });
    themesField.append(themeCards);
    const motionCards = element('div', { class: 'motion-choice', role: 'radiogroup', 'aria-label': 'Background motion' });
    for (const [value, label] of [['none', 'Still'], ['subtle', 'Subtle motion']] as const) {
      const radio = element('input', { type: 'radio', id: `motion-${value}`, name: 'motion', value, 'aria-label': label });
      const card = element('label', { for: `motion-${value}`, class: 'motion-card' }, label); card.prepend(radio); motionCards.append(card);
    }
    themesField.append(motionCards, element('p', { class: 'hint' }, 'Motion pauses automatically for viewers who prefer reduced motion.'));
    app.append(themesField);
    const countdown = element('fieldset', { id: 'countdown-setup' }); countdown.append(element('legend', {}, 'Countdown'));
    const scheduleActions = element('div', { class: 'quick-buttons', role: 'group', 'aria-label': 'Scene scheduling' });
    scheduleActions.append(
      element('button', { id: 'schedule-scene', type: 'button' }, 'Schedule scene'),
      element('button', { id: 'clear-schedule', type: 'button', class: 'secondary' }, 'Clear schedule'),
    );
    const quick = element('div', { class: 'quick-buttons', role: 'group', 'aria-label': 'Quick countdown durations' });
    for (const minutes of [5, 10, 15, 30, 60]) quick.append(element('button', { id: `quick-${minutes}`, type: 'button', class: 'quick-button', 'data-minutes': String(minutes) }, `${minutes} min`));
    const schedule = element('div', { class: 'schedule-row' });
    const dateField = element('div', { class: 'schedule-field' });
    labeled(dateField, 'Date', element('input', { id: 'countdown-date', type: 'date', required: '', 'aria-describedby': 'countdown-date-error countdown-error' }));
    dateField.append(element('p', { id: 'countdown-date-error', class: 'error', role: 'alert' }));
    const timeField = element('div', { class: 'schedule-field' });
    labeled(timeField, 'Time', element('input', { id: 'countdown-time', type: 'time', required: '', 'aria-describedby': 'countdown-time-error countdown-error' }));
    timeField.append(element('p', { id: 'countdown-time-error', class: 'error', role: 'alert' }));
    const tz = element('span', { id: 'countdown-timezone', class: 'hint' }); tz.textContent = timezoneLabel();
    schedule.append(dateField, timeField, tz);
    const delay = element('select', { id: 'reveal-delay', 'aria-label': 'Delay before the zero message appears' });
    for (const minutes of [0, 1, 2, 3]) delay.append(option(String(minutes), minutes === 0 ? 'After the 5-second hold' : `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} after the 5-second hold`));
    labeled(countdown, 'Zero-message timing', delay);
    countdown.append(scheduleActions, quick, schedule, element('p', { id: 'countdown-error', class: 'error', role: 'alert' }), element('p', { id: 'resolved-target', 'aria-live': 'polite', class: 'hint' }));
    app.append(countdown);
    const actions = element('fieldset'); actions.append(element('legend', {}, 'Preview & OBS'));
    actions.append(element('label', { for: 'preview-zero' }, 'Preview zero state'));
    actions.append(element('input', { id: 'preview-zero', type: 'checkbox' }));
    const url = element('input', { id: 'scene-url', type: 'text', readonly: '' }); labeled(actions, 'Scene URL', url);
    actions.append(element('button', { id: 'copy-url', type: 'button' }, 'Copy scene URL'), element('button', { id: 'copy-setup', type: 'button' }, 'Copy full-screen OBS setup'), element('p', { id: 'copy-status', role: 'status', class: 'hint' }), element('p', { id: 'scene-clipping-warning', role: 'status', class: 'warning', 'aria-live': 'polite' }));
    app.append(actions);
  };
  build();
  let config = location.hash ? decodeSceneConfig(location.hash) : cloneSceneConfig(DEFAULT_SCENE_CONFIG);
  let scheduleActive = !isUnscheduledTarget(config.countdownTarget);
  let scene: ReturnType<typeof renderScene> | undefined;
  let clippingIssues: ClippingIssue[] = []; let clippingPending = false; let measurementRoot: HTMLElement | undefined;
  const layoutSettler = createLayoutSettler();

  const sync = () => {
    byId<HTMLInputElement>('headline').value = config.headline; byId<HTMLInputElement>('subtitle').value = config.subtitle; byId<HTMLInputElement>('reveal').value = config.reveal;
    for (const key of ['headline', 'subtitle', 'reveal'] as const) {
      byId<HTMLInputElement>(key).removeAttribute('aria-invalid'); byId(`${key}-error`).textContent = '';
    }
    for (const key of ['headline', 'subtitle', 'number', 'reveal'] as const) {
      byId<HTMLInputElement>(`${key}-size`).removeAttribute('aria-invalid'); byId(`${key}-size-error`).textContent = '';
      byId<HTMLSelectElement>(`${key}-font`).value = config[`${key}Font`];
      byId<HTMLInputElement>(`${key}-size`).value = String(config[`${key}Size`]);
      byId<HTMLSelectElement>(`${key}-weight`).replaceChildren(...config[`${key}Font`] ? fontById(config[`${key}Font`])!.weights.map(weightOption) : []);
      byId<HTMLSelectElement>(`${key}-weight`).value = String(config[`${key}Weight`]);
      byId<HTMLInputElement>(`${key}-color`).value = config[`${key}Color`];
    }
    SCENE_THEMES.forEach((theme) => { byId<HTMLInputElement>(`theme-${theme}`).checked = config.theme === theme; });
    byId<HTMLInputElement>(`motion-${config.motion}`).checked = true;
    app.querySelectorAll<HTMLElement>('.theme-card').forEach((card) => card.classList.toggle('active', card.querySelector('input')?.checked === true));
    syncCountdownInputs();
  };
  const syncCountdownInputs = () => {
    const date = byId<HTMLInputElement>('countdown-date'); const time = byId<HTMLInputElement>('countdown-time');
    date.disabled = !scheduleActive; time.disabled = !scheduleActive;
    byId<HTMLButtonElement>('schedule-scene').disabled = scheduleActive;
    byId<HTMLButtonElement>('clear-schedule').disabled = !scheduleActive;
    if (!scheduleActive || isUnscheduledTarget(config.countdownTarget)) { date.value = ''; time.value = ''; byId<HTMLSelectElement>('reveal-delay').value = String(config.revealDelay); return; }
    const end = new Date(config.countdownTarget); if (Number.isNaN(end.getTime())) return;
    // Display the target in the device timezone (the one scheduling interprets inputs in).
    const wall = instantToWallFields(end);
    date.value = wall.date;
    time.value = wall.time;
    byId<HTMLSelectElement>('reveal-delay').value = String(config.revealDelay);
  };
  const clippingMessage = (issues: ClippingIssue[]) => issues.length === 0 ? '' : `Content is clipped at 1920×1080: ${issues.map((issue) => `${issue.label} (${issue.clippedEdges.join(', ')})`).join('; ')}. ${Array.from(new Set(issues.flatMap((issue) => issue.suggestedFixes))).join(' ')}`;

  const evaluateMeasurement = (measurement: HTMLElement) => {
    const panel = measurement.querySelector<HTMLElement>('.scene-panel')!;
    const reveal = measurement.querySelector<HTMLElement>('.scene-reveal')!;
    const content = measurement.querySelector<HTMLElement>('.scene-content')!;
    content.style.animation = 'none'; panel.style.transition = 'none'; reveal.style.transition = 'none';
    const transforms = config.motion === 'subtle' ? ['translateY(-0.4%) scale(1.004)', 'translateY(0.4%) scale(1.008)'] : ['none'];
    const observed: ClippingIssue[] = [];
    for (const showReveal of [false, true]) {
      panel.classList.toggle('scene-hidden', showReveal); reveal.classList.toggle('scene-shown', showReveal);
      for (const transform of transforms) { content.style.transform = transform; observed.push(...sceneClippingIssues(measurement, config, { width: 1920, height: 1080 })); }
    }
    const merged = new Map<string, ClippingIssue & { clippedEdges: ClippedEdge[] }>();
    for (const issue of observed) {
      const current = merged.get(issue.elementId);
      if (!current) merged.set(issue.elementId, { ...issue, clippedEdges: [...issue.clippedEdges] });
      else for (const edge of issue.clippedEdges) if (!current.clippedEdges.includes(edge)) current.clippedEdges.push(edge);
    }
    return [...merged.values()];
  };
  const scheduleClippingCheck = () => {
    clippingPending = true; clippingIssues = []; byId('scene-clipping-warning').textContent = '';
    measurementRoot?.remove();
    const source = byId('preview-root'); const measurement = source.cloneNode(true) as HTMLElement;
    measurement.removeAttribute('id'); measurement.classList.remove('scene-preview'); measurement.dataset.sceneMeasurement = ''; measurement.setAttribute('aria-hidden', 'true');
    Object.assign(measurement.style, { position: 'fixed', left: '-10000px', top: '0', right: 'auto', bottom: 'auto', width: '1920px', height: '1080px', pointerEvents: 'none', contain: 'strict' });
    measurement.style.setProperty('--vw', '19.2px'); measurement.style.setProperty('--vh', '10.8px');
    document.body.append(measurement); measurementRoot = measurement;
    void layoutSettler.settle().then((settled) => {
      if (!settled || !measurement.isConnected || measurementRoot !== measurement) return;
      clippingIssues = evaluateMeasurement(measurement); clippingPending = false;
      byId('scene-clipping-warning').textContent = clippingMessage(clippingIssues);
      measurement.remove(); if (measurementRoot === measurement) measurementRoot = undefined;
    });
  };
  const refresh = () => {
    scene?.stop();
    const preview = byId('preview-root');
    scene = renderScene(preview, config, undefined, { preview: true });
    if (byId<HTMLInputElement>('preview-zero').checked) scene.showReveal(); else scene.hideReveal();
    byId<HTMLInputElement>('scene-url').value = sceneUrl(config);
    history.replaceState(null, '', `#${encodeSceneConfig(config)}`);
    const end = new Date(config.countdownTarget);
    const totalSeconds = Math.round((end.getTime() - Date.now()) / 1000);
    const unscheduled = isUnscheduledTarget(config.countdownTarget);
    byId('resolved-target').textContent = unscheduled ? 'Not scheduled yet — pick a time or use a quick duration.' : (totalSeconds > 0 ? `Ends in ${Math.max(1, Math.round(totalSeconds / 60))} minutes` : 'It has ended');
    scheduleClippingCheck();
  };
  const setText = (key: 'headline' | 'subtitle' | 'reveal', value: string) => { config[key] = value; refresh(); };
  const validateText = (key: 'headline' | 'subtitle' | 'reveal', value: string, min: number, max: number) => {
    const error = byId(`${key}-error`); const node = byId<HTMLInputElement>(key);
    if (value.length > max) { node.setAttribute('aria-invalid', 'true'); error.textContent = `Keep it under ${max + 1} characters.`; return false; }
    if (key !== 'subtitle' && value.length < min) { node.setAttribute('aria-invalid', 'true'); error.textContent = 'This field is required.'; return false; }
    if (!/^[A-Za-z0-9 !?.,:'"&\-+()/·—–]*$/.test(value)) { node.setAttribute('aria-invalid', 'true'); error.textContent = 'Use letters, numbers, and basic punctuation only.'; return false; }
    node.removeAttribute('aria-invalid'); error.textContent = ''; return true;
  };
  (['headline', 'subtitle', 'reveal'] as const).forEach((key) => {
    const max = key === 'headline' ? 48 : key === 'subtitle' ? 64 : 32;
    byId(key).addEventListener('input', (event) => {
      const value = (event.target as HTMLInputElement).value;
      if (validateText(key, value, 1, max)) setText(key, value);
    });
  });
  for (const key of ['headline', 'subtitle', 'number', 'reveal'] as const) {
    byId<HTMLSelectElement>(`${key}-font`).addEventListener('change', (event) => {
      const font = (event.target as HTMLSelectElement).value as SceneConfig['headlineFont'];
      config[`${key}Font`] = font;
      config[`${key}Weight`] = clampWeight(font, config[`${key}Weight`]);
      const weightSelect = byId<HTMLSelectElement>(`${key}-weight`);
      weightSelect.replaceChildren(...fontById(font)!.weights.map(weightOption));
      weightSelect.value = String(config[`${key}Weight`]);
      refresh();
    });
    byId(`${key}-size`).addEventListener('input', (event) => {
      const node = event.target as HTMLInputElement; const size = Number(node.value); const error = byId(`${key}-size-error`);
      if (!node.checkValidity() || !Number.isFinite(size) || size < 10 || size > 240) {
        node.setAttribute('aria-invalid', 'true'); error.textContent = 'Enter a whole-number size from 10 to 240 pixels.'; return;
      }
      node.removeAttribute('aria-invalid'); error.textContent = ''; config[`${key}Size`] = size; refresh();
    });
    byId(`${key}-weight`).addEventListener('change', (event) => { config[`${key}Weight`] = Number((event.target as HTMLSelectElement).value) as SceneConfig['headlineWeight']; refresh(); });
    byId(`${key}-color`).addEventListener('input', (event) => { config[`${key}Color`] = (event.target as HTMLInputElement).value; refresh(); });
  }
  SCENE_THEMES.forEach((theme) => byId(`theme-${theme}`).addEventListener('change', () => { config.theme = theme; sync(); refresh(); }));
  SCENE_MOTION.forEach((motion) => byId(`motion-${motion}`).addEventListener('change', () => { config.motion = motion; refresh(); }));
  const clearScheduleErrors = () => {
    for (const key of ['date', 'time'] as const) {
      byId<HTMLInputElement>(`countdown-${key}`).removeAttribute('aria-invalid');
      byId(`countdown-${key}-error`).textContent = '';
    }
    byId('countdown-error').textContent = '';
  };
  const setScheduleError = (message: string) => {
    for (const key of ['date', 'time'] as const) byId<HTMLInputElement>(`countdown-${key}`).setAttribute('aria-invalid', 'true');
    byId('countdown-error').textContent = message;
  };
  app.querySelectorAll<HTMLButtonElement>('.quick-button').forEach((button) => button.addEventListener('click', () => {
    const minutes = Number(button.dataset.minutes);
    config.countdownTarget = new Date(Date.now() + minutes * 60_000).toISOString().replace('.000Z', 'Z');
    scheduleActive = true;
    syncCountdownInputs(); clearScheduleErrors(); refresh();
  }));
  byId('schedule-scene').addEventListener('click', () => {
    scheduleActive = true; syncCountdownInputs(); clearScheduleErrors(); byId<HTMLInputElement>('countdown-date').focus();
  });
  byId('clear-schedule').addEventListener('click', () => {
    config.countdownTarget = UNSCHEDULED_TARGET; scheduleActive = false; syncCountdownInputs(); clearScheduleErrors(); refresh();
  });
  const scheduleFromInputs = () => {
    const dateValue = byId<HTMLInputElement>('countdown-date').value; const timeValue = byId<HTMLInputElement>('countdown-time').value;
    clearScheduleErrors();
    if (!dateValue || !timeValue) {
      if (!dateValue) { byId<HTMLInputElement>('countdown-date').setAttribute('aria-invalid', 'true'); byId('countdown-date-error').textContent = 'Pick a date.'; }
      if (!timeValue) { byId<HTMLInputElement>('countdown-time').setAttribute('aria-invalid', 'true'); byId('countdown-time-error').textContent = 'Pick a time.'; }
      return;
    }
    const [year, month, day] = dateValue.split('-').map(Number); const [hour, minute] = timeValue.split(':').map(Number);
    // DST-safe wall→instant conversion (candidate enumeration + round-trip, first occurrence, gap rejection).
    const absolute = wallTimeToInstant({ year: year!, month: month ?? 1, day: day!, hour: hour ?? 0, minute: minute ?? 0 });
    if (!absolute) { setScheduleError('That time does not exist because of a daylight-saving change in your timezone — pick 30 minutes earlier or later.'); return; }
    const iso = `${absolute.toISOString().slice(0, 19)}Z`;
    if (!isAbsoluteIsoTarget(iso)) { setScheduleError('Pick a valid date and time.'); return; }
    if (absolute.getTime() - Date.now() > 99 * 86_400_000) { setScheduleError('That time is more than 99 days away.'); return; }
    config.countdownTarget = iso; refresh();
  };
  byId('countdown-date').addEventListener('change', scheduleFromInputs);
  byId('countdown-time').addEventListener('change', scheduleFromInputs);
  const commitSchedule = () => {
    if (!scheduleActive) return true;
    scheduleFromInputs();
    const invalid = ['date', 'time'].map((key) => byId<HTMLInputElement>(`countdown-${key}`)).find((node) => node.getAttribute('aria-invalid') === 'true');
    if (!invalid) return true;
    invalid.focus(); byId('copy-status').textContent = 'Fix the highlighted schedule fields before copying this scene.'; return false;
  };
  const commitScene = () => {
    if (!commitSchedule()) return false;
    const invalid = app.querySelector<HTMLInputElement>('[aria-invalid="true"]:not(:disabled)');
    if (!invalid) return true;
    invalid.focus(); byId('copy-status').textContent = 'Fix the highlighted scene fields before copying this scene.'; return false;
  };

  byId('reveal-delay').addEventListener('change', (event) => { config.revealDelay = Number((event.target as HTMLSelectElement).value) as SceneConfig['revealDelay']; refresh(); });
  byId('preview-zero').addEventListener('change', refresh);
  const copy = async (text: string, success: string) => {
    const successSnapshot = clippingCopySuccess(success, clippingIssues.length > 0, clippingPending);
    try { await navigator.clipboard.writeText(text); byId('copy-status').textContent = successSnapshot; } catch { byId('copy-status').textContent = 'Clipboard unavailable. Select and copy the URL field manually.'; byId<HTMLInputElement>('scene-url').select(); }
  };
  byId('copy-url').addEventListener('click', () => { if (commitScene()) void copy(sceneUrl(config), 'Scene URL copied.'); });
  byId('copy-setup').addEventListener('click', () => { if (commitScene()) void copy(`OBS Browser Source\nURL: ${sceneUrl(config)}\nSize: 1920×1080\nLeave custom CSS empty and both source lifecycle options off.`, 'Full-screen OBS setup copied.'); });

  const previewPanel = element('section', { class: 'preview-panel', id: 'preview-panel', 'aria-labelledby': 'scene-preview-heading' });
  const previewHead = element('div', { class: 'preview-head' });
  previewHead.append(element('h2', { id: 'scene-preview-heading' }, 'Scene preview'));
  previewPanel.append(previewHead);
  const frame = element('div', { class: 'scene-frame' });
  frame.append(element('div', { id: 'preview-root', class: 'scene-preview' }));
  previewPanel.append(frame);
  const layout = element('div', { class: 'editor-layout' });
  const controls = element('section', { class: 'controls', 'aria-label': 'Scene settings' });
  while (app.firstChild) controls.append(app.firstChild);
  const destroyPreviewNavigation = addPreviewNavigation(controls, previewPanel, previewHead);
  layout.append(controls, previewPanel);
  app.append(layout);
  sync(); refresh();
  return { destroy: () => { destroyPreviewNavigation(); layoutSettler.cancel(); measurementRoot?.remove(); scene?.stop(); }, applyConfig: (next: SceneConfig) => { config = cloneSceneConfig(next); scheduleActive = !isUnscheduledTarget(config.countdownTarget); sync(); refresh(); } };
}

const app = document.querySelector<HTMLElement>('#app');
if (app) initSceneEditor(app);
