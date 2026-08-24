import { expect, test } from '@playwright/test';

const crossEditorLinks = [
  {
    path: '/editor/',
    name: 'Need a full starting-soon scene? Build one →',
    href: '/scene-editor/',
  },
  {
    path: '/scene-editor/',
    name: '← Clock & countdown',
    href: '/editor/',
  },
] as const;

test('cross-editor links keep a shared visible keyboard focus ring at 200% zoom and in forced colors', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  for (const forcedColors of ['none', 'active'] as const) {
    await page.emulateMedia({ forcedColors });

    for (const route of crossEditorLinks) {
      await page.goto(route.path);
      await page.evaluate(() => {
        document.documentElement.style.zoom = '2';
      });

      const link = page.getByRole('link', { name: route.name });
      await expect(link).toHaveAttribute('href', route.href);
      await page.keyboard.press('Tab');
      await expect(link).toBeFocused();

      const focus = await link.evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          outlineOffset: style.outlineOffset,
          outlineColor: style.outlineColor,
          ringInsideViewport:
            rect.left >= 5 &&
            rect.top >= 5 &&
            rect.right <= innerWidth - 5 &&
            rect.bottom <= innerHeight - 5,
        };
      });

      expect(focus, `${route.path} with forced-colors ${forcedColors}`).toMatchObject({
        outlineStyle: 'solid',
        outlineWidth: '3px',
        outlineOffset: '2px',
        ringInsideViewport: true,
      });
      expect(focus.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
    }
  }
});
