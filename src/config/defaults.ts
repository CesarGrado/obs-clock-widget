import { TIMEZONE_IDS, type TimezoneId } from '../timezones/catalog';

export const FONT_IDS = ['system', 'mono', 'display', 'retro'] as const;
export const LOCALES = ['auto', 'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'ar-EG'] as const;
export const TIMEZONES = TIMEZONE_IDS;
export type FontId = typeof FONT_IDS[number];
export type ClockLine = { enabled: boolean; format: string; font: FontId; size: number; weight: 400 | 500 | 600 | 700; color: string; opacity: number; transform: 'none' | 'uppercase' | 'lowercase' };
export type ClockConfig = { version: 1; mode: 'clock' | 'countdown'; countdownTarget: string; overtime: boolean; timezone: TimezoneId; locale: typeof LOCALES[number]; align: 'left' | 'center' | 'right'; gap: number; stroke: number; shadow: number; lines: [ClockLine, ClockLine] };

export const DEFAULT_CONFIG: ClockConfig = {
  version: 1, mode: 'clock', countdownTarget: '', overtime: false, timezone: 'local', locale: 'auto', align: 'center', gap: 8, stroke: 0, shadow: 2,
  lines: [
    { enabled: true, format: 'HH:mm:ss', font: 'system', size: 72, weight: 700, color: '#FFFFFF', opacity: 1, transform: 'none' },
    { enabled: true, format: 'dddd, MMMM D', font: 'system', size: 30, weight: 500, color: '#FFFFFF', opacity: 0.9, transform: 'none' },
  ],
};
