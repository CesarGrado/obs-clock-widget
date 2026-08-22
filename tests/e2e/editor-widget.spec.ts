import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('editor config reproduces in the permanent widget route', async ({ page, context }) => {
  await page.goto('/editor/'); await page.locator('#line1-format').fill('HH:mm'); await page.locator('#line1-color').fill('#00ffaa');
  const url = await page.locator('#obs-url').inputValue(); expect(url).toContain('/v1/clock/#');
  const widget = await context.newPage(); await widget.goto(url); await expect(widget.locator('.clock-line')).toHaveCount(2);
  await expect(widget.locator('.clock-line').first()).toHaveCSS('color', 'rgb(0, 255, 170)');
  await expect(widget.locator('body')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  expect(await widget.evaluate(() => ({ x: document.documentElement.scrollWidth - innerWidth, y: document.documentElement.scrollHeight - innerHeight }))).toEqual({ x: 0, y: 0 });
});

test('builds an accessible countdown that reproduces in wide and compact OBS layouts', async ({ page, context }) => {
  await page.goto('/editor/');
  await page.locator('label.mode-card[for="mode-countdown"]').click();
  await page.locator('#quick-10').click();
  await expect(page.locator('#resolved-target')).toContainText('remaining');
  await expect(page.locator('#preview-root .clock-line').first()).toHaveText(/^00:09:\d{2}$/);
  const url = await page.locator('#obs-url').inputValue();
  expect(url).toContain('m=countdown'); expect(url).toContain('ct='); expect(url).not.toContain('ot=');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious','critical'].includes(violation.impact ?? ''))).toEqual([]);

  const widget = await context.newPage();
  for (const viewport of [{ width: 1920, height: 300 }, { width: 800, height: 240 }]) {
    await widget.setViewportSize(viewport); await widget.goto(url);
    await expect(widget.locator('.clock-line').first()).toHaveText(/^00:0[89]:\d{2}$/);
    expect(await widget.evaluate(() => ({ x: document.documentElement.scrollWidth - innerWidth, y: document.documentElement.scrollHeight - innerHeight }))).toEqual({ x: 0, y: 0 });
    expect(await widget.evaluate(() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.querySelector('#clock-root')!).backgroundColor])).toEqual(['rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)']);
  }
});

