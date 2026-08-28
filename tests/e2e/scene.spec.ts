import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';


test('scene editor exposes one page H1 and a named, non-heading preview', async ({ page }) => {
  await page.goto('/scene-editor/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Starting Soon Scene Builder');
  const preview = page.getByRole('region', { name: 'Scene preview' });
  await expect(preview).toBeVisible();
  await expect(preview.getByRole('heading', { level: 2, name: 'Scene preview' })).toBeVisible();
  await expect(page.locator('#preview-root .scene-headline')).toHaveText('STREAM STARTING SOON');
  await expect(page.locator('#preview-root .scene-headline')).not.toHaveRole('heading');

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

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

test('scene runtime bounds contain long text at 320x180 preview scale, 1080p, 1440p, and 4K across alignment, paint, and motion endpoints', async ({ page }) => {
  // Use a maximum-valid 48-char headline + 64-char subtitle + long reveal to stress layout.
  const h = 'A'.repeat(48), sub = 'B'.repeat(64), rv = 'C'.repeat(32);
  const frag = `#v=1&h=${encodeURIComponent(h)}&sub=${encodeURIComponent(sub)}&ct=${encodeURIComponent(new Date(Date.now() + 60_000).toISOString().replace(/\.\d+Z$/, 'Z'))}&rv=${encodeURIComponent(rv)}&hs=240&ss=240&ns=240&rs=240&hc=%23FFFFFF&sc=%23000000&nc=%23FFFFFF&rc=%23000000`;
  await page.goto(`/v1/scene/${frag}`);
  await page.evaluate(() => (document as Document & { fonts: FontFaceSet }).fonts.ready);
  const themes = ['dark-gradient', 'puzzlr-purple', 'neon-blue', 'sunset', 'minimal-black'];
  const paints = await page.locator('.scene-root').evaluate((root, values) => values.map((theme) => {
    root.setAttribute('data-theme', theme); const style = getComputedStyle(root);
    return [style.backgroundImage, style.backgroundColor];
  }), themes);
  expect(paints.every(([image, color]) => image !== 'none' || color !== 'rgba(0, 0, 0, 0)')).toBe(true);

  const motionEndpoints = [
    { motion: 'none', transform: 'none' },
    { motion: 'subtle', transform: 'translateY(-0.4%) scale(1.004)' },
    { motion: 'subtle', transform: 'translateY(0.4%) scale(1.008)' },
  ];
  const viewports = [[320, 180], [1920, 1080], [2560, 1440], [3840, 2160]] as const;
  for (const align of ['center', 'left']) for (const endpoint of motionEndpoints) for (const [index, [w, hgt]] of viewports.entries()) {
    await page.setViewportSize({ width: w, height: hgt });
    await page.locator('.scene-root').evaluate((root, state) => {
      root.setAttribute('data-align', state.align); root.setAttribute('data-motion', state.motion); root.setAttribute('data-theme', state.theme);
      const content = root.querySelector<HTMLElement>('.scene-content')!; content.style.animation = 'none'; content.style.transform = state.transform;
    }, { align, motion: endpoint.motion, transform: endpoint.transform, theme: themes[index]! });
    await page.waitForFunction(([width, height]) => {
      const root = document.querySelector<HTMLElement>('.scene-root')!;
      return root.clientWidth === width && root.clientHeight === height && getComputedStyle(root).getPropertyValue('--vw').trim() === `${width / 100}px`;
    }, [w, hgt]);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    for (const reveal of [false, true]) {
      const geometry = await page.locator('.scene-root').evaluate((root, showReveal) => {
        root.querySelector('.scene-panel')!.classList.toggle('scene-hidden', showReveal);
        root.querySelector('.scene-reveal')!.classList.toggle('scene-shown', showReveal);
        const rootBox = root.getBoundingClientRect();
        const selectors = showReveal ? ['.scene-reveal'] : ['.scene-headline', '.scene-subtitle', '.scene-number'];
        return { root: { width: rootBox.width, height: rootBox.height }, boxes: selectors.map((selector) => {
          const box = root.querySelector(selector)!.getBoundingClientRect();
          return { selector, left: box.left - rootBox.left, top: box.top - rootBox.top, right: box.right - rootBox.left, bottom: box.bottom - rootBox.top };
        }) };
      }, reveal);
      expect(Math.round(geometry.root.width)).toBe(w); expect(Math.round(geometry.root.height)).toBe(hgt);
      for (const box of geometry.boxes) {
        expect(box.left, `${align}/${endpoint.transform}/${w}/${box.selector} left`).toBeGreaterThanOrEqual(-1);
        expect(box.top, `${align}/${endpoint.transform}/${w}/${box.selector} top`).toBeGreaterThanOrEqual(-1);
        expect(box.right, `${align}/${endpoint.transform}/${w}/${box.selector} right`).toBeLessThanOrEqual(w + 1);
        expect(box.bottom, `${align}/${endpoint.transform}/${w}/${box.selector} bottom`).toBeLessThanOrEqual(hgt + 1);
      }
    }
  }
});

test('editor preview with maximum-valid text stays contained inside its 16:9 frame at narrow and wide widths, both motion endpoints', async ({ page }) => {
  for (const width of [320, 640, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/scene-editor/');
    await page.locator('label.theme-card[for="theme-puzzlr-purple"]').click();
    // Maximum-valid content: 48-char headline, 64-char subtitle, 32-char reveal.
    await page.fill('#headline', 'A'.repeat(48));
    await page.fill('#subtitle', 'B'.repeat(64));
    await page.fill('#reveal', 'C'.repeat(32));
    // Wait for ResizeObserver element-box scaling to apply.
    await page.waitForFunction(() => {
      const root = document.querySelector('#preview-root') as HTMLElement;
      return root && getComputedStyle(root).getPropertyValue('--vw').trim() !== '';
    });
    await page.waitForTimeout(60);
    for (const delay of ['0s', '-12s']) {
      await page.addStyleTag({ content: `#preview-root .scene-content{animation-play-state:paused !important;animation-delay:${delay} !important}` });
      const contained = await page.evaluate(() => {
        const frame = document.querySelector('.scene-frame')!.getBoundingClientRect();
        const elements = ['.scene-panel', '.scene-headline', '.scene-subtitle', '.scene-number', '.scene-reveal']
          .map((sel) => document.querySelector(`#preview-root ${sel}`)?.getBoundingClientRect())
          .filter((b): b is DOMRect => !!b);
        const allInside = elements.every((b) => b.left >= frame.left - 1 && b.right <= frame.right + 1 && b.top >= frame.top - 1 && b.bottom <= frame.bottom + 1);
        return { count: elements.length, allInside };
      });
      expect(contained.count).toBe(5);
      expect(contained.allInside).toBe(true);
    }
  }
});

test('scene runtime reveals at zero and respects theme and reduced-motion styling hooks', async ({ page }) => {
  const soon = new Date(Date.now() + 3_000).toISOString().replace(/\.\d+Z$/, 'Z');
  await page.goto(`/v1/scene/#v=1&h=STARTING&ct=${encodeURIComponent(soon)}&th=sunset&mo=none&rv=LIVE&rd=0`);
  await expect(page.locator('.scene-number')).toHaveText(/^00:00:0\d$/);
  await expect(page.locator('.scene-root')).toHaveAttribute('data-theme', 'sunset');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.scene-reveal')).toHaveClass(/scene-shown/, { timeout: 15_000 });
  await expect(page.locator('.scene-panel')).toHaveClass(/scene-hidden/);
});

test('scene typography groups stay full-width without unrelated label or control intersections', async ({ page }) => {
  test.setTimeout(90_000);
  for (const zoom of [1, 2]) {
    await page.goto('/scene-editor/');
    await page.evaluate((factor) => { document.documentElement.style.zoom = String(factor); }, zoom);
    for (const width of [320, 768, 900, 1280, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const geometry = await page.locator('fieldset').filter({ has: page.locator('legend', { hasText: 'Typography' }) }).evaluate((fieldset) => {
        const fieldsetBox = fieldset.getBoundingClientRect();
        const rows = [...fieldset.querySelectorAll<HTMLElement>('.type-row')];
        const items = [...fieldset.querySelectorAll<HTMLElement>('.type-row label, .type-row input, .type-row select')];
        const boxes = items.map((item) => ({ id: item.id || item.getAttribute('for') || item.textContent || item.tagName, box: item.getBoundingClientRect() }));
        const intersections: string[] = [];
        for (let left = 0; left < boxes.length; left += 1) for (let right = left + 1; right < boxes.length; right += 1) {
          const a = boxes[left]!; const b = boxes[right]!;
          if (Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left) > 0.5
            && Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top) > 0.5) intersections.push(`${a.id}/${b.id}`);
        }
        return {
          intersections,
          rowsFullWidth: rows.every((row) => row.getBoundingClientRect().width / fieldsetBox.width >= 0.7),
          controlsUnclipped: [...fieldset.querySelectorAll<HTMLElement>('input, select')].every((control) => {
            const box = control.getBoundingClientRect(); return box.left >= fieldsetBox.left && box.right <= fieldsetBox.right;
          }),
        };
      });
      expect(geometry, `width ${width} at ${zoom * 100}% zoom`).toEqual({ intersections: [], rowsFullWidth: true, controlsUnclipped: true });
    }
  }
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
