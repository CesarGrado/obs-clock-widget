import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('scene builder produces a working full-screen scene URL', async ({ page, context }) => {
  await page.goto('/scene-editor/');
  await expect(page.locator('#preview-root .scene-headline')).toHaveText('STREAM STARTING SOON');
  await page.locator('#quick-10').click();
  await expect(page.locator('#scene-url')).toHaveValue(/v1\/scene\/#v=1&.*ct=/);
  const url = await page.locator('#scene-url').inputValue();
  // zero-state preview
  await page.locator('#preview-zero').check();
  await expect(page.locator('#preview-root .scene-reveal')).toHaveClass(/scene-shown/);
  await page.locator('#preview-zero').uncheck();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([]);

  const scene = await context.newPage();
  const errors: string[] = [];
  scene.on('pageerror', (e) => errors.push(String(e)));
  await scene.setViewportSize({ width: 1920, height: 1080 });
  await scene.goto(url);
  await expect(scene.locator('.scene-headline')).toHaveText('STREAM STARTING SOON');
  await expect(scene.locator('.scene-number')).toHaveText(/^00:0?\d:\d{2}$/);
  await expect(scene.locator('.scene-reveal')).not.toHaveClass(/scene-shown/);
  expect(await scene.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  expect(errors).toEqual([]);
});

test('scene runtime reveals at zero and respects theme and reduced-motion styling hooks', async ({ page }) => {
  const soon = new Date(Date.now() + 3_000).toISOString().replace('.000Z', 'Z');
  await page.goto(`/v1/scene/#v=1&h=STARTING&rv=LIVE&th=sunset&mo=none&ct=${encodeURIComponent(soon)}`);
  await expect(page.locator('.scene-number')).toHaveText(/^00:00:0\d$/);
  await expect(page.locator('.scene-root')).toHaveAttribute('data-theme', 'sunset');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.scene-reveal')).toHaveClass(/scene-shown/, { timeout: 15_000 });
  await expect(page.locator('.scene-panel')).toHaveClass(/scene-hidden/);
});

test('scene builder is accessible and overflow-free at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/scene-editor/');
  await page.locator('label.theme-card[for="theme-sunset"]').click();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});

test('legacy clock route is untouched by the scene addition', async ({ page }) => {
  await page.goto('/v1/clock/#v=1&ft1=retro&f1=HH%3Amm');
  await expect(page.locator('.clock-line').first()).toHaveText(/^\d{2}:\d{2}$/);
  expect(await page.locator('.clock-line').first().evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Roboto Mono');
});
