# OBS Overlay Studio Whole-Site Overhaul Plan

> **For Hermes:** Execute sequentially with strict TDD, isolated release branches, independent review, exact-SHA CI, and Cloudflare verification. Do not begin a later release until the prior release is production-verified.

**Goal:** Turn the technically capable OBS Clock Widget into one coherent, streamer-friendly Overlay Studio while fixing verified UI, accessibility, clipping, recovery, and setup defects without changing existing runtime URLs or appearances.

**Baseline:** Production `f72eeba1b367fc6c9eff392504d4bf980909c872`.

**Evidence:** Three independent production audits covered `/`, `/editor/`, `/scene-editor/`, `/v1/clock/`, `/v1/scene/`, desktop, 320–390px layouts, keyboard, axe/manual accessibility review, malformed URLs, deployment parity, timing, network, and valid-model geometry. Full UX evidence is stored outside the repo at `/home/puzzlyops/ux-audit-output/`.

---

## Product principles

1. Template first; advanced controls second.
2. Preview and Export remain visible throughout the workflow.
3. Clock and Scene are peer products inside one shared app shell.
4. Every visible invalid value gets a field-specific error and never creates stale preview/URL state.
5. A URL is not “ready for OBS” if its content is clipped, even when it is canonical.
6. Preserve `/v1/clock/` and `/v1/scene/` bytes, defaults, and visual behavior.
7. Static, private, account-free, dependency-free at runtime, and Chrome/CEF 87-compatible.
8. Distinguish a deployed browser candidate from formal actual-OBS qualification.

---

# Release 0A — Safety and usability hotfix

## 0A.1 Fix scene typography controls

**Verified defects**
- All four Weight selects contain blank options.
- Typography rows collide/clip at desktop widths; automated audit measured 12 cross-row collisions.

**Implementation**
- Rebuild weight options with visible and accessible labels: `400 Regular`, `500 Medium`, `600 Semibold`, `700 Bold` where supported.
- Keep values canonical numeric weights.
- Make each semantic text role a full-width named group/card: Headline, Subtitle, Countdown, Zero message.
- Each role exposes explicit names such as `Headline font`, `Headline size (px)`, `Headline weight`, `Headline color`.
- Use stable responsive CSS rather than compressed nested grids.

**Tests / acceptance**
- Component tests assert no empty option text and correct selected labels after font clamping.
- Bounding-box E2E at 320, 768, 900, 1280, 1440 and 200% zoom reports zero unrelated intersections/clipped values.
- Preview, config, URL, and runtime agree for every limited-weight font.

## 0A.2 Make validation field-specific and state-safe

- Give every scene text/number/date/time field its own persistent error node.
- Link with `aria-describedby`; set/clear `aria-invalid` per field.
- Surface native min/max failures immediately instead of silently retaining stale config.
- Date/time errors link both contributing controls and focus the first invalid control after committed actions.
- Preserve current config/preview/URL on invalid input.
- Test required text, unsafe characters, every size boundary, missing date/time, >99 days, DST gaps/overlaps, and recovery.

## 0A.3 Fix navigation focus and preview semantics

- Add one shared, visible `:focus-visible` treatment for links and controls.
- Convert editor preview to a valid named region or titled same-origin iframe; keep one page H1.
- Do not add a per-second live region.
- Add keyboard/forced-colors/zoom tests for both editor navigation links.

## 0A.4 Remove contradictory scene scheduling defaults

- Fresh Scene Builder shows an explicit unscheduled state; Date/Time are empty or disabled until `Schedule scene`.
- Never display the 2099 sentinel to users.
- Rename `Show zero message` to `Zero-message timing` and accurately include the five-second hold.
- Scheduling, clearing, quick durations, import, preview, and URL stay synchronized.

## 0A.5 Add real clipping detection

**Verified defect:** valid Clock configurations can render 512px tall in advertised 240/300px sources and ~15,000px wide while existing `overflow:hidden` tests pass.

- Add a pure bounds evaluator and editor warning based on actual rendered element rectangles at the selected viewport.
- Warn when any enabled visible element exceeds the runtime viewport; identify line/element and suggested fixes.
- Doctor/export cannot show a green “ready” state while clipping exists, but copying remains possible with an explicit warning.
- Test compact 800×240, wide 1920×300, Scene 1920×1080, 1440p, 4K, maximum sizes, 62-character literals, long localized dates, strokes/shadows, all alignments, and font settling.
- Assertions must use element bounds, not only scrollWidth/scrollHeight.

## 0A.6 Header/cache and release-test hygiene

- Explicitly cover scene editor/runtime HTML in `_headers` cache rules.
- Make test command ordering explicit in scripts or messages so packaging tests do not mysteriously fail before build.
- Expand Chrome 87 emitted API/CSS scan beyond only `structuredClone`.

**0A complete when:** all verified High defects are fixed, full gates pass, independent review approves, exact branch/main CI pass, and production confirms weight labels, no collisions, validation semantics, focus, unscheduled state, and clipping warnings. Actual OBS qualification remains separately labelled.

---

# Release 0B — Unified Overlay Studio foundation

## 0B.1 Real product landing page at `/`

