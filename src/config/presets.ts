import { DEFAULT_CONFIG, type ClockConfig } from './defaults';
import { cloneClockConfig } from './clone';

const withChanges = (changes: Partial<ClockConfig> & { lines?: ClockConfig['lines'] }): ClockConfig => ({ ...cloneClockConfig(DEFAULT_CONFIG), ...changes });
export const PRESETS: Record<string, ClockConfig> = {
  Minimal: withChanges({ gap: 0, shadow: 4, lines: [
    { ...DEFAULT_CONFIG.lines[0], format: 'HH:mm', font: 'mono', size: 88, weight: 600 },
    { ...DEFAULT_CONFIG.lines[1], enabled: false },
  ] }),
  Broadcast: withChanges({ align: 'left', gap: 10, stroke: 2, shadow: 6, lines: [
    { ...DEFAULT_CONFIG.lines[0], size: 96 },
    { ...DEFAULT_CONFIG.lines[1], format: 'dddd, MMMM D, YYYY', size: 34 },
  ] }),
  Retro: withChanges({ gap: 4, shadow: 8, lines: [
    { ...DEFAULT_CONFIG.lines[0], font: 'retro', size: 84, color: '#FFB000' },
    { ...DEFAULT_CONFIG.lines[1], font: 'mono', color: '#FFB000', transform: 'uppercase' },
  ] }),
  Gameplay: withChanges({ gap: 6, stroke: 4, shadow: 0, lines: [
    { ...DEFAULT_CONFIG.lines[0], size: 80 },
    { ...DEFAULT_CONFIG.lines[1], format: 'ddd, MMM D', size: 28, weight: 700, color: '#FFD54A', opacity: 1, transform: 'uppercase' },
  ] }),
  Puzzlr: withChanges({ gap: 12, stroke: 1, shadow: 8, lines: [
    { ...DEFAULT_CONFIG.lines[0], font: 'display', size: 92, color: '#7C5CFC' },
    { ...DEFAULT_CONFIG.lines[1], font: 'display', size: 32, color: '#35D7B7', transform: 'uppercase' },
  ] }),
  'Stream Start': withChanges({ gap: 10, shadow: 6, lines: [
    { ...DEFAULT_CONFIG.lines[0], format: "h:mm a '-- stream starts soon'", font: 'permanent-marker', size: 64, weight: 400 },
    { ...DEFAULT_CONFIG.lines[1], format: 'dddd, MMMM D', font: 'caveat', size: 34, weight: 600, opacity: 0.9 },
  ] }),
};
