# Browser and OBS compatibility

The production bundle targets Chrome/Chromium 87 syntax and APIs for OBS Browser Source compatibility.

## Timezone behavior

- The committed timezone allowlist comes from IANA tzdata `zone.tab`; it does not use `Intl.supportedValuesOf`.
- UTC offsets are calculated from date/time parts; the app does not use `timeZoneName: 'shortOffset'`.
- The editor checks both canonical catalog membership and actual `Intl.DateTimeFormat` support before accepting a selection.
- If an older CEF build lacks data for a canonical zone in an existing URL, the renderer shows `Timezone unavailable in this browser.` and continues running without exposing exception details.
- `local`, `UTC`, and all previously supported canonical timezone fragments retain their exact URL representation.

Automated tests cover DST, fractional offsets, global canonical IDs, keyboard combobox operation, accessibility, narrow viewports, malformed IDs, URL compatibility, and unsupported runtime data. Actual supported zones depend on the ICU/tzdata bundled by OBS/CEF. Manual OBS matrix and soak testing remain release gates.
