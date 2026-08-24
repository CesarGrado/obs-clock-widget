import { DEFAULT_SCENE_CONFIG, type SceneConfig } from './scene-defaults';
import { cloneSceneConfig } from './clone';
import { normalizeSceneConfig } from './scene-defaults';
import { clampWeight } from './fonts';

// Canonical key order. The encoder emits keys in this order and omits any key whose value equals
// the default, so `v` (always '1') leads and partial fragments are valid prefixes. The decoder
// enforces this same order and rejects redundant default-valued keys.
const KEYS = ['v', 'h', 'sub', 'ct', 'hf', 'hs', 'hw', 'hc', 'sf', 'ss', 'sw', 'sc', 'nf', 'ns', 'nw', 'nc', 'rf', 'rs', 'rw', 'rc', 'th', 'mo', 'rv', 'rd', 'a'] as const;
const allowed = new Set<string>(KEYS);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const set = (p: URLSearchParams, key: string, value: unknown, fallback: unknown) => { if (!same(value, fallback)) p.set(key, String(value)); };

// The encoder's canonical (key, encodedValue) sequence for a config. Defaults are omitted, so a
// fragment carrying a default-valued key is NOT canonical and must be rejected by the decoder.
export function canonicalPairs(value: SceneConfig): Array<[string, string]> {
  const c = normalizeSceneConfig(value); const d = DEFAULT_SCENE_CONFIG;
  const p = new URLSearchParams(); p.set('v', '1');
  set(p, 'h', c.headline, d.headline); set(p, 'sub', c.subtitle, d.subtitle); set(p, 'ct', c.countdownTarget, d.countdownTarget);
  const el = (k: 'headline' | 'subtitle' | 'number' | 'reveal') => {
    set(p, `${k[0]}f`, c[`${k}Font`], d[`${k}Font`]); set(p, `${k[0]}s`, c[`${k}Size`], d[`${k}Size`]);
    set(p, `${k[0]}w`, c[`${k}Weight`], d[`${k}Weight`]); set(p, `${k[0]}c`, c[`${k}Color`], d[`${k}Color`]);
  };
  (['headline', 'subtitle', 'number', 'reveal'] as const).forEach(el);
  set(p, 'th', c.theme, d.theme); set(p, 'mo', c.motion, d.motion); set(p, 'rv', c.reveal, d.reveal); set(p, 'rd', c.revealDelay, d.revealDelay);
  set(p, 'a', c.align, d.align);
  return Array.from(p.entries()) as Array<[string, string]>;
}

export function encodeSceneConfig(value: SceneConfig): string {
  const p = new URLSearchParams();
  for (const [k, v] of canonicalPairs(value)) p.set(k, v);
  return p.toString();
}

