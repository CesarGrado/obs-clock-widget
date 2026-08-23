import type { SceneConfig } from '../config/scene-defaults';
import { fontFamiliesFor } from '../config/fonts';
import { startClock } from '../time/scheduler';
import { countdownDisplay } from '../time/countdown';

export type SceneControls = { stop: () => void; update: () => void; showReveal: () => void; hideReveal: () => void };

const styled = (node: HTMLElement, font: string, size: number, weight: number, color: string) => {
  node.style.fontFamily = fontFamiliesFor(font as SceneConfig['headlineFont']);
  node.style.fontWeight = String(weight); node.style.color = color;
  node.style.setProperty('--size', `${size}px`);
};

export function renderScene(root: HTMLElement, config: SceneConfig, now: () => Date = () => new Date()): SceneControls {
  root.replaceChildren();
  if (!root.classList.contains("scene-root")) root.classList.add("scene-root");
  root.setAttribute('data-theme', config.theme);
  root.setAttribute('data-motion', config.motion);
  root.setAttribute('data-align', config.align);
  root.setAttribute('aria-label', 'Starting soon scene');

  const content = document.createElement('div'); content.className = 'scene-content';
  const stage = document.createElement('div'); stage.className = 'scene-stage';
  const panel = document.createElement('div'); panel.className = 'scene-panel';
  const headline = document.createElement('h1'); headline.className = 'scene-headline'; headline.textContent = config.headline;
  styled(headline, config.headlineFont, config.headlineSize, config.headlineWeight, config.headlineColor);
  panel.append(headline);
  if (config.subtitle) {
    const subtitle = document.createElement('p'); subtitle.className = 'scene-subtitle'; subtitle.textContent = config.subtitle;
    styled(subtitle, config.subtitleFont, config.subtitleSize, config.subtitleWeight, config.subtitleColor);
    panel.append(subtitle);
  }
  const number = document.createElement('p'); number.className = 'scene-number';
  styled(number, config.numberFont, config.numberSize, config.numberWeight, config.numberColor);
  panel.append(number);

  const reveal = document.createElement('p'); reveal.className = 'scene-reveal'; reveal.textContent = config.reveal;
  styled(reveal, config.revealFont, config.revealSize, config.revealWeight, config.revealColor);

  stage.append(panel, reveal);
  content.append(stage);
  root.append(content);

  let revealed = false;
  const update = () => {
    const instant = now();
    const display = countdownDisplay(config.countdownTarget, instant, false, 'auto');
    // Reveal boundary: the 5s zero hold keeps the final countdown frame on screen, then the
    // message appears. rd=0 -> right after the hold (at zero+5s); each step adds a full minute.
    const pastHold = config.countdownTarget && Date.parse(config.countdownTarget) + 5_000 + config.revealDelay * 60_000 <= instant.getTime();
    number.textContent = display.kind === 'countdown' || display.kind === 'hold' ? display.text : '00:00:00';
    if (pastHold && !revealed) { revealed = true; panel.classList.add('scene-hidden'); reveal.classList.add('scene-shown'); }
  };
  const showReveal = () => { revealed = true; panel.classList.add('scene-hidden'); reveal.classList.add('scene-shown'); number.textContent = '00:00:00'; };
  const hideReveal = () => { revealed = false; panel.classList.remove('scene-hidden'); reveal.classList.remove('scene-shown'); update(); };
  const stop = startClock(update, true);
  return { stop, update, showReveal, hideReveal };
}
