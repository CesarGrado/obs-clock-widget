import { encodeConfig } from './codec';
import { cloneClockConfig } from './clone';
import { DEFAULT_CONFIG, type ClockConfig } from './defaults';
import { normalizeConfig } from './schema';

export const CANONICAL_ORIGIN = 'https://obs-clock-widget.pages.dev';
export const MAX_FRAGMENT_BYTES = 2048;

export type ConfigImportErrorCode =
  | 'empty'
  | 'malformed-escape'
  | 'duplicate-key'
  | 'oversized-fragment'
  | 'invalid-key'
  | 'unsupported-version'
  | 'invalid-value'
  | 'invalid-url'
  | 'invalid-protocol'
  | 'credentials'
  | 'foreign-origin'
  | 'query-config'
  | 'wrong-route'
  | 'fragment-required'
  | 'raw-fragment-only'
  | 'noncanonical-fragment';

export type ConfigImportResult =
  | { ok: true; config: ClockConfig }
  | { ok: false; code: ConfigImportErrorCode };

const keys = ['v','m','ct','ot','tz','loc','a','gap','st','sh','e1','f1','ft1','s1','w1','c1','o1','tr1','e2','f2','ft2','s2','w2','c2','o2','tr2'] as const;
const allowedKeys: ReadonlySet<string> = new Set(keys);
const forbiddenKeys: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);
const fullUrlLike = /^[A-Za-z][A-Za-z\d+.-]*:/;
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const error = (code: ConfigImportErrorCode): ConfigImportResult => ({ ok: false, code });

function payloadFromInput(value: string, currentOrigin: string): string | ConfigImportResult {
  const input = value.trim();
  if (!input) return error('empty');
  if (Array.from(input).some((character) => { const code = character.charCodeAt(0); return code <= 32 || code === 127; })) return error('noncanonical-fragment');
  if (!fullUrlLike.test(input)) {
    const payload = input.replace(/^#/, '');
    if (!payload || /[?#]/.test(payload) || payload.startsWith('/') || /\s/.test(payload)) return error('raw-fragment-only');
    return payload;
  }

  let url: URL;
  try { url = new URL(input); } catch { return error('invalid-url'); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return error('invalid-protocol');
  if (url.username || url.password) return error('credentials');
  let deploymentOrigin: string;
  try { deploymentOrigin = new URL(currentOrigin).origin; } catch { return error('invalid-url'); }
  if (url.origin !== deploymentOrigin && url.origin !== CANONICAL_ORIGIN) return error('foreign-origin');
  if (url.search) return error('query-config');
  const rawPath = input.match(/^[A-Za-z][A-Za-z\d+.-]*:\/\/[^/?#]*([^?#]*)/)?.[1];
  if ((rawPath !== '/v1/clock/' && rawPath !== '/v1/clock') || (url.pathname !== '/v1/clock/' && url.pathname !== '/v1/clock')) return error('wrong-route');
  if (!url.hash || url.hash === '#') return error('fragment-required');
  return url.hash.slice(1);
}

export function parseConfigImport(value: string, currentOrigin = window.location.origin): ConfigImportResult {
  const payload = payloadFromInput(value, currentOrigin);
  if (typeof payload !== 'string') return payload;
  if (new TextEncoder().encode(payload).length > MAX_FRAGMENT_BYTES) return error('oversized-fragment');

  try {
    decodeURIComponent(payload.replace(/\+/g, '%20'));
    const params = new URLSearchParams(payload);
    const seen = new Set<string>();
    for (const [key] of params) {
      if (seen.has(key)) return error('duplicate-key');
      seen.add(key);
      if (!allowedKeys.has(key) || forbiddenKeys.has(key)) return error('invalid-key');
    }
    const version = params.get('v');
    if (version !== '1') return /^\d+$/.test(version ?? '') && version !== null ? error('unsupported-version') : error('invalid-value');

    const config = cloneClockConfig(DEFAULT_CONFIG);
    if (params.has('m')) config.mode = params.get('m') as ClockConfig['mode'];
    if (params.has('ct')) config.countdownTarget = params.get('ct')!;
    if (params.has('ot')) {
      const overtime = params.get('ot');
      if (overtime !== '0' && overtime !== '1') throw new Error('invalid');
      config.overtime = overtime === '1';
    }
    if (params.has('tz')) config.timezone = params.get('tz') as ClockConfig['timezone'];
    if (params.has('loc')) config.locale = params.get('loc') as ClockConfig['locale'];
    if (params.has('a')) config.align = params.get('a') as ClockConfig['align'];
    const numeric = (key: string, fallback: number) => {
      if (!params.has(key)) return fallback;
      const raw = params.get(key)!;
      if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw)) throw new Error('invalid');
      return Number(raw);
    };
    config.gap = numeric('gap', config.gap);
    config.stroke = numeric('st', config.stroke);
    config.shadow = numeric('sh', config.shadow);
    config.lines.forEach((line, index) => {
      const number = index + 1;
      if (params.has(`e${number}`)) {
        const enabled = params.get(`e${number}`);
        if (enabled !== '0' && enabled !== '1') throw new Error('invalid');
        line.enabled = enabled === '1';
      }
      if (params.has(`f${number}`)) line.format = params.get(`f${number}`)!;
      if (params.has(`ft${number}`)) line.font = params.get(`ft${number}`) as typeof line.font;
      line.size = numeric(`s${number}`, line.size);
      line.weight = numeric(`w${number}`, line.weight) as typeof line.weight;
      if (params.has(`c${number}`)) line.color = params.get(`c${number}`)!;
      line.opacity = numeric(`o${number}`, line.opacity);
      if (params.has(`tr${number}`)) line.transform = params.get(`tr${number}`) as typeof line.transform;
    });
    const normalized = normalizeConfig(config);
    if (!same(normalized, config)) return error('invalid-value');
    return payload === encodeConfig(normalized) ? { ok: true, config: normalized } : error('noncanonical-fragment');
  } catch (cause) {
    return cause instanceof URIError ? error('malformed-escape') : error('invalid-value');
  }
}
