import { FONT_IDS, type FontId } from './fonts';
import { isAbsoluteIsoTarget } from '../time/countdown';
import { cloneSceneConfig } from './clone';

export const SCENE_THEMES = ['dark-gradient', 'puzzlr-purple', 'neon-blue', 'sunset', 'minimal-black'] as const;
export type SceneTheme = typeof SCENE_THEMES[number];
export const SCENE_MOTION = ['none', 'subtle'] as const;
export type SceneMotion = typeof SCENE_MOTION[number];

const text = /^[A-Za-z0-9 !?.,:'"&\-+()/·—–]*$/;

export type SceneConfig = {
  version: 1;
  headline: string;
  subtitle: string;
  countdownTarget: string;
  headlineFont: FontId; headlineSize: number; headlineWeight: 400 | 500 | 600 | 700; headlineColor: string;
  subtitleFont: FontId; subtitleSize: number; subtitleWeight: 400 | 500 | 600 | 700; subtitleColor: string;
  numberFont: FontId; numberSize: number; numberWeight: 400 | 500 | 600 | 700; numberColor: string;
  revealFont: FontId; revealSize: number; revealWeight: 400 | 500 | 600 | 700; revealColor: string;
  theme: SceneTheme; motion: SceneMotion;
  reveal: string; revealDelay: 0 | 1 | 2 | 3;
  align: 'center' | 'left';
};

export const DEFAULT_SCENE_CONFIG: SceneConfig = {
  version: 1,
  headline: 'STREAM STARTING SOON',
  subtitle: 'grab a snack, we go live shortly',
  countdownTarget: '2026-08-24T00:00:00Z',
  headlineFont: 'display', headlineSize: 96, headlineWeight: 700, headlineColor: '#FFFFFF',
  subtitleFont: 'system', subtitleSize: 36, subtitleWeight: 500, subtitleColor: '#B8C0D8',
  numberFont: 'display', numberSize: 220, numberWeight: 700, numberColor: '#FFFFFF',
  revealFont: 'display', revealSize: 140, revealWeight: 700, revealColor: '#53E0C1',
  theme: 'dark-gradient', motion: 'subtle',
  reveal: "WE'RE LIVE!", revealDelay: 1,
  align: 'center',
};

const color = /^#[0-9A-Fa-f]{6}$/;
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const inList = <T extends readonly unknown[]>(list: T, value: unknown): value is T[number] => list.includes(value);

const textOk = (value: string, min: number, max: number) => value.length >= min && value.length <= max && text.test(value);
const fontOk = (value: unknown): value is FontId => inList(FONT_IDS, value);
const sizeOk = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 10 && value <= 240;
const weightOk = (value: unknown) => inList([400, 500, 600, 700] as const, value);
const colorOk = (value: unknown) => typeof value === 'string' && color.test(value);

type ElementChecks = { font: unknown; size: unknown; weight: unknown; color: unknown };

export function normalizeSceneConfig(input: unknown): SceneConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return cloneSceneConfig(DEFAULT_SCENE_CONFIG);
  const value = input as Record<string, unknown>;
  if (own(value, '__proto__') || own(value, 'constructor') || own(value, 'prototype') || value.version !== 1
    || typeof value.headline !== 'string' || !textOk(value.headline, 1, 48)
    || typeof value.subtitle !== 'string' || !textOk(value.subtitle, 0, 64)
    || typeof value.countdownTarget !== 'string' || !isAbsoluteIsoTarget(value.countdownTarget)
    || !inList(SCENE_THEMES, value.theme) || !inList(SCENE_MOTION, value.motion)
    || typeof value.reveal !== 'string' || !textOk(value.reveal, 1, 32)
    || !inList([0, 1, 2, 3] as const, value.revealDelay)
    || !inList(['center', 'left'] as const, value.align)) return cloneSceneConfig(DEFAULT_SCENE_CONFIG);
  const el = (v: Record<string, unknown>, k: string): ElementChecks => ({ font: v[`${k}Font`], size: v[`${k}Size`], weight: v[`${k}Weight`], color: v[`${k}Color`] });
  for (const k of ['headline', 'subtitle', 'number', 'reveal'] as const) {
    const c = el(value, k);
    if (!fontOk(c.font) || !sizeOk(c.size) || !weightOk(c.weight) || !colorOk(c.color)) return cloneSceneConfig(DEFAULT_SCENE_CONFIG);
  }
  return cloneSceneConfig(value as unknown as SceneConfig);
}

