import { describe, expect, it } from 'vitest';
import { encodeSceneConfig, decodeSceneConfig, hasUnsupportedSceneVersion, sceneUrl } from '../../src/config/scene-codec';
import { DEFAULT_SCENE_CONFIG, type SceneConfig } from '../../src/config/scene-defaults';
import { cloneSceneConfig } from '../../src/config/clone';

const base = (): SceneConfig => cloneSceneConfig(DEFAULT_SCENE_CONFIG);

describe('scene codec', () => {
  const colorLike = (v: string) => /^#[0-9A-Fa-f]{6}$/.test(v);
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
    const decoded = decodeSceneConfig('v=1&h=GAME+NIGHT&th=neon-blue&mo=none&rd=2');
    expect(decoded.headline).toBe('GAME NIGHT');
    expect(decoded.theme).toBe('neon-blue');
    expect(decoded.motion).toBe('none');
    expect(decoded.revealDelay).toBe(2);
  });
  it('clamps to an available weight and requires the canonical form', () => {
    // Font-only fragment is NONCANONICAL: switching to a 400-only font clamps the inherited
    // default weight 700 -> 400, which the canonical encoder must emit as hw=400. So the partial
    // input is rejected by the byte-for-byte contract.
    expect(decodeSceneConfig('v=1&hf=bebas-neue')).toEqual(DEFAULT_SCENE_CONFIG);
    for (const [prefix] of [['sf'], ['nf'], ['rf']] as const) {
      expect(decodeSceneConfig(`v=1&${prefix}=bebas-neue`)).toEqual(DEFAULT_SCENE_CONFIG);
    }
    // The CANONICAL form (with the clamped weight explicitly present) is accepted and preserved.
    const d2 = decodeSceneConfig('v=1&hf=bebas-neue&hw=400');
    expect(d2.headlineFont).toBe('bebas-neue');
    expect(d2.headlineWeight).toBe(400);
    expect(encodeSceneConfig(d2)).toBe('v=1&hf=bebas-neue&hw=400');
    // A noncanonical explicit weight (700 is not available for bebas-neue) is rejected.
    expect(decodeSceneConfig('v=1&hf=bebas-neue&hw=700')).toEqual(DEFAULT_SCENE_CONFIG);
  });
  it('rejects out-of-range numerics instead of silently clamping', () => {
    expect(decodeSceneConfig('v=1&hs=999')).toEqual(DEFAULT_SCENE_CONFIG);
    expect(decodeSceneConfig('v=1&hs=9')).toEqual(DEFAULT_SCENE_CONFIG);
    expect(decodeSceneConfig('v=1&rd=4')).toEqual(DEFAULT_SCENE_CONFIG);
    expect(decodeSceneConfig('v=1&rd=-1')).toEqual(DEFAULT_SCENE_CONFIG);
    expect(decodeSceneConfig('v=1&hw=350')).toEqual(DEFAULT_SCENE_CONFIG);
    expect(decodeSceneConfig('v=1&hw=800')).toEqual(DEFAULT_SCENE_CONFIG);
  });
  it('enforces canonical key order, default-field omission, exact raw encoding, and rejects noncanonical fragments', () => {
    // Must REJECT — noncanonical key order.
    expect(decodeSceneConfig('h=GAME&v=1')).toEqual(DEFAULT_SCENE_CONFIG);
    // Must REJECT — redundant default-valued field (encoder omits it).
    expect(decodeSceneConfig('v=1&h=STREAM+STARTING+SOON')).toEqual(DEFAULT_SCENE_CONFIG);
    // Must REJECT — noncanonical raw encodings (decoder must NOT normalize them).
    expect(decodeSceneConfig('v=1&h=%41')).toEqual(DEFAULT_SCENE_CONFIG);          // %41 should be 'A'
    expect(decodeSceneConfig('v=1&h=GAME%20NIGHT')).toEqual(DEFAULT_SCENE_CONFIG);  // encoder emits '+'
    expect(decodeSceneConfig('v=1&ct=2026-09-01T23:59:00Z')).toEqual(DEFAULT_SCENE_CONFIG); // ':' should be %3A
    // Must REJECT — lowercase percent hex (encoder emits uppercase %2F / %3A).
    expect(decodeSceneConfig('v=1&h=GAME%2fNIGHT')).toEqual(DEFAULT_SCENE_CONFIG);
    expect(decodeSceneConfig('v=1&ct=2026-09-01T23%3a59%3a00Z')).toEqual(DEFAULT_SCENE_CONFIG);
    // Must REJECT — font-only fragment: clamping the inherited weight yields 'hw=400', so the
    // partial input is not byte-for-byte stable (the canonical encoder emits the extra field).
    expect(decodeSceneConfig('v=1&hf=bebas-neue')).toEqual(DEFAULT_SCENE_CONFIG);
    // Other default-valued redundancies are also rejected.
    expect(decodeSceneConfig('v=1&th=dark-gradient')).toEqual(DEFAULT_SCENE_CONFIG);
    expect(decodeSceneConfig('v=1&mo=subtle')).toEqual(DEFAULT_SCENE_CONFIG);
    expect(decodeSceneConfig('v=1&rd=1')).toEqual(DEFAULT_SCENE_CONFIG);
    expect(decodeSceneConfig('v=1&a=center')).toEqual(DEFAULT_SCENE_CONFIG);
    // Must ACCEPT — empty (all defaults) canonical fragment.
    expect(decodeSceneConfig('v=1')).toEqual(DEFAULT_SCENE_CONFIG);
    // Must ACCEPT — valid partial canonical fragment (non-default headline, canonical order).
    const ok = decodeSceneConfig('v=1&h=GAME');
    expect(ok.headline).toBe('GAME');
    // Must ACCEPT — canonical '+' encoding and uppercase %3A colons.
    const ok2 = decodeSceneConfig('v=1&h=GAME+NIGHT&ct=2026-09-01T23%3A59%3A00Z');
    expect(ok2.headline).toBe('GAME NIGHT');
    expect(ok2.countdownTarget).toBe('2026-09-01T23:59:00Z');
    // Must ACCEPT — uppercase hex escapes round-trip.
    expect(decodeSceneConfig('v=1&h=GAME%2FNIGHT').headline).toBe('GAME/NIGHT');
  });
  it('round-trips canonical fragments byte-for-byte (decode then re-encode equals input)', () => {
    // Uses a non-default ct so it is not elided as a default during re-encode. Key order follows
    // the encoder's own emission order (h, sub, ct, ...), which is the canonical form.
    const canonical = 'v=1&h=GAME+NIGHT&sub=see+you+soon&ct=2026-12-31T23%3A59%3A00Z&th=neon-blue&mo=none&rv=GO&rd=2';
    const decoded = decodeSceneConfig(canonical);
    expect(encodeSceneConfig(decoded)).toBe(canonical);
    // Every accepted canonical fragment round-trips byte-for-byte.
    for (const frag of [
      'v=1&h=GAME',
      'v=1&h=GAME+NIGHT&ct=2026-09-01T23%3A59%3A00Z',
      'v=1&h=GAME+NIGHT&sub=see+you+soon&ct=2026-12-31T23%3A59%3A00Z&th=neon-blue&mo=none&rv=GO&rd=2',
    ]) {
      expect(encodeSceneConfig(decodeSceneConfig(frag))).toBe(frag);
    }
  });
  it('survives fuzzed fragments and rejects injection payloads', () => {
    const payloads = ['', '#', 'v', '=1', 'v=1&', '%', '%zz', 'v=1&h=%zz', 'v=1&h=<script>alert(1)</script>',
      'v=1&h=<img src=x onerror=alert(1)>', 'v=1&th=__proto__', 'v=1&th=constructor', 'v=1&h=javascript:alert(1)',
      'v=1&hc=;background:url(x)', 'v=1&ct=</textarea>', 'v=1&v=1&v=1', 'v=1&=x', 'v=1&&&'];
    for (const payload of payloads) {
      const decoded = decodeSceneConfig(payload);
      // Always a fully valid canonical config, never a crash.
      expect(decoded.version).toBe(1);
      expect(decoded.headline).toMatch(/^[A-Za-z0-9 !?.,:'"&\-+()/·—–]*$/);
      expect(() => encodeSceneConfig(decoded)).not.toThrow();
    }
    // Deterministic pseudo-random fuzz: keys/values must never break the invariants.
    let seed = 42; const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789=&%-_#<>"\'';
    for (let i = 0; i < 300; i++) {
      const length = 1 + Math.floor(rand() * 60);
      let fragment = '';
      for (let j = 0; j < length; j++) fragment += alphabet[Math.floor(rand() * alphabet.length)];
      const decoded = decodeSceneConfig(fragment);
      expect(decoded.version).toBe(1);
      expect(decoded.headlineSize).toBeGreaterThanOrEqual(10); expect(decoded.headlineSize).toBeLessThanOrEqual(240);
      expect(colorLike(decoded.headlineColor)).toBe(true);
    }
  });
  it('builds the scene runtime URL', () => {
    const url = sceneUrl(base(), 'https://obs-clock-widget.pages.dev/');
    expect(url).toBe('https://obs-clock-widget.pages.dev/v1/scene/#v=1');
  });
});