test('imports a production OBS URL, edits it, and opens the regenerated widget accessibly', async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/editor/');
  const existing = page.getByLabel('Load existing OBS URL or fragment');
  await existing.fill('https://obs-clock-widget.pages.dev/v1/clock/#v=1&tz=Pacific%2FChatham&f1=HH%3Amm&c1=%2300FFAA');
  await existing.press('Enter');
  await expect(page.locator('#import-status')).toHaveText('Existing OBS URL loaded.');
  await expect(page.locator('#timezone')).toHaveValue('Pacific/Chatham');
  await page.locator('#line1-color').fill('#ff00aa');

  const regenerated = await page.locator('#obs-url').inputValue();
  expect(regenerated).toContain('tz=Pacific%2FChatham');
  expect(regenerated).toContain('c1=%23FF00AA');
  const widget = await context.newPage(); await widget.goto(regenerated);
  await expect(widget.locator('.clock-line').first()).toHaveCSS('color', 'rgb(255, 0, 170)');

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious','critical'].includes(violation.impact ?? ''))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('runtime is transparent and makes only same-origin static requests', async ({ page }) => {
  const unexpected: string[] = []; page.on('request', (request) => { if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') unexpected.push(request.url()); });
  await page.goto('/v1/clock/#v=1'); await expect(page.locator('#clock-root')).toBeVisible(); expect(unexpected).toEqual([]);
  expect(await page.evaluate(() => [getComputedStyle(document.documentElement).backgroundColor, getComputedStyle(document.body).backgroundColor, getComputedStyle(document.querySelector('#clock-root')!).backgroundColor])).toEqual(['rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)']);
});

test('malformed and injection fragments fall back without executing markup', async ({ page }) => {
  await page.goto('/v1/clock/#v=1&f1=%3Cimg%20src=x%20onerror=window.pwned=1%3E&c1=url(https%3A%2F%2Fevil.test)');
  await expect(page.locator('.clock-line')).toHaveCount(2); expect(await page.evaluate(() => (window as unknown as { pwned?: number }).pwned)).toBeUndefined(); await expect(page.locator('#clock-root img, #clock-root script')).toHaveCount(0);
});

test('timezone picker searches friendly names and supports keyboard selection', async ({ page }) => {
  await page.goto('/editor/');
  const timezone = page.getByRole('combobox', { name: 'Timezone' });
  await timezone.fill('lord howe');
  const listbox = page.getByRole('listbox'); const option = listbox.getByRole('option').first();
  await expect(option).toContainText('Australia/Lord_Howe');
  await expect(option).toContainText(/UTC[+−]\d{2}:\d{2}/);
  await timezone.press('ArrowDown'); await timezone.press('Enter');
  await expect(timezone).toHaveValue('Australia/Lord_Howe');
  await expect(page.locator('#obs-url')).toHaveValue(/tz=Australia%2FLord_Howe/);
});

test('timezone picker keeps the keyboard-active option visible while navigating', async ({ page }) => {
  await page.goto('/editor/');
  const timezone = page.getByRole('combobox', { name: 'Timezone' });
  await timezone.fill('america');
  for (let index = 0; index < 20; index += 1) await timezone.press('ArrowDown');
  const visibility = await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('#timezone')!;
    const listbox = document.querySelector<HTMLElement>('#timezone-options')!;
    const activeId = input.getAttribute('aria-activedescendant')!;
    const active = document.getElementById(activeId)!;
    const itemRect = active.getBoundingClientRect();
    const listRect = listbox.getBoundingClientRect();
    return { visible: itemRect.top >= listRect.top && itemRect.bottom <= listRect.bottom, scrollTop: listbox.scrollTop };
  });
  expect(visibility.visible).toBe(true);
  expect(visibility.scrollTop).toBeGreaterThan(0);
});

