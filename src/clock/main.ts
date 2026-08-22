import '../config/fonts';
import '../styles/clock.css';
import { renderClock } from './renderer';
import { decodeConfig, hasUnsupportedConfigVersion } from '../config/codec';

const root = document.querySelector<HTMLElement>('#clock-root');
if (root) {
  if (hasUnsupportedConfigVersion(location.hash)) {
    const error = document.createElement('p');
    error.className = 'config-error'; error.setAttribute('role', 'alert');
    error.textContent = 'Unsupported clock configuration version. Recreate this widget URL in the clock editor.';
    root.append(error);
  } else renderClock(root, decodeConfig(location.hash));
}
