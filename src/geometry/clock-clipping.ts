import type { ClockConfig } from '../config/defaults';
import { countdownDisplay } from '../time/countdown';
import { formatClock } from '../time/format';
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

export function clockTextCandidates(config: ClockConfig, lineIndex: number): string[] {
  const line = config.lines[lineIndex]!;
  const values = new Set<string>();
  const hours = [0, 11, 12, 23];
  for (let month = 0; month < 12; month += 1) {
    for (const day of [1, 2, 3, 4, 5, 6, 7, 28]) for (const hour of hours) {
      values.add(formatClock(new Date(Date.UTC(2028, month, day, hour, 59, 59)), line.format, config.timezone, config.locale));
    }
  }
  if (config.mode === 'countdown' && lineIndex === 0) {
    const target = new Date('2028-12-31T23:59:59Z');
    for (const milliseconds of [99 * 86_400_000 - 1_000, 10 * 86_400_000 + 23 * 3_600_000 + 59 * 60_000 + 59_000, 86_400_000 - 1_000, 3_600_000 - 1_000, 1_000, 0, -5_000, -99 * 86_400_000]) {
      const display = countdownDisplay(target.toISOString(), new Date(target.getTime() - milliseconds), config.overtime, config.locale);
      if (display.kind !== 'clock') values.add(display.text);
    }
  }
  return [...values];
}

export function widestClockText(node: HTMLElement, candidates: string[]): string {
  const transform = (text: string) => node.style.textTransform === 'uppercase' ? text.toLocaleUpperCase() : node.style.textTransform === 'lowercase' ? text.toLocaleLowerCase() : text;
  let context: CanvasRenderingContext2D | null = null;
  if (!navigator.userAgent.includes('jsdom')) {
    try { context = document.createElement('canvas').getContext('2d'); } catch { /* unavailable canvas falls back to conservative text length */ }
  }
  if (context) {
    const style = getComputedStyle(node);
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    return candidates.reduce((widest, candidate) => context!.measureText(transform(candidate)).width > context!.measureText(transform(widest)).width ? candidate : widest, candidates[0] ?? '');
  }
  return candidates.reduce((widest, candidate) => transform(candidate).length > transform(widest).length ? candidate : widest, candidates[0] ?? '');
}

export function applyWidestClockSamples(root: HTMLElement, config: ClockConfig): void {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('.clock-line'));
  const activeLines = config.lines.map((line, index) => ({ line, index })).filter(({ line }) => line.enabled);
  nodes.forEach((node, renderedIndex) => { node.textContent = widestClockText(node, clockTextCandidates(config, activeLines[renderedIndex]!.index)); });
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
