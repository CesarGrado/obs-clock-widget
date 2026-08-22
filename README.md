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

Choose the matching **OBS Browser Source size** in the editor before selecting **Copy setup text**. The copied checklist includes either the wide `1920 × 300` or compact `800 × 240` dimensions, so the source can be recreated without retyping them.

The fragment is readable, not encrypted. It contains visual settings only and is not sent to the static host. The app uses no account, cookies, storage, analytics, telemetry, service worker, or third-party runtime network calls.

### Presets

The editor includes Minimal, Broadcast, Retro, Gameplay, and Puzzlr starting points. **Minimal** is a single-line monospaced `HH:mm` clock with a soft shadow, designed to stay visually steady as digits change without reserving space for a date. **Gameplay** uses a large white clock with a bold black outline and an uppercase yellow date for readability over fast-changing bright and dark footage. Start with a **1920 × 300** or **800 × 240** Browser Source; reduce Gameplay's Stroke if the outline feels heavy at a smaller scale.

Use **Swap lines** to move the complete Line 1 and Line 2 designs—including format, font, color, size, and enabled state—without rebuilding either line.

Use **Match Line 2 style to Line 1** or **Match Line 1 style to Line 2** to copy one line's font, size, weight, color, opacity, and transform to the other while preserving the destination line's format and enabled state. This coordinates a clock and date or timezone label without re-entering content settings.

If **Reset** is selected accidentally, **Undo reset** restores the configuration that was in the editor immediately before the reset. This recovery is available only in the current page session and does not store settings.

### Recover or edit an existing clock

In the editor's **Output** section, paste either the complete generated OBS URL or only its `v=1&...` fragment into **Load existing OBS URL or fragment**, then select **Load** (or press Enter). A successful import replaces the editor settings; change any value and copy the newly generated URL back into OBS.

For safety, the editor accepts runtime URLs only from the current deployment origin or `https://obs-clock-widget.pages.dev`, and only on `/v1/clock/`. It rejects query-string settings, other routes or origins, credentials, duplicate or unknown settings, malformed encoding, unsupported versions, and oversized fragments. If loading fails, the current editor settings and generated URL are preserved. Re-copy the complete Browser Source URL from OBS, confirm it contains `#v=1`, and try again; otherwise recreate the settings manually. Do not move the fragment after `#` into a query string after `?`.

## Format tokens

`HH H h mm m ss s a`, `dddd ddd`, `MMMM MMM M`, `D`, `YYYY YY`. Wrap literal text in single quotes.

Each line's format presets include both 24-hour and 12-hour clocks with seconds; choose `h:mm:ss a` for an AM/PM clock that keeps seconds visible.

## Timezones

The editor includes a keyboard-accessible searchable catalog of canonical IANA timezone IDs. Search by city, region, ID, or UTC offset; results show a friendly city label, the canonical ID stored in the URL, and the current calculated UTC offset. **Local** and **UTC** remain first. Existing `/v1/clock/#v=1&tz=...` URLs are unchanged.

The catalog is generated from the system IANA tzdata `zone.tab`, committed in `src/timezones/generated.ts`, and requires no runtime network request or dependency. Regenerate on a host with tzdata using `npm run generate:timezones`. Linked aliases such as `US/Eastern`, malformed IDs, and arbitrary strings are rejected. The editor also verifies the selected ID against the browser's actual `Intl` data; an older OBS/CEF runtime missing a catalog zone displays a safe error instead of crashing.

## Fonts and licensing

Inter, Montserrat, and Roboto Mono are bundled at build time from Fontsource under the SIL Open Font License 1.1. See `THIRD_PARTY_NOTICES.md`. System fallbacks remain available.

## Compatibility status

The production target is Chromium 87-compatible JavaScript. Automated Chromium tests cover the editor workflow, malformed fragments, transparency, network boundaries, accessibility, and narrow layouts. **Actual OBS/CEF matrix and overnight soak testing remain required before a production release**; this repository does not claim those manual gates have passed.

MIT licensed.
