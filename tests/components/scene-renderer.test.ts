import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderScene } from '../../src/scene/renderer';
import { DEFAULT_SCENE_CONFIG } from '../../src/config/scene-defaults';
import { cloneSceneConfig } from '../../src/config/clone';

beforeEach(() => { document.body.innerHTML = '<main id="scene-root"></main>'; });

describe('scene renderer', () => {
  it('renders headline, subtitle, and live countdown text', () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const root = document.querySelector('#scene-root') as HTMLElement;
    const config = { ...cloneSceneConfig(DEFAULT_SCENE_CONFIG), countdownTarget: '2026-08-22T13:00:00Z' };
    renderScene(root, config);
    expect(root.querySelector('.scene-headline')?.textContent).toBe('STREAM STARTING SOON');
    expect(root.querySelector('.scene-subtitle')?.textContent).toBe('grab a snack, we go live shortly');
    expect(root.querySelector('.scene-number')?.textContent).toBe('01:00:00');
    expect(root.getAttribute('data-theme')).toBe('dark-gradient');
    vi.useRealTimers();
  });
  it('hides the subtitle when empty and applies alignment', () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const root = document.querySelector('#scene-root') as HTMLElement;
    renderScene(root, { ...cloneSceneConfig(DEFAULT_SCENE_CONFIG), subtitle: '', align: 'left' });
    expect(root.querySelector('.scene-subtitle')).toBeNull();
    expect(root.getAttribute('data-align')).toBe('left');
    vi.useRealTimers();
  });
  it('shows the zero hold then crossfades to the reveal message', () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const root = document.querySelector('#scene-root') as HTMLElement;
    const config = { ...cloneSceneConfig(DEFAULT_SCENE_CONFIG), countdownTarget: '2026-08-22T12:00:00Z' };
    const controls = renderScene(root, config);
    expect(root.querySelector('.scene-number')?.textContent).toBe('00:00:00');
    expect(root.querySelector('.scene-reveal')?.classList.contains('scene-shown')).toBe(false);
    controls.update.call(null);
    vi.setSystemTime(new Date('2026-08-22T12:00:06Z'));
    controls.update();
    expect(root.querySelector('.scene-panel')?.classList.contains('scene-hidden')).toBe(true);
    expect(root.querySelector('.scene-reveal')?.classList.contains('scene-shown')).toBe(true);
    expect(root.querySelector('.scene-reveal')?.textContent).toBe("WE'RE LIVE!");
    controls.stop(); vi.useRealTimers();
  });
  it('supports the zero-state preview toggle controls', () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const root = document.querySelector('#scene-root') as HTMLElement;
    const controls = renderScene(root, { ...cloneSceneConfig(DEFAULT_SCENE_CONFIG), countdownTarget: '2026-08-23T12:00:00Z' });
    controls.showReveal();
    expect(root.querySelector('.scene-reveal')?.classList.contains('scene-shown')).toBe(true);
    controls.hideReveal();
    expect(root.querySelector('.scene-reveal')?.classList.contains('scene-shown')).toBe(false);
    expect(root.querySelector('.scene-panel')?.classList.contains('scene-hidden')).toBe(false);
    controls.stop(); vi.useRealTimers();
  });
});
