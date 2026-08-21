import type { ClockConfig } from './defaults';

export const cloneClockConfig = (config: ClockConfig): ClockConfig => ({
  ...config,
  lines: [{ ...config.lines[0] }, { ...config.lines[1] }],
});
