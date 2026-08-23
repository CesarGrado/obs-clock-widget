import { describe, expect, it } from 'vitest';
import { encodeSceneConfig, decodeSceneConfig, hasUnsupportedSceneVersion, sceneUrl } from '../../src/config/scene-codec';
import { DEFAULT_SCENE_CONFIG, type SceneConfig } from '../../src/config/scene-defaults';
import { cloneSceneConfig } from '../../src/config/clone';

const base = (): SceneConfig => cloneSceneConfig(DEFAULT_SCENE_CONFIG);

describe('scene codec', () => {
  it('round-trips a full config', () => {
    const config = { ...base(), headline: 'PUZZLR GAME NIGHT', theme: 'puzzlr-purple', reveal: "LET'S GO!" } satisfies SceneConfig;
    const decoded = decodeSceneConfig(encodeSceneConfig(config));
    expect(decoded).toEqual(config);
  });
  it('elides default values and always sets the version', () => {
    const fragment = encodeSceneConfig(base());
    expect(fragment.startsWith('v=1')).toBe(true);
    expect(fragment).toBe('v=1');
  });
  it('emits explicit clamped weight for a 400-only font', () => {
    const config = { ...base(), headlineFont: 'bebas-neue', headlineWeight: 400 } satisfies SceneConfig;
    expect(encodeSceneConfig(config)).toContain('hf=bebas-neue');
  });
  it('rejects unknown keys, duplicate keys, and prototype pollution', () => {
    expect(decodeSceneConfig('v=1&evil=1')).toEqual(DEFAULT_SCENE_CONFIG);
    expect(decodeSceneConfig('v=1&v=1')).toEqual(DEFAULT_SCENE_CONFIG);
    expect(decodeSceneConfig('v=1&constructor=x')).toEqual(DEFAULT_SCENE_CONFIG);
  });
  it('rejects a wrong version and reports unsupported versions', () => {
    expect(decodeSceneConfig('v=2&h=hi')).toEqual(DEFAULT_SCENE_CONFIG);
    expect(hasUnsupportedSceneVersion('#v=2&h=hi')).toBe(true);
    expect(hasUnsupportedSceneVersion('#v=1&h=hi')).toBe(false);
  });
  it('falls back to defaults on over-long fragments and malformed numbers', () => {
    expect(decodeSceneConfig(`v=1&h=${'x'.repeat(2100)}`)).toEqual(DEFAULT_SCENE_CONFIG);
    expect(decodeSceneConfig('v=1&hs=NaN')).toEqual(DEFAULT_SCENE_CONFIG);
    expect(decodeSceneConfig('v=1&hs=12e3')).toEqual(DEFAULT_SCENE_CONFIG);
  });
  it('decodes overrides into a valid config', () => {
    const decoded = decodeSceneConfig('v=1&h=GAME%20NIGHT&th=neon-blue&mo=none&rd=2');
    expect(decoded.headline).toBe('GAME NIGHT');
    expect(decoded.theme).toBe('neon-blue');
    expect(decoded.motion).toBe('none');
    expect(decoded.revealDelay).toBe(2);
  });
  it('builds the scene runtime URL', () => {
    const url = sceneUrl(base(), 'https://obs-clock-widget.pages.dev/');
    expect(url).toBe('https://obs-clock-widget.pages.dev/v1/scene/#v=1');
  });
});
