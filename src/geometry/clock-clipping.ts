import type { ClockConfig } from '../config/defaults';
import {
  collectElementBounds,
  evaluateElementBounds,
  type ClippingIssue,
  type ViewportBounds,
} from './clipping';

export function clockPaintMargins(stroke: number, shadow: number) {
  const shadowOffsetY = shadow > 0 ? Math.max(1, shadow / 3) : 0;
  return {
    left: stroke + shadow,
    top: stroke + Math.max(0, shadow - shadowOffsetY),
    right: stroke + shadow,
    bottom: stroke + shadow + shadowOffsetY,
  };
}

export function clockClippingIssues(
  root: HTMLElement,
  config: ClockConfig,
  viewport: ViewportBounds,
): ClippingIssue[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('.clock-line'));
  const activeLines = config.lines.map((line, index) => ({ line, index })).filter(({ line }) => line.enabled);
  const margins = clockPaintMargins(config.stroke, config.shadow);
  const elements = nodes.map((node, renderedIndex) => {
    const source = activeLines[renderedIndex]!;
    const lineNumber = source.index + 1;
    return {
      node,
      elementId: `clock-line-${lineNumber}`,
      label: `Line ${lineNumber}`,
      enabled: source.line.enabled,
      paintMargins: margins,
      suggestedFixes: [
        `Reduce Line ${lineNumber} size or shorten its format.`,
        'Reduce Stroke or Shadow.',
        'Choose a larger OBS Browser Source size.',
      ],
    };
  });
  return evaluateElementBounds(viewport, collectElementBounds(root, elements));
}
