import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const editors = ['/editor/', '/scene-editor/'] as const;

test('preview stays visible on roomy desktop layouts but does not trap short viewports', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  for (const path of editors) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    const preview = page.locator('.preview-panel');
    await expect(preview).toHaveCSS('position', 'sticky');
    await page.locator('#editor-controls fieldset').last().scrollIntoViewIfNeeded();
    await expect(preview).toBeInViewport();
    const boxes = await page.locator('#editor-controls, #preview-panel').evaluateAll(([controls, panel]) => [controls, panel].map((node) => node!.getBoundingClientRect()));
    expect(Math.min(boxes[0]!.right, boxes[1]!.right) - Math.max(boxes[0]!.left, boxes[1]!.left)).toBeLessThanOrEqual(0);

    await page.setViewportSize({ width: 1280, height: 560 });
    await expect(preview).not.toHaveCSS('position', 'sticky');
  }
  expect(errors).toEqual([]);
});

test('mobile editors provide keyboard navigation between deep controls and the preview', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const path of editors) {
    await page.goto(path);
    const preview = page.locator('#preview-panel');
    const controls = page.locator('#editor-controls');
    const jumpToPreview = page.getByRole('link', { name: 'Jump to preview' });
    const returnToControls = page.getByRole('link', { name: 'Return to controls' });

    await controls.locator('fieldset').last().scrollIntoViewIfNeeded();
    await expect(jumpToPreview).toBeInViewport();
    await jumpToPreview.focus();
    await page.keyboard.press('Enter');
    await expect(preview).toBeFocused();
    await expect(preview).toBeInViewport();

    await returnToControls.focus();
    await page.keyboard.press('Enter');
    await expect(controls).toBeFocused();
    await expect(controls.locator('fieldset').first()).toBeInViewport();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  }
});

test('200% zoom disables sticky preview without clipping controls or adding horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  for (const path of editors) {
    await page.goto(path);
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    const preview = page.locator('#preview-panel');
    await expect(preview).not.toHaveCSS('position', 'sticky');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('#editor-controls input, #editor-controls select, #editor-controls button').evaluateAll((controls) => controls.every((control) => {
      const box = control.getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth;
    }))).toBe(true);
  }
});