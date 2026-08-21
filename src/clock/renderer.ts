import type { ClockConfig } from '../config/defaults';
import { formatClock, formatHasSeconds } from '../time/format';
import { startClock } from '../time/scheduler';

const fonts: Record<string, string> = {
  system: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: '"Roboto Mono", ui-monospace, SFMono-Regular, Consolas, monospace',
  display: 'Montserrat, ui-sans-serif, system-ui, sans-serif',
  retro: '"Roboto Mono", ui-monospace, monospace',
};

export function renderClock(root: HTMLElement, config: ClockConfig, now: () => Date = () => new Date()): { stop: () => void; update: () => void } {
  root.replaceChildren(); root.className = 'clock-root'; root.style.justifyContent = config.align === 'left' ? 'flex-start' : config.align === 'right' ? 'flex-end' : 'center';
  const stage = document.createElement('div'); stage.className = 'clock-content'; stage.style.alignItems = config.align === 'left' ? 'flex-start' : config.align === 'right' ? 'flex-end' : 'center'; stage.style.gap = `${config.gap}px`; root.append(stage);
  const active = config.lines.filter((line) => line.enabled);
  const nodes = active.map((line) => {
    const node = document.createElement('div'); node.className = 'clock-line'; node.style.fontFamily = fonts[line.font]!; node.style.fontSize = `${line.size}px`;
    node.style.fontWeight = String(line.weight); node.style.color = line.color; node.style.opacity = String(line.opacity); node.style.textTransform = line.transform;
    node.style.webkitTextStroke = config.stroke ? `${config.stroke}px rgba(0,0,0,.85)` : '0px'; node.style.textShadow = config.shadow ? `0 ${Math.max(1, config.shadow / 3)}px ${config.shadow}px rgba(0,0,0,.85)` : 'none';
    stage.append(node); return { line, node };
  });
  let failed = false;
  const update = () => {
    if (failed) return;
    const instant = now();
    try { nodes.forEach(({ line, node }) => { node.textContent = formatClock(instant, line.format, config.timezone, config.locale); }); }
    catch { failed = true; const error = document.createElement('div'); error.className = 'clock-error'; error.setAttribute('role', 'alert'); error.textContent = 'Timezone unavailable in this browser.'; stage.replaceChildren(error); }
  };
  const stop = startClock(update, active.some((line) => formatHasSeconds(line.format)));
  return { stop, update };
}
