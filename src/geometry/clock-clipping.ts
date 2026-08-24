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

interface TextInkMetrics {
  width: number;
  actualBoundingBoxLeft?: number;
  actualBoundingBoxRight?: number;
  actualBoundingBoxAscent?: number;
  actualBoundingBoxDescent?: number;
}

export function textInkBounds(
  bounds: RenderedBounds,
  metrics: TextInkMetrics,
  align: ClockConfig['align'],
  baseline: number,
): RenderedBounds {
  const { actualBoundingBoxLeft: inkLeft, actualBoundingBoxRight: inkRight } = metrics;
  const { actualBoundingBoxAscent: ascent, actualBoundingBoxDescent: descent } = metrics;
  const result = { ...bounds };
  if ([metrics.width, inkLeft, inkRight].every((value) => Number.isFinite(value))) {
    const originX = align === 'left'
      ? bounds.left
      : align === 'center'
        ? (bounds.left + bounds.right - metrics.width) / 2
        : bounds.right - metrics.width;
    result.left = originX - inkLeft!;
    result.right = originX + inkRight!;
  }
  if ([baseline, ascent, descent].every((value) => Number.isFinite(value))) {
    result.top = baseline - ascent!;
    result.bottom = baseline + descent!;
  }
  return result;
}

const candidateCache = new Map<string, string[]>();
const MAX_CANDIDATE_CACHE_ENTRIES = 32;

export function clockTextCandidates(config: ClockConfig, lineIndex: number): string[] {
  const line = config.lines[lineIndex]!;
  const cacheKey = [config.mode, config.overtime, config.timezone, config.locale, lineIndex, line.format].join('|');
  const cached = candidateCache.get(cacheKey);
  if (cached) {
    candidateCache.delete(cacheKey);
    candidateCache.set(cacheKey, cached);
    return cached;
  }
  const values = new Set<string>();
  const clockFormatReachable = config.mode === 'clock' || lineIndex !== 0 || !config.overtime;
  if (clockFormatReachable) {
    // Every legal hour and every legal minute/second value are paired. Minute and
    // second tokens share the same localized digits, so this covers proportional
    // digit widths (including wide zeroes) without an 86,400-item Cartesian set.
    for (let hour = 0; hour < 24; hour += 1) for (let minuteSecond = 0; minuteSecond < 60; minuteSecond += 1) {
      values.add(formatClock(new Date(Date.UTC(2028, 0, 1, hour, minuteSecond, minuteSecond)), line.format, config.timezone, config.locale));
    }
    // The first seven days cover every weekday in each month. Include every
    // reachable high day rather than assuming proportional numerals make 28 widest.
    for (let month = 0; month < 12; month += 1) for (const day of [1, 2, 3, 4, 5, 6, 7, 28, 29, 30, 31]) {
      const instant = new Date(Date.UTC(2028, month, day, 12, 59, 59));
      if (instant.getUTCMonth() === month) values.add(formatClock(instant, line.format, config.timezone, config.locale));
    }
  }
  if (config.mode === 'countdown' && lineIndex === 0) {
    const target = new Date('2028-12-31T23:59:59Z');
    for (const milliseconds of [99 * 86_400_000 + 1_000, 99 * 86_400_000, 99 * 86_400_000 - 1_000, 10 * 86_400_000 + 23 * 3_600_000 + 59 * 60_000 + 59_000, 86_400_000 - 1_000, 3_600_000 - 1_000, 1_000, 0, -4_999, -5_000, -99 * 86_400_000]) {
      const display = countdownDisplay(target.toISOString(), new Date(target.getTime() - milliseconds), config.overtime, config.locale);
      if (display.kind !== 'clock') values.add(display.text);
    }
  }
  const result = [...values];
  if (candidateCache.size >= MAX_CANDIDATE_CACHE_ENTRIES) candidateCache.delete(candidateCache.keys().next().value!);
  candidateCache.set(cacheKey, result);
  return result;
}

export function widestClockText(node: HTMLElement, candidates: string[]): string {
  const style = getComputedStyle(node);
  const textTransform = style.textTransform;
  const transform = (text: string) => textTransform === 'uppercase' ? text.toLocaleUpperCase() : textTransform === 'lowercase' ? text.toLocaleLowerCase() : text;
  let context: CanvasRenderingContext2D | null = null;
  if (!navigator.userAgent.includes('jsdom')) {
    try { context = document.createElement('canvas').getContext('2d'); } catch { /* unavailable canvas falls back to conservative text length */ }
  }
  if (context) {
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    let widest = candidates[0] ?? '';
    let widestWidth = context.measureText(transform(widest)).width;
    for (const candidate of candidates.slice(1)) {
      const width = context.measureText(transform(candidate)).width;
      if (width > widestWidth) { widest = candidate; widestWidth = width; }
    }
    return widest;
  }
  return candidates.reduce((widest, candidate) => transform(candidate).length > transform(widest).length ? candidate : widest, candidates[0] ?? '');
}

function textBaseline(node: HTMLElement, viewport: HTMLElement): number {
  const marker = document.createElement('span');
  marker.setAttribute('aria-hidden', 'true');
  Object.assign(marker.style, { display: 'inline-block', width: '0', height: '0', padding: '0', margin: '0', verticalAlign: 'baseline' });
  node.append(marker);
  const baseline = marker.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
  marker.remove();
  return baseline;
}

function unionBounds(bounds: RenderedBounds[]): RenderedBounds {
  return bounds.reduce((union, current) => ({
    left: Math.min(union.left, current.left),
    top: Math.min(union.top, current.top),
    right: Math.max(union.right, current.right),
    bottom: Math.max(union.bottom, current.bottom),
  }));
}

export function applyWidestClockSamples(root: HTMLElement, config: ClockConfig): void {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('.clock-line'));
  const activeLines = config.lines.map((line, index) => ({ line, index })).filter(({ line }) => line.enabled);
  nodes.forEach((node, renderedIndex) => {
    const candidates = clockTextCandidates(config, activeLines[renderedIndex]!.index);
    node.textContent = widestClockText(node, [node.textContent ?? '', ...candidates]);
  });
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
    const transform = (text: string) => style.textTransform === 'uppercase'
      ? text.toLocaleUpperCase()
      : style.textTransform === 'lowercase'
        ? text.toLocaleLowerCase()
        : text;
    const source = activeLines[index]!;
    const candidates = new Set([node.textContent ?? '', ...clockTextCandidates(config, source.index)]);
    const baseline = textBaseline(node, root);
    element.bounds = unionBounds([...candidates].map((text) => textInkBounds(
      element.bounds,
      context!.measureText(transform(text)),
      config.align,
      baseline,
    )));
  });
  return evaluateElementBounds(viewport, measured);
}
