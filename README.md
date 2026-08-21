# OBS Clock Widget

A public, static, privacy-respecting editor and transparent two-line clock for OBS Browser Source. Configure at `/editor/`; permanent renderer URLs use `/v1/clock/#...`.

## Local development

```bash
npm ci
npm run dev
```

Quality gates:

```bash
npm run typecheck
npm run lint
npm test -- --run
npm run build
npx playwright install chromium
npm run test:e2e
```

## OBS setup

1. Open `/editor/`, configure the overlay, and copy the OBS URL.
2. OBS → Sources → **+** → **Browser**.
3. Paste the URL. Start at **1920 × 300** or **800 × 240** for compact designs.
4. Leave custom CSS empty.
5. Leave **Shutdown source when not visible** and **Refresh browser when scene becomes active** off for uninterrupted operation.

The fragment is readable, not encrypted. It contains visual settings only and is not sent to the static host. The app uses no account, cookies, storage, analytics, telemetry, service worker, or third-party runtime network calls.

## Format tokens

`HH H h mm m ss s a`, `dddd ddd`, `MMMM MMM M`, `D`, `YYYY YY`. Wrap literal text in single quotes.

## Fonts and licensing

Inter, Montserrat, and Roboto Mono are bundled at build time from Fontsource under the SIL Open Font License 1.1. See `THIRD_PARTY_NOTICES.md`. System fallbacks remain available.

## Compatibility status

The production target is Chromium 87-compatible JavaScript. Automated Chromium tests cover the editor workflow, malformed fragments, transparency, network boundaries, accessibility, and narrow layouts. **Actual OBS/CEF matrix and overnight soak testing remain required before a production release**; this repository does not claim those manual gates have passed.

MIT licensed.
