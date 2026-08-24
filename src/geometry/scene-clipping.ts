import type { SceneConfig } from '../config/scene-defaults';
import {
  collectElementBounds,
  evaluateElementBounds,
  type ClippingIssue,
  type ViewportBounds,
} from './clipping';

const ELEMENTS = [
  { selector: '.scene-headline', elementId: 'scene-headline', label: 'Headline', configKey: 'headline' },
  { selector: '.scene-subtitle', elementId: 'scene-subtitle', label: 'Subtitle', configKey: 'subtitle' },
  { selector: '.scene-number', elementId: 'scene-number', label: 'Countdown' },
  { selector: '.scene-reveal', elementId: 'scene-reveal', label: 'Zero message', configKey: 'reveal' },
] as const;

export function sceneClippingIssues(
  root: HTMLElement,
  config: SceneConfig,
  viewport: ViewportBounds,
): ClippingIssue[] {
  const elements = ELEMENTS.flatMap((descriptor) => {
    const node = root.querySelector<HTMLElement>(descriptor.selector);
    if (!node) return [];
    const configuredText = 'configKey' in descriptor ? config[descriptor.configKey] : undefined;
    return [{
      node,
      elementId: descriptor.elementId,
      label: descriptor.label,
      enabled: configuredText === undefined || configuredText.length > 0,
      suggestedFixes: [
        `Reduce ${descriptor.label} size or shorten its text.`,
        'Choose a larger full-screen OBS Browser Source size.',
      ],
    }];
  });
  return evaluateElementBounds(viewport, collectElementBounds(root, elements));
}
