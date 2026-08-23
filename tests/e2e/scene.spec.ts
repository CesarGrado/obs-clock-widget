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

test('scene runtime geometry is full-screen and visible at 320x180, 640x360, 1080p, and 4K', async ({ page }) => {
  // Use a maximum-valid 48-char headline + 64-char subtitle + long reveal to stress layout.
  const h = 'A'.repeat(48), sub = 'B'.repeat(64), rv = 'C'.repeat(32);
  const frag = `#v=1&h=${encodeURIComponent(h)}&sub=${encodeURIComponent(sub)}&rv=${encodeURIComponent(rv)}&ct=${encodeURIComponent(new Date(Date.now() + 60_000).toISOString().replace('.000Z', 'Z'))}`;
  await page.goto(`/v1/scene/${frag}`);
  const boxesOk = (w: number, hgt: number) => new Promise<void>((resolve, reject) => {
    (async () => {
      await page.setViewportSize({ width: w, height: hgt });
      // Wait for the ResizeObserver-driven --vw/--vh to apply and reflow before measuring.
      await page.waitForFunction(() => {
        const root = document.querySelector('.scene-root') as HTMLElement;
        return root && getComputedStyle(root).getPropertyValue('--vw').trim() !== '';
      });
      await page.waitForTimeout(60);
      const root = await page.locator('.scene-root').boundingBox();
      const headline = await page.locator('.scene-headline').boundingBox();
      const number = await page.locator('.scene-number').boundingBox();
      const subtitle = await page.locator('.scene-subtitle').boundingBox();
      expect(Math.round(root!.width)).toBe(w); expect(Math.round(root!.height)).toBe(hgt);
      for (const box of [headline!, number!, subtitle!]) {
        expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(hgt);
      }
      resolve();
    })().catch(reject);
  });
  // Freeze both subtle-motion endpoints so the check is deterministic.
  for (const delay of ['0s', '-12s']) {
    await page.addStyleTag({ content: `.scene-content{animation-play-state:paused !important;animation-delay:${delay} !important}` });
    for (const [w, hh] of [[320, 180], [640, 360], [1920, 1080], [3840, 2160]] as const) await boxesOk(w, hh);
  }
});

test('editor preview stays contained inside its 16:9 frame at narrow and wide widths, both motion endpoints', async ({ page }) => {
  for (const width of [640, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/scene-editor/');
    await page.locator('label.theme-card[for="theme-puzzlr-purple"]').click();
    for (const delay of ['0s', '-12s']) {
      await page.addStyleTag({ content: `#preview-root .scene-content{animation-play-state:paused !important;animation-delay:${delay} !important}` });
      const contained = await page.evaluate(() => {
        const frame = document.querySelector('.scene-frame')!.getBoundingClientRect();
        const content = document.querySelector('#preview-root .scene-content')!.getBoundingClientRect();
        return content.left >= frame.left - 1 && content.right <= frame.right + 1 && content.top >= frame.top - 1 && content.bottom <= frame.bottom + 1;
      });
      expect(contained).toBe(true);
    }
  }
});

test('scene runtime reveals at zero and respects theme and reduced-motion styling hooks', async ({ page }) => {
  const soon = new Date(Date.now() + 3_000).toISOString().replace('.000Z', 'Z');
  await page.goto(`/v1/scene/#v=1&h=STARTING&rv=LIVE&th=sunset&mo=none&rd=0&ct=${encodeURIComponent(soon)}`);
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
  // The preview must be fully contained inside its 16:9 frame, not overlapping the heading.
  const contained = await page.evaluate(() => {
    const frame = document.querySelector('.scene-frame')!.getBoundingClientRect();
    const root = document.querySelector('#preview-root')!.getBoundingClientRect();
    const heading = document.querySelector('#preview-panel h2')!.getBoundingClientRect();
    const content = document.querySelector('#preview-root .scene-content')!.getBoundingClientRect();
    return { frame, root, heading, content,
      rootInside: root.left >= frame.left - 1 && root.right <= frame.right + 1 && root.top >= frame.top - 1 && root.bottom <= frame.bottom + 1,
      belowHeading: frame.top >= heading.bottom - 1,
      ratioOk: Math.abs(frame.width / frame.height - 16 / 9) < 0.03,
      contentInside: content.left >= frame.left - 2 && content.right <= frame.right + 2 && content.top >= frame.top - 2 && content.bottom <= frame.bottom + 2 };
  });
  expect(contained.rootInside).toBe(true); expect(contained.belowHeading).toBe(true);
  expect(contained.ratioOk).toBe(true); expect(contained.contentInside).toBe(true);
});

test('legacy clock route is untouched by the scene addition', async ({ page }) => {
  await page.goto('/v1/clock/#v=1&ft1=retro&f1=HH%3Amm');
  await expect(page.locator('.clock-line').first()).toHaveText(/^\d{2}:\d{2}$/);
  expect(await page.locator('.clock-line').first().evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Roboto Mono');
});