export function decodeSceneConfig(fragment: string): SceneConfig {
  try {
    const raw = fragment.replace(/^#/, '');
    if (new TextEncoder().encode(raw).length > 2048) return cloneSceneConfig(DEFAULT_SCENE_CONFIG);
    decodeURIComponent(raw.replace(/\+/g, '%20'));
    // Strict canonical form: only single '&' between "key=value" pairs, no empty keys/values,
    // no leading/trailing/double separators. URLSearchParams would silently drop these, so reject.
    if (!/^(?:[a-z0-9]+=[A-Za-z0-9%\-._~:/?=+$,'!*()]+)(?:&[a-z0-9]+=[A-Za-z0-9%\-._~:/?=+$,'!*()]+)*$/.test(raw)) return cloneSceneConfig(DEFAULT_SCENE_CONFIG);
    const p = new URLSearchParams(raw); const seen = new Set<string>();
    for (const [key] of p) { if (!allowed.has(key) || seen.has(key) || ['__proto__', 'constructor', 'prototype'].includes(key)) return cloneSceneConfig(DEFAULT_SCENE_CONFIG); seen.add(key); }
    if (p.get('v') !== '1') return cloneSceneConfig(DEFAULT_SCENE_CONFIG);
    const c = cloneSceneConfig(DEFAULT_SCENE_CONFIG);
    if (p.has('h')) c.headline = p.get('h')!;
    if (p.has('sub')) c.subtitle = p.get('sub')!;
    if (p.has('ct')) c.countdownTarget = p.get('ct')!;
    const numeric = (key: string, fallback: number, min: number, max: number) => { if (!p.has(key)) return fallback; const rawValue = p.get(key)!; if (!new RegExp(`^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?$`).test(rawValue)) throw new Error('Invalid number'); const n = Number(rawValue); if (n < min || n > max) throw new Error('Out of range'); return n; };
    for (const k of ['headline', 'subtitle', 'number', 'reveal'] as const) {
      const pfx = k[0];
      if (p.has(`${pfx}f`)) (c as Record<string, unknown>)[`${k}Font`] = p.get(`${pfx}f`)!;
      (c as Record<string, unknown>)[`${k}Size`] = numeric(`${pfx}s`, (c as Record<string, unknown>)[`${k}Size`] as number, 10, 240);
      if (p.has(`${pfx}w`)) { const w = numeric(`${pfx}w`, 700, 400, 700); (c as Record<string, unknown>)[`${k}Weight`] = clampWeight((c as Record<string, unknown>)[`${k}Font`] as SceneConfig['headlineFont'], w); }
      if (p.has(`${pfx}c`)) (c as Record<string, unknown>)[`${k}Color`] = p.get(`${pfx}c`)!;
    }
    if (p.has('th')) c.theme = p.get('th') as SceneConfig['theme'];
    if (p.has('mo')) c.motion = p.get('mo') as SceneConfig['motion'];
    if (p.has('rv')) c.reveal = p.get('rv')!;
    if (p.has('rd')) c.revealDelay = numeric('rd', c.revealDelay, 0, 3) as SceneConfig['revealDelay'];
    if (p.has('a')) c.align = p.get('a') as SceneConfig['align'];

    // Canonical-contract check: the raw fragment must be an ordered subsequence of the encoder's
    // canonical key/value pairs. This enforces (a) canonical key order, (b) rejection of redundant
    // default-valued keys the encoder would omit, and (c) exact raw percent-encoding: the raw value
    // must equal the encoder's own serialization. We normalize only hex CASE (so %2f == %2F) but
    // leave '+' vs '%20' and '%41' vs 'A' distinct, so noncanonical encodings are rejected.
    const canonical = canonicalPairs(c);
    const canonicalKeys = canonical.map(([k]) => k);
    if (!isOrderedSubsequence(rawKeys(raw), canonicalKeys)) return cloneSceneConfig(DEFAULT_SCENE_CONFIG);
    for (const [key, rawValue] of rawPairs(raw)) {
      const expected = canonical.find(([k]) => k === key)?.[1];
      if (expected === undefined) return cloneSceneConfig(DEFAULT_SCENE_CONFIG); // redundant default key
      // Re-encode the canonical (decoded) value the same way the encoder serializes it, then compare
      // raw-to-raw. This rejects %41/%20/raw-colon while accepting + and %2F (hex-case normalized).
      const expectedRaw = new URLSearchParams({ [key]: expected }).toString().slice(key.length + 1);
      if (normHex(rawValue) !== normHex(expectedRaw)) return cloneSceneConfig(DEFAULT_SCENE_CONFIG);
    }
    return normalizeSceneConfig(c);
  } catch { return cloneSceneConfig(DEFAULT_SCENE_CONFIG); }
}

const normHex = (s: string) => s.replace(/%([0-9a-fA-F]{2})/g, (_m, h) => `%${h.toUpperCase()}`);
const rawKeys = (raw: string): string[] => raw.split('&').map((pair) => pair.slice(0, pair.indexOf('=')));
const rawPairs = (raw: string): Array<[string, string]> => raw.split('&').map((pair) => { const eq = pair.indexOf('='); return [pair.slice(0, eq), pair.slice(eq + 1)]; });
const isOrderedSubsequence = (sub: string[], full: string[]): boolean => {
  let i = 0;
  for (const item of full) { if (sub[i] === item) i++; if (i === sub.length) return true; }
  return i === sub.length;
};

export function hasUnsupportedSceneVersion(fragment: string): boolean {
  try {
    const raw = fragment.replace(/^#/, '');
    if (new TextEncoder().encode(raw).length > 2048) return false;
    decodeURIComponent(raw.replace(/\+/g, '%20'));
    const versions = new URLSearchParams(raw).getAll('v');
    return versions.length === 1 && /^\d+$/.test(versions[0]!) && versions[0] !== '1';
  } catch { return false; }
}

export const sceneUrl = (config: SceneConfig, origin = window.location.origin): string => `${origin.replace(/\/$/, '')}/v1/scene/#${encodeSceneConfig(config)}`;
