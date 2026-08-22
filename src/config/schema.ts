import { DEFAULT_CONFIG, FONT_IDS, LOCALES, TIMEZONES, type ClockConfig, type ClockLine } from './defaults';
import { cloneClockConfig } from './clone';
import { validateFormat } from '../time/format';
import { isAbsoluteIsoTarget } from '../time/countdown';

const color = /^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/;
const formats = /^[A-Za-z0-9 :,.'\-/]+$/;
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const inList = <T extends readonly unknown[]>(list: T, value: unknown): value is T[number] => list.includes(value);

function validLine(value: unknown): value is ClockLine {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const line = value as Record<string, unknown>;
  return typeof line.enabled === 'boolean' && typeof line.format === 'string' && line.format.length > 0 && line.format.length <= 64 && formats.test(line.format) && validateFormat(line.format) === null
    && inList(FONT_IDS, line.font) && typeof line.size === 'number' && Number.isFinite(line.size) && line.size >= 10 && line.size <= 240
    && inList([400, 500, 600, 700] as const, line.weight) && typeof line.color === 'string' && color.test(line.color)
    && typeof line.opacity === 'number' && Number.isFinite(line.opacity) && line.opacity >= 0 && line.opacity <= 1
    && inList(['none', 'uppercase', 'lowercase'] as const, line.transform);
}

export function normalizeConfig(input: unknown): ClockConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return cloneClockConfig(DEFAULT_CONFIG);
  const value = input as Record<string, unknown>;
  if (own(value, '__proto__') || own(value, 'constructor') || own(value, 'prototype') || value.version !== 1
    || !inList(['clock', 'countdown'] as const, value.mode) || typeof value.countdownTarget !== 'string' || typeof value.overtime !== 'boolean'
    || (value.mode === 'countdown' && !isAbsoluteIsoTarget(value.countdownTarget)) || (value.mode === 'clock' && (value.countdownTarget !== '' || value.overtime))
    || !inList(TIMEZONES, value.timezone) || !inList(LOCALES, value.locale) || !inList(['left', 'center', 'right'] as const, value.align)
    || typeof value.gap !== 'number' || !Number.isFinite(value.gap) || value.gap < 0 || value.gap > 80
    || typeof value.stroke !== 'number' || !Number.isFinite(value.stroke) || value.stroke < 0 || value.stroke > 8
    || typeof value.shadow !== 'number' || !Number.isFinite(value.shadow) || value.shadow < 0 || value.shadow > 30
    || !Array.isArray(value.lines) || value.lines.length !== 2 || !value.lines.every(validLine)) return cloneClockConfig(DEFAULT_CONFIG);
  return cloneClockConfig(value as ClockConfig);
}
