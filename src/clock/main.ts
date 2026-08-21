import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/montserrat/latin-400.css';
import '@fontsource/montserrat/latin-500.css';
import '@fontsource/montserrat/latin-700.css';
import '@fontsource/roboto-mono/latin-400.css';
import '@fontsource/roboto-mono/latin-500.css';
import '@fontsource/roboto-mono/latin-700.css';
import '../styles/clock.css';
import { renderClock } from './renderer';
import { decodeConfig } from '../config/codec';

const root = document.querySelector<HTMLElement>('#clock-root');
if (root) renderClock(root, decodeConfig(location.hash));
