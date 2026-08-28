import { decodeSceneConfig, encodeSceneConfig } from './scene-codec';
import type { SceneConfig } from './scene-defaults';

const CANONICAL_ORIGIN = 'https://obs-clock-widget.pages.dev';
const PRODUCTION_ORIGIN = 'https://timer.puxxlr.com';
const MAX_FRAGMENT_BYTES = 2048;
const fullUrlLike = /^[A-Za-z][A-Za-z\d+.-]*:/;

export type SceneConfigImportResult =
  | { ok: true; config: SceneConfig }
  | { ok: false };

function payloadFromInput(value: string, currentOrigin: string): string | null {
  const input = value.trim();
  if (!input || Array.from(input).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 32 || code === 127;
  })) return null;

  if (!fullUrlLike.test(input)) {
    const payload = input.replace(/^#/, '');
    return !payload || /[?#]/.test(payload) || payload.startsWith('/') || /\s/.test(payload) ? null : payload;
  }

  let url: URL;
  let deploymentOrigin: string;
  try {
    url = new URL(input);
    deploymentOrigin = new URL(currentOrigin).origin;
  } catch {
    return null;
  }
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) return null;
  if (![deploymentOrigin, CANONICAL_ORIGIN, PRODUCTION_ORIGIN].includes(url.origin)) return null;
  if (url.search) return null;
  const rawPath = input.match(/^[A-Za-z][A-Za-z\d+.-]*:\/\/[^/?#]*([^?#]*)/)?.[1];
  if ((rawPath !== '/v1/scene/' && rawPath !== '/v1/scene') || (url.pathname !== '/v1/scene/' && url.pathname !== '/v1/scene')) return null;
  return url.hash && url.hash !== '#' ? url.hash.slice(1) : null;
}

export function parseSceneConfigImport(value: string, currentOrigin = window.location.origin): SceneConfigImportResult {
  const payload = payloadFromInput(value, currentOrigin);
  if (!payload || new TextEncoder().encode(payload).length > MAX_FRAGMENT_BYTES) return { ok: false };

  try {
    decodeURIComponent(payload.replace(/\+/g, '%20'));
    const config = decodeSceneConfig(payload);
    return encodeSceneConfig(config) === payload ? { ok: true, config } : { ok: false };
  } catch {
    return { ok: false };
  }
}
