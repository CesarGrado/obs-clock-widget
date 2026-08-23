import { describe, expect, it } from 'vitest';
import { normalizeSceneConfig, DEFAULT_SCENE_CONFIG, SCENE_THEMES, type SceneConfig } from '../../src/config/scene-defaults';
import { cloneSceneConfig } from '../../src/config/clone';

const base = (): SceneConfig => cloneSceneConfig(DEFAULT_SCENE_CONFIG);

describe('scene schema', () => {
  it('accepts the default config', () => {
    expect(normalizeSceneConfig(DEFAULT_SCENE_CONFIG)).toEqual(DEFAULT_SCENE_CONFIG);
  });
  it('rejects non-objects, wrong version, and prototype pollution', () => {
    expect(normalizeSceneConfig(null)).toEqual(DEFAULT_SCENE_CONFIG);
    expect(normalizeSceneConfig('nope')).toEqual(DEFAULT_SCENE_CONFIG);
    expect(normalizeSceneConfig({ ...base(), version: 2 })).toEqual(DEFAULT_SCENE_CONFIG);
    expect(normalizeSceneConfig(JSON.parse('{"version":1,"__proto__":{"x":1}}'))).toEqual(DEFAULT_SCENE_CONFIG);
  });
  it('rejects empty or over-long headlines and bad characters', () => {
    expect(normalizeSceneConfig({ ...base(), headline: '' })).toEqual(DEFAULT_SCENE_CONFIG);
    expect(normalizeSceneConfig({ ...base(), headline: 'x'.repeat(49) })).toEqual(DEFAULT_SCENE_CONFIG);
    expect(normalizeSceneConfig({ ...base(), headline: 'bad\x00chars' })).toEqual(DEFAULT_SCENE_CONFIG);
    expect(normalizeSceneConfig({ ...base(), headline: 'STREAM STARTING SOON!' })).not.toEqual(DEFAULT_SCENE_CONFIG);
  });
  it('allows empty subtitle (hidden) but caps length', () => {
    expect(normalizeSceneConfig({ ...base(), subtitle: '' })!.subtitle).toBe('');
    expect(normalizeSceneConfig({ ...base(), subtitle: 's'.repeat(65) })).toEqual(DEFAULT_SCENE_CONFIG);
  });
  it('requires an absolute ISO countdown target', () => {
    expect(normalizeSceneConfig({ ...base(), countdownTarget: 'soon' })).toEqual(DEFAULT_SCENE_CONFIG);
    expect(normalizeSceneConfig({ ...base(), countdownTarget: '2026-08-24T18:30:00Z' })!.countdownTarget).toBe('2026-08-24T18:30:00Z');
  });
  it('rejects unknown themes and motion values', () => {
    expect(normalizeSceneConfig({ ...base(), theme: 'hot-pink' })).toEqual(DEFAULT_SCENE_CONFIG);
    expect(normalizeSceneConfig({ ...base(), motion: 'fast' })).toEqual(DEFAULT_SCENE_CONFIG);
    expect(SCENE_THEMES).toContain('puzzlr-purple');
  });
  it('clamps fonts to the registry and sizes/colors/weights to ranges', () => {
    expect(normalizeSceneConfig({ ...base(), headlineFont: 'not-a-font' })).toEqual(DEFAULT_SCENE_CONFIG);
    expect(normalizeSceneConfig({ ...base(), headlineSize: 9 })).toEqual(DEFAULT_SCENE_CONFIG);
    expect(normalizeSceneConfig({ ...base(), headlineSize: 300 })).toEqual(DEFAULT_SCENE_CONFIG);
    expect(normalizeSceneConfig({ ...base(), headlineColor: 'red' })).toEqual(DEFAULT_SCENE_CONFIG);
    expect(normalizeSceneConfig({ ...base(), headlineWeight: 900 })).toEqual(DEFAULT_SCENE_CONFIG);
  });
  it('caps the reveal message and delay choices', () => {
    expect(normalizeSceneConfig({ ...base(), reveal: 'r'.repeat(33) })).toEqual(DEFAULT_SCENE_CONFIG);
    expect(normalizeSceneConfig({ ...base(), revealDelay: 4 })).toEqual(DEFAULT_SCENE_CONFIG);
    expect(normalizeSceneConfig({ ...base(), reveal: "WE'RE LIVE!", revealDelay: 2 })!.reveal).toBe("WE'RE LIVE!");
  });
  it('accepts only center or left alignment', () => {
    expect(normalizeSceneConfig({ ...base(), align: 'right' })).toEqual(DEFAULT_SCENE_CONFIG);
    expect(normalizeSceneConfig({ ...base(), align: 'left' })!.align).toBe('left');
  });
});
