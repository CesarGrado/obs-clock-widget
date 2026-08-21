import { DEFAULT_CONFIG, type ClockConfig } from './defaults';
import { normalizeConfig } from './schema';

const keys = ['v','tz','loc','a','gap','st','sh','e1','f1','ft1','s1','w1','c1','o1','tr1','e2','f2','ft2','s2','w2','c2','o2','tr2'] as const;
const allowed = new Set<string>(keys);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const set = (p: URLSearchParams, key: string, value: unknown, fallback: unknown) => { if (!same(value, fallback)) p.set(key, String(value)); };

export function encodeConfig(value: ClockConfig): string {
  const c = normalizeConfig(value); const p = new URLSearchParams(); p.set('v', '1');
  set(p, 'tz', c.timezone, DEFAULT_CONFIG.timezone); set(p, 'loc', c.locale, DEFAULT_CONFIG.locale); set(p, 'a', c.align, DEFAULT_CONFIG.align);
  set(p, 'gap', c.gap, DEFAULT_CONFIG.gap); set(p, 'st', c.stroke, DEFAULT_CONFIG.stroke); set(p, 'sh', c.shadow, DEFAULT_CONFIG.shadow);
  c.lines.forEach((line, i) => { const n = i + 1; const d = DEFAULT_CONFIG.lines[i]!;
    set(p, `e${n}`, line.enabled ? 1 : 0, d.enabled ? 1 : 0); set(p, `f${n}`, line.format, d.format); set(p, `ft${n}`, line.font, d.font);
    set(p, `s${n}`, line.size, d.size); set(p, `w${n}`, line.weight, d.weight); set(p, `c${n}`, line.color, d.color);
    set(p, `o${n}`, line.opacity, d.opacity); set(p, `tr${n}`, line.transform, d.transform);
  });
  return p.toString();
}

export function decodeConfig(fragment: string): ClockConfig {
  try {
    const raw = fragment.replace(/^#/, '');
    if (new TextEncoder().encode(raw).length > 2048) return structuredClone(DEFAULT_CONFIG);
    decodeURIComponent(raw.replace(/\+/g, '%20'));
    const p = new URLSearchParams(raw); const seen = new Set<string>();
    for (const [key] of p) { if (!allowed.has(key) || seen.has(key) || ['__proto__','constructor','prototype'].includes(key)) return structuredClone(DEFAULT_CONFIG); seen.add(key); }
    if (p.get('v') !== '1') return structuredClone(DEFAULT_CONFIG);
    const c = structuredClone(DEFAULT_CONFIG) as ClockConfig;
    if (p.has('tz')) c.timezone = p.get('tz') as ClockConfig['timezone']; if (p.has('loc')) c.locale = p.get('loc') as ClockConfig['locale'];
    if (p.has('a')) c.align = p.get('a') as ClockConfig['align'];
    const numeric = (key: string, fallback: number) => { if (!p.has(key)) return fallback; const rawValue = p.get(key)!; if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(rawValue)) throw new Error('Invalid number'); return Number(rawValue); };
    c.gap = numeric('gap', c.gap); c.stroke = numeric('st', c.stroke); c.shadow = numeric('sh', c.shadow);
    c.lines.forEach((line, i) => { const n = i + 1;
      if (p.has(`e${n}`)) { const enabled = p.get(`e${n}`); if (enabled !== '0' && enabled !== '1') throw new Error('Invalid boolean'); line.enabled = enabled === '1'; } if (p.has(`f${n}`)) line.format = p.get(`f${n}`)!;
      if (p.has(`ft${n}`)) line.font = p.get(`ft${n}`) as typeof line.font; line.size = numeric(`s${n}`, line.size);
      line.weight = numeric(`w${n}`, line.weight) as typeof line.weight; if (p.has(`c${n}`)) line.color = p.get(`c${n}`)!;
      line.opacity = numeric(`o${n}`, line.opacity); if (p.has(`tr${n}`)) line.transform = p.get(`tr${n}`) as typeof line.transform;
    });
    return normalizeConfig(c);
  } catch { return structuredClone(DEFAULT_CONFIG); }
}

export const widgetUrl = (config: ClockConfig, origin = window.location.origin): string => `${origin.replace(/\/$/, '')}/v1/clock/#${encodeConfig(config)}`;
export const URL_WARNING_LENGTH = 1800;
