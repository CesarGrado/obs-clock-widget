import '../config/fonts';
import '../styles/scene.css';
import { renderScene } from './renderer';
import { decodeSceneConfig, hasUnsupportedSceneVersion } from '../config/scene-codec';

const root = document.querySelector<HTMLElement>('#scene-root');
if (root) {
  if (hasUnsupportedSceneVersion(location.hash)) {
    const error = document.createElement('p');
    error.className = 'scene-error'; error.setAttribute('role', 'alert');
    error.textContent = 'Unsupported scene configuration version. Rebuild this scene URL in the scene builder.';
    root.append(error);
  } else renderScene(root, decodeSceneConfig(location.hash));
}
