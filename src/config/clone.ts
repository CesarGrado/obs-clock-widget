import type { ClockConfig } from './defaults';
import type { SceneConfig } from './scene-defaults';

export const cloneClockConfig = (config: ClockConfig): ClockConfig => ({
  ...config,
  lines: [{ ...config.lines[0] }, { ...config.lines[1] }],
});

export const cloneSceneConfig = (config: SceneConfig): SceneConfig => ({ ...config });
