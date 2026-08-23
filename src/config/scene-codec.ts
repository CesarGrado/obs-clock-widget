import { DEFAULT_SCENE_CONFIG, type SceneConfig } from './scene-defaults';
import { cloneSceneConfig } from './clone';
import { normalizeSceneConfig } from './scene-defaults';
import { clampWeight } from './fonts';

const keys = ['v', 'h', 'sub', 'ct', 'hf', 'hs', 'hw', 'hc', 'sf', 'ss', 'sw', 'sc', 'nf', 'ns', 'nw', 'nc', 'rf', 'rs', 'rw', 'rc', 'th', 'mo', 'rv', 'rd', 'a'] as const;
const allowed = new Set<string>(keys);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const set = (p: URLSearchParams, key: string, value: unknown, fallback: unknown) => { if (!same(value, fallback)) p.set(key, String(value)); };

export function encodeSceneConfig(value: SceneConfig): string {
  const c = normalizeSceneConfig(value); const p = new URLSearchParams(); p.set('v', '1'); const d = DEFAULT_SCENE_CONFIG;
  set(p, 'h', c.headline, d.headline); set(p, 'sub', c.subtitle, d.subtitle); set(p, 'ct', c.countdownTarget, d.countdownTarget);
  const el = (k: 'headline' | 'subtitle' | 'number' | 'reveal') => {
    set(p, `${k[0]}f`, c[`${k}Font`], d[`${k}Font`]); set(p, `${k[0]}s`, c[`${k}Size`], d[`${k}Size`]);
    set(p, `${k[0]}w`, c[`${k}Weight`], d[`${k}Weight`]); set(p, `${k[0]}c`, c[`${k}Color`], d[`${k}Color`]);
  };
  (['headline', 'subtitle', 'number', 'reveal'] as const).forEach(el);
  set(p, 'th', c.theme, d.theme); set(p, 'mo', c.motion, d.motion); set(p, 'rv', c.reveal, d.reveal); set(p, 'rd', c.revealDelay, d.revealDelay);
  set(p, 'a', c.align, d.align);
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
    const numeric = (key: string, fallback: number, min: number, max: number) => { if (!p.has(key)) return fallback; const rawValue = p.get(key)!; if (!new RegExp(`^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?$`).test(rawValue)) throw new Error('Invalid number'); const n = Number(rawValue); if (n < min || n > max) throw new Error("Out of range"); return n; };
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
    // Canonical-contract check: every present value must already be in the encoder's own
    // percent-encoding. The encoder emits '+' for spaces and uppercase-hex escapes (%2F, %3A,
    // ...) via URLSearchParams, so inputs using '%20', '%41', or a raw ':' (which URLSearchParams
    // would silently normalize on the way out) are rejected. Hex case is normalized so '%2f' and
    // '%2F' are treated as equal. Partial fragments are allowed; only present keys are checked.
    const normHex = (s: string) => s.replace(/%([0-9a-fA-F]{2})/g, (_m, h) => `%${h.toUpperCase()}`);
    for (const pair of raw.split('&')) {
      const eq = pair.indexOf('=');
      const key = pair.slice(0, eq);
      const rawValue = pair.slice(eq + 1);
      const decodedValue = decodeURIComponent(rawValue.replace(/\+/g, ' '));
      // Re-encode the decoded value through URLSearchParams (the encoder's own serializer) and
      // read back the canonical encoded form via toString(), not get() (which returns decoded).
      const canonicalValue = new URLSearchParams({ [key]: decodedValue }).toString().slice(key.length + 1);
      if (normHex(canonicalValue) !== normHex(rawValue)) return cloneSceneConfig(DEFAULT_SCENE_CONFIG);
    }
    return normalizeSceneConfig(c);
  } catch { return cloneSceneConfig(DEFAULT_SCENE_CONFIG); }
}

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