Replace redirect-to-form with a concise, fast, static landing/product chooser:
- Hero: what the app creates and why it is safe.
- Equal tool cards: Clock & Countdown; Starting Soon Scene.
- Visual template gallery with real rendered thumbnails.
- Three steps: Choose → Customize → Copy into OBS.
- Trust strip: no account, no storage, no analytics, self-hosted assets, permanent fragment URLs.
- Links to setup, privacy, compatibility, changelog/source/support.
- Real branded 404 page with links to both tools; invalid routes must not silently redirect to the editor.

## 0B.2 Shared app shell and design system

- Persistent `Overlay Studio` header and peer route tabs with `aria-current`.
- Shared spacing scale 4/8/12/16/24/32, 44px primary controls, labels/errors/cards/buttons/status patterns.
- Consistent action hierarchy: primary Copy setup; secondary Copy URL/Open preview; tertiary Reset; reversible Undo.
- Use existing self-hosted fonts only; no external design assets.

## 0B.3 Template-first, progressive editor architecture

Both editors use the same sections:
1. Template
2. Content & timing
3. Appearance
4. Preview & accessibility
5. Export to OBS

- Wire existing `SCENE_PRESETS` into visual cards with use-case labels and real thumbnails.
- Upgrade Clock presets to visual cards without changing definitions.
- Collapse advanced properties by default; errors/focus cannot be hidden.
- Provide section navigation/accordion on narrow screens; preserve state.
- At 320px users reach Export in two deliberate navigation actions.

## 0B.4 Preview-first workflow

- Large sticky desktop preview that uses available width instead of leaving blank space.
- Preview-first mobile with accessible zoom/open-full-size action.
- Clock backdrop choices remain; default preview is readable.
- Add high-contrast treatment and clipping/contrast warnings.
- Selected OBS viewport visibly changes preview framing.

## 0B.5 Recovery parity

Scene Builder gains Clock-equivalent features:
- Load existing canonical Scene URL/fragment.
- Reset and Undo reset.
- Open scene preview in a fresh document.
- URL-length warning.
- Clear privacy/recovery guidance.
- Explicit timezone confirmation/selection for scene scheduling.

Strict failed imports preserve controls, preview, hash, timer, and generated URL.

**0B complete when:** first-time users can understand the product before seeing a form, navigate between tools consistently, select a visual template, customize through progressive sections, recover either URL, and reach Export quickly on desktop/mobile. Full visual/a11y/security/compatibility gates and production verification required.

---

# Release A — OBS Setup Doctor and bulletproof URLs

Rebase and revise `.hermes/plans/2026-08-24-phase-a-obs-setup-doctor.md` after 0A/0B.

Required audit corrections:
- Generated readonly URL and editable verification input are separate controls.
- Setup is the shared Export step, not another dense diagnostic fieldset.
- Verify canonical scheme/origin/port/path/query/fragment/escapes/separators/keys/duplicates/values/order/default omission/byte equality.
- Reachability is optional evidence; never conflate unreachable with invalid.
- Never transmit fragments; reject redirects.
- Require canonical HTTPS for production readiness; clearly label local HTTP development.
- Fresh runtime test verifies viewport, output, font readiness, transparency/opacity, element bounds, console, and network.
- Keep runtime `connect-src 'none'`; editor CSP changes require deployed header proof.
- Doctor cannot claim to inspect actual OBS toggles without obs-websocket.
- Manual-copy fallback, keyboard/focus/ARIA, legacy URL corpus, and both runtime routes are mandatory.

---

# Release B — Brand Customization Studio

After foundation and Doctor:
- Safe two-color gradient + angle.
- Safe area and layout density.
- Card style: none/glass/solid, opacity/radius/border.
- Accent color, title/subtitle spacing/alignment, countdown emphasis.
- Final 60/10-second warning colors.
- Reduced-motion-aware transitions.
- Strict typed/range-bounded canonical serialization; no arbitrary CSS, uploads, remote URLs, storage, or dependencies.
- Curated presets and section reset; never silently restyle old URLs.

---

# Release C — Blockbuster One-Click Stream Pack Generator

Generate a coordinated static pack from one brand kit:
- Starting Soon
- Be Right Back
- Stream Ending / Thanks for Watching
- In-stream Clock/Countdown overlay

Features:
- Pack preview switcher.
- Per-scene title/subtitle/lifecycle.
- Individual Copy/Open/Verify.
- Copy all setup text and downloadable plain-text manifest.
- At least Clean Broadcast, Neon Gaming, Cozy Community packs that differ in layout/typography as well as color.
- Independent versioned URLs; no server state/localStorage.
- Full screen and overlay geometry, transparency/opacity, long text, 45 fonts, reduced motion, same-origin-only network, importability, and CEF 87 gates.

---

# Universal release gates

For every release:
1. Plan and exact acceptance criteria before code.
2. Strict vertical RED→GREEN→REFACTOR evidence.
3. Isolated branch/worktree; canonical main stays clean.
4. Timezone generator reproducibility where relevant.
5. Typecheck, lint, clean build, full Vitest, audit, full Playwright, diff checks.
6. Security/injection/network/runtime-import scans.
7. Axe + keyboard + 200% zoom + 320px checks.
8. Visual screenshots at required sizes over relevant backgrounds.
9. Element-bounds geometry, font settling, reduced motion, hash/fresh-load behavior.
10. Independent read-only exact-SHA review; resolve every real blocker.
11. Branch CI, safe integration without force, rerun gates, exact-main CI.
12. Cloudflare route/header/cache/console/network/production smoke.
13. Honest status: browser-deployed candidate vs formal actual-OBS/CEF matrix and soak qualification.
