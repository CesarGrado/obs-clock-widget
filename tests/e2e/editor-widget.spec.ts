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

test('runtime is transparent and makes only same-origin static requests', async ({ page }) => {
  const unexpected: string[] = []; page.on('request', (request) => { if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') unexpected.push(request.url()); });
  await page.goto('/v1/clock/#v=1'); await expect(page.locator('#clock-root')).toBeVisible(); expect(unexpected).toEqual([]);
  expect(await page.evaluate(() => [getComputedStyle(document.documentElement).backgroundColor, getComputedStyle(document.body).backgroundColor, getComputedStyle(document.querySelector('#clock-root')!).backgroundColor])).toEqual(['rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)']);
});

test('malformed and injection fragments fall back without executing markup', async ({ page }) => {
  await page.goto('/v1/clock/#v=1&f1=%3Cimg%20src=x%20onerror=window.pwned=1%3E&c1=url(https%3A%2F%2Fevil.test)');
  await expect(page.locator('.clock-line')).toHaveCount(2); expect(await page.evaluate(() => (window as unknown as { pwned?: number }).pwned)).toBeUndefined(); await expect(page.locator('#clock-root img, #clock-root script')).toHaveCount(0);
});

test('editor is accessible and has no narrow viewport overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 }); await page.goto('/editor/');
  const results = await new AxeBuilder({ page }).analyze(); expect(results.violations.filter((v) => ['serious','critical'].includes(v.impact ?? ''))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