test('timezone picker remains accessible without narrow viewport overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 }); await page.goto('/editor/');
  const timezone = page.getByRole('combobox', { name: 'Timezone' }); await timezone.fill('america');
  const listbox = page.getByRole('listbox'); await expect(listbox).toBeVisible(); await expect(listbox.getByRole('option').first()).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze(); expect(results.violations.filter((v) => ['serious','critical'].includes(v.impact ?? ''))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('copies setup instructions with the selected compact Browser Source size', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/editor/');
  await page.getByLabel('OBS Browser Source size').selectOption('800 × 240');
  await page.getByRole('button', { name: 'Copy setup text' }).click();
  await expect(page.locator('#copy-status')).toHaveText('Setup text copied.');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Size: 800 × 240');
  expect(copied).toContain('/v1/clock/#v=1');
});

test('undoes an accidental reset and clearly marks the unavailable action', async ({ page }) => {
  await page.goto('/editor/');
  const format = page.locator('#line1-format'); const undo = page.getByRole('button', { name: 'Undo reset' });
  await format.fill('HH:mm'); const customizedUrl = await page.locator('#obs-url').inputValue();
  await expect(undo).toBeDisabled();
  await expect(undo).toHaveCSS('cursor', 'not-allowed');

  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(undo).toBeEnabled(); await undo.click();

  await expect(format).toHaveValue('HH:mm');
  await expect(page.locator('#obs-url')).toHaveValue(customizedUrl);
  await expect(page.locator('#copy-status')).toHaveText('Previous settings restored.');
  await expect(undo).toBeDisabled();
});

test('matches Line 2 styling while preserving its format', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 }); await page.goto('/editor/');
  await page.getByLabel('Preset', { exact: true }).selectOption('Gameplay');
  await page.getByRole('button', { name: 'Match Line 2 style to Line 1' }).click();

  await expect(page.locator('#line2-format')).toHaveValue('ddd, MMM D');
  await expect(page.locator('#line2-size')).toHaveValue('80');
  await expect(page.locator('#line2-color')).toHaveValue('#ffffff');
  await expect(page.locator('#obs-url')).toHaveValue(/f2=ddd%2C\+MMM\+D&s2=80&w2=700/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('editor is accessible and has no narrow viewport overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 }); await page.goto('/editor/');
  const results = await new AxeBuilder({ page }).analyze(); expect(results.violations.filter((v) => ['serious','critical'].includes(v.impact ?? ''))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('font library offers grouped fonts with per-font weight filtering', async ({ page }) => {
  await page.goto('/editor/');
  const fontSelect = page.locator('#line1-font');
  const optionCount = await fontSelect.locator('option').count();
  expect(optionCount).toBeGreaterThan(30);
  const groupCount = await fontSelect.locator('optgroup').count();
  expect(groupCount).toBeGreaterThanOrEqual(5);
  await fontSelect.selectOption('bebas-neue');
  const weightOptions = await page.locator('#line1-weight option').allTextContents();
  expect(weightOptions).toEqual(['400']);
  await page.locator('#line1-weight').selectOption('400');
  expect(await page.locator('#obs-url').inputValue()).toContain('ft1=bebas-neue');
});

test('runtime renders a library font without console errors or external requests', async ({ page }) => {
  const errors: string[] = []; const unexpected: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') unexpected.push(request.url()); });
  await page.goto('/v1/clock/#v=1&ft1=permanent-marker&f1=HH%3Amm');
  await expect(page.locator('.clock-line')).toHaveCount(2);
  await expect(page.locator('.clock-line').first()).toHaveCSS('font-family', /Permanent Marker/);
  await page.evaluate(() => (document as Document & { fonts: { ready: Promise<void> } }).fonts.ready);
  expect(errors).toEqual([]); expect(unexpected).toEqual([]);
});

test('legacy font URLs keep their exact stacks', async ({ page }) => {
  await page.goto('/v1/clock/#v=1&ft1=retro');
  await expect(page.locator('.clock-line').first()).toHaveCSS('font-family', /Roboto Mono/);
});

test('imported weight-limited font URL keeps controls, preview, URL, and runtime in agreement', async ({ page, context }) => {
  await page.goto('/editor/');
  const existing = page.getByLabel('Load existing OBS URL or fragment');
  await existing.fill('https://obs-clock-widget.pages.dev/v1/clock/#v=1&ft1=bebas-neue&w1=400');
  await existing.press('Enter');
  await expect(page.locator('#import-status')).toHaveText('Existing OBS URL loaded.');

  await expect(page.locator('#line1-font')).toHaveValue('bebas-neue');
  await expect(page.locator('#line1-weight')).toHaveValue('400');
  await expect(page.locator('#preview-root .clock-line').first()).toHaveCSS('font-weight', '400');
  const url = await page.locator('#obs-url').inputValue();
  expect(url).toContain('ft1=bebas-neue&w1=400');

  const widget = await context.newPage();
  await widget.goto(url);
  await expect(widget.locator('.clock-line').first()).toHaveCSS('font-family', /Bebas Neue/);
  await expect(widget.locator('.clock-line').first()).toHaveCSS('font-weight', '400');
});

test('editor rejects a crafted import with an unsupported font weight', async ({ page }) => {
  await page.goto('/editor/');
  const existing = page.getByLabel('Load existing OBS URL or fragment');
  await existing.fill('https://obs-clock-widget.pages.dev/v1/clock/#v=1&ft1=bebas-neue&w1=700');
  await existing.press('Enter');
  await expect(page.locator('#import-status')).not.toHaveText('Existing OBS URL loaded.');
  await expect(page.locator('#line1-font')).toHaveValue('system');
});
