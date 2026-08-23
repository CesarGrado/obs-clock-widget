import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderScene } from '../../src/scene/renderer';
import { DEFAULT_SCENE_CONFIG } from '../../src/config/scene-defaults';
import { cloneSceneConfig } from '../../src/config/clone';
import type { SceneConfig } from '../../src/config/scene-defaults';

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
    const config = { ...cloneSceneConfig(DEFAULT_SCENE_CONFIG), countdownTarget: '2026-08-22T12:00:00Z', revealDelay: 0 } satisfies SceneConfig;
    const controls = renderScene(root, config);
    expect(root.querySelector('.scene-number')?.textContent).toBe('00:00:00');
    expect(root.querySelector('.scene-reveal')?.classList.contains('scene-shown')).toBe(false);
    vi.setSystemTime(new Date('2026-08-22T12:00:06Z'));
    controls.update();
    expect(root.querySelector('.scene-panel')?.classList.contains('scene-hidden')).toBe(true);
    expect(root.querySelector('.scene-reveal')?.classList.contains('scene-shown')).toBe(true);
    expect(root.querySelector('.scene-reveal')?.textContent).toBe("WE'RE LIVE!");
    controls.stop(); vi.useRealTimers();
  });
  it('honors reveal delay boundary exactly: rd=0 reveals 5s after zero, each step adds a minute', () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const root = document.querySelector('#scene-root') as HTMLElement;
    const target = '2026-08-22T12:00:00Z';
    // rd=0: hidden at +4.9s, shown at +5.1s.
    const c0 = renderScene(root, { ...cloneSceneConfig(DEFAULT_SCENE_CONFIG), countdownTarget: target, revealDelay: 0 } satisfies SceneConfig);
    vi.setSystemTime(new Date('2026-08-22T12:00:04Z').getTime() + 900);
    c0.update();
    expect(root.querySelector('.scene-reveal')?.classList.contains('scene-shown')).toBe(false);
    vi.setSystemTime(new Date('2026-08-22T12:00:05Z').getTime() + 100);
    c0.update();
    expect(root.querySelector('.scene-reveal')?.classList.contains('scene-shown')).toBe(true);
    c0.stop(); vi.useRealTimers();
  });
  it('reveal delay rd=2 reveals exactly 2 minutes + 5s after zero', () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const root = document.querySelector('#scene-root') as HTMLElement;
    const c2 = renderScene(root, { ...cloneSceneConfig(DEFAULT_SCENE_CONFIG), countdownTarget: '2026-08-22T12:00:00Z', revealDelay: 2 } satisfies SceneConfig);
    vi.setSystemTime(new Date('2026-08-22T12:02:04Z').getTime() + 900);
    c2.update();
    expect(root.querySelector('.scene-reveal')?.classList.contains('scene-shown')).toBe(false);
    vi.setSystemTime(new Date('2026-08-22T12:02:05Z').getTime() + 100);
    c2.update();
    expect(root.querySelector('.scene-reveal')?.classList.contains('scene-shown')).toBe(true);
    c2.stop(); vi.useRealTimers();
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
