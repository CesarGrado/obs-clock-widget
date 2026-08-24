import type { ClockConfig } from '../config/defaults';
import { countdownDisplay } from '../time/countdown';
import { formatClock } from '../time/format';
import {
  collectElementBounds,
  evaluateElementBounds,
  type ClippingIssue,
  type RenderedBounds,
  type ViewportBounds,
} from './clipping';

export function clockPaintMargins(stroke: number, shadow: number) {
  const halfStroke = stroke / 2;
  const shadowOffsetY = shadow > 0 ? Math.max(1, shadow / 3) : 0;
  return {
    left: halfStroke + shadow,
    top: halfStroke + Math.max(0, shadow - shadowOffsetY),
    right: halfStroke + shadow,
    bottom: halfStroke + shadow + shadowOffsetY,
  };
}

interface HorizontalTextMetrics {
  width: number;
  actualBoundingBoxLeft?: number;
  actualBoundingBoxRight?: number;
}

export function textInkHorizontalBounds(
  bounds: RenderedBounds,
  metrics: HorizontalTextMetrics,
  align: ClockConfig['align'],
): RenderedBounds {
  const { actualBoundingBoxLeft: inkLeft, actualBoundingBoxRight: inkRight } = metrics;
  if (![metrics.width, inkLeft, inkRight].every((value) => Number.isFinite(value))) return bounds;
  const originX = align === 'left'
    ? bounds.left
    : align === 'center'
      ? (bounds.left + bounds.right - metrics.width) / 2
      : bounds.right - metrics.width;
  return {
    ...bounds,
    left: originX - inkLeft!,
    right: originX + inkRight!,
  };
}

const candidateCache = new Map<string, string[]>();

export function clockTextCandidates(config: ClockConfig, lineIndex: number): string[] {
  const line = config.lines[lineIndex]!;
  const cacheKey = [config.mode, config.overtime, config.timezone, config.locale, lineIndex, line.format].join('|');
  const cached = candidateCache.get(cacheKey); if (cached) return cached;
  const values = new Set<string>();
  const clockFormatReachable = config.mode === 'clock' || lineIndex !== 0 || !config.overtime;
  if (clockFormatReachable) {
    // Every legal hour and every legal minute/second value are paired. Minute and
    // second tokens share the same localized digits, so this covers proportional
    // digit widths (including wide zeroes) without an 86,400-item Cartesian set.
    for (let hour = 0; hour < 24; hour += 1) for (let minuteSecond = 0; minuteSecond < 60; minuteSecond += 1) {
      values.add(formatClock(new Date(Date.UTC(2028, 0, 1, hour, minuteSecond, minuteSecond)), line.format, config.timezone, config.locale));
    }
    // The first seven days cover every weekday in each month; day 28 covers the
    // widest two-digit day while keeping every sample a real calendar instant.
    for (let month = 0; month < 12; month += 1) for (const day of [1, 2, 3, 4, 5, 6, 7, 28]) {
      values.add(formatClock(new Date(Date.UTC(2028, month, day, 12, 59, 59)), line.format, config.timezone, config.locale));
    }
  }
  if (config.mode === 'countdown' && lineIndex === 0) {
    const target = new Date('2028-12-31T23:59:59Z');
    for (const milliseconds of [99 * 86_400_000 + 1_000, 99 * 86_400_000, 99 * 86_400_000 - 1_000, 10 * 86_400_000 + 23 * 3_600_000 + 59 * 60_000 + 59_000, 86_400_000 - 1_000, 3_600_000 - 1_000, 1_000, 0, -4_999, -5_000, -99 * 86_400_000]) {
      const display = countdownDisplay(target.toISOString(), new Date(target.getTime() - milliseconds), config.overtime, config.locale);
      if (display.kind !== 'clock') values.add(display.text);
    }
  }
  const result = [...values]; candidateCache.set(cacheKey, result); return result;
}

export function widestClockText(node: HTMLElement, candidates: string[]): string {
  const textTransform = getComputedStyle(node).textTransform;
  const transform = (text: string) => textTransform === 'uppercase' ? text.toLocaleUpperCase() : textTransform === 'lowercase' ? text.toLocaleLowerCase() : text;
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
  const measured = collectElementBounds(root, elements);
  let context: CanvasRenderingContext2D | null = null;
  if (!navigator.userAgent.includes('jsdom')) {
    try { context = document.createElement('canvas').getContext('2d'); } catch { /* retain conservative DOM bounds */ }
  }
  if (context) measured.forEach((element, index) => {
    const node = nodes[index]!;
    const style = getComputedStyle(node);
    context!.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const text = style.textTransform === 'uppercase'
      ? (node.textContent ?? '').toLocaleUpperCase()
      : style.textTransform === 'lowercase'
        ? (node.textContent ?? '').toLocaleLowerCase()
        : (node.textContent ?? '');
    element.bounds = textInkHorizontalBounds(element.bounds, context!.measureText(text), config.align);
  });
  return evaluateElementBounds(viewport, measured);
}
