# Architecture and data

Status: the first playable slice is implemented in React, TypeScript, and Vite. Exact dependencies are recorded in package.json and package-lock.json; the remaining sections describe the full target architecture, including later milestones.

## Application shape

Deliver a PWA using a client-side TypeScript application, with React and Vite as the UI/build tooling. Serve static assets over HTTPS. The MVP needs no application server or database service. Keep the round engine independent of React and browser APIs so it can be tested deterministically while browser input and presentation behavior are refined. Native packaging is out of scope.

Suggested future source boundaries:

- `src/game/`: round state machine, scoring, shuffle, result creation, and injected clock/randomness.
- `src/motion/`: capability checks, permissions, sample normalization, calibration, and a pure gesture detector.
- `src/platform/`: visibility, orientation/layout helpers, audio, optional vibration, wake lock, and storage adapters.
- `src/content/`: versioned starter banks, text/CSV/JSON parsers, shared import-preview validation, export, and IndexedDB storage.
- `src/screens/`: bank library/import preview, setup, practice, round, interruption, and results.
- `src/pwa/`: service-worker registration and update/offline status.
- `public/`: manifest, icons, and local assets.
- `tests/`: engine/detector unit tests, browser integration tests, and recorded sensor fixtures.

Ingestion follows one path: pasted text or selected file → format-specific parser → candidate card texts and source locations → shared validation/editable preview → saved bank. Keep parsing separate from persistence so changing a delimiter, correcting a card, or cancelling cannot mutate saved banks. The import draft retains the original input while open; persist only the reviewed bank, not the source file. JSON input is a portable input format rather than the internal database schema; create fresh bank/prompt IDs on import. Plain-text parsing and JSON parsing need no dedicated library; use a CSV parser for quoting and record rules. See [supported ingestion formats](07-word-banks.md).

The initial implementation has game, motion, platform, content, and app-controller modules; the first screens are in src/App.tsx. The remaining boundaries describe later implementation phases. The [build plan](05-validation-and-delivery.md) introduces them incrementally: the first playable slice uses small bundled test banks and in-memory results, plus the explicit control preference. Custom-bank persistence follows gesture validation, and offline caching/update behavior follows the content milestone. The engine and motion path built for the first slice remain the application's shared implementation.

## Module contracts

**A-01 — Pure engine.** The engine accepts commands with `roundId`, expected `promptId` where applicable, unique `actionId`, and current trusted application time. It returns state and effects such as Show feedback, Play cue, and Finish round. Effects cannot independently change the score.

**A-02 — Input adapters.** Motion and manual controls emit the same Correct/Pass commands with an input-source tag. The engine accepts scoring only from the selected control mode and independently enforces the active prompt and deadline even if an adapter misbehaves. Mode changes are explicit, allowed only in setup/interruption, and reset pending input. A failed capability check can request a recovery screen but cannot change the control setting. The detector operates on normalized timestamped samples and emits at most one command until rearmed. Continuous sensor values remain outside React render state; expose only gameplay events and necessary setup indicators.

**A-03 — Clock and lifecycle.** Inject a monotonic clock and scheduler into the engine; maintain the wall-clock anchor needed by the interruption rules. Browser rendering and timer callbacks refresh the display but do not define elapsed time. Visibility/page lifecycle signals stop input and release resources. Background tabs may be throttled, so the engine must reconcile time when execution returns. [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).

**A-04 — Optional effects.** Audio, vibration, fullscreen/orientation locking, wake lock, and persistence may fail without breaking scoring. Start audio from a user action, catch rejected promises, and cancel stale cues using round IDs. A wake-lock release while visible triggers one reasonable reacquisition attempt or a status notice, not an unbounded retry loop.

## Data model

**Deck**

- Stable `id`, integer `version`, `source: 'bundled' | 'custom'`, `title`, and optional `description`/`categoryId`.
- `prompts`: stable prompt `id` and single display `text`; no translation field or bilingual pair. Optional known language metadata may support accessibility but is not required for Arabic direction detection.
- Bundled-bank metadata includes authorship/source notes for editorial review. Imported content stays local and is not sent for automatic translation or classification.
- Validate unique IDs, nonempty trimmed text, duplicates under the conservative W-04 rule, limits, and at least one playable prompt. The proposed starter target is 50 per bank; smaller custom banks are valid.
- Custom-bank records include a schema version and created/updated timestamps. Store them in IndexedDB with transactional saves and migrations; cache cleanup must not delete user banks. See [word-bank storage](07-word-banks.md).

**Round configuration**

- `deckId`, `deckVersion`, `durationSeconds`, `controlMode`, and `soundEnabled`.
- Current gesture mapping is fixed to down = Correct and up = Pass. An inversion setting is a deferred decision.

**Active round**

- `roundId`, state, a snapshot of prompt order/text, current prompt ID, and resolved outcomes.
- Remaining-time/deadline anchors, interruption reason, pending feedback, and accepted action IDs.
- Sensor permission and calibration live in the session adapter, not in the persisted round configuration.

**Round result**

- `roundId`, schema version, deck identity/version/title, selected duration, started/finished timestamps, and elapsed active time.
- `finishReason`: `timer-expired`, `deck-exhausted`, or `ended-by-user`.
- Ordered displayed prompts with ID/text snapshots and outcome `correct`, `passed`, or `unanswered`; optionally record elapsed time at resolution for debugging.
- Derived totals. Mark `ended-by-user` as incomplete even when some prompts were answered.

**Preferences**

- Schema version, preferred duration, sound preference, and `controlMode: 'motion' | 'manual'`, defaulting to `motion` when no valid saved choice exists.
- Use buttons instead of motion is a UI switch derived from `controlMode`; do not maintain a separate competing buttons-enabled preference. Enable buttons on a recovery screen writes the same value. Persist explicit changes only; session capability reports and temporary failures never override the preference.
- Store preferences and at most the most recent result locally; saved custom banks have separate IndexedDB storage and export support. Do not save raw sensor streams or live-round recovery in production.
- Parse and validate stored data defensively; corrupt/unknown versions fall back to defaults. Storage errors preserve in-memory play and explain when results cannot be saved.

## PWA and offline contract

**A-05 — App shell.** Provide a manifest with a stable ID, name, start URL, scope, standalone display preference, theme/background colors, and appropriate regular/maskable icons. Include an Apple touch icon. Support browser-tab launch and normal browser back navigation outside a live round. An active-round exit is handled by the gameplay exit flow where navigation can be intercepted.

**A-06 — Cache readiness.** Precache the versioned shell, bundled English/Arabic banks, required feedback assets, and any required Arabic font assets using a service worker. Custom banks remain in IndexedDB rather than the replaceable app cache. Service workers can intercept requests and serve cached assets offline. Only indicate Ready offline after the complete required asset set is stored and usable. A first visit without connectivity is not supported; unavailable storage/cache means online-only play with an explanation. [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API).

**A-07 — Safe updates.** Stage a new app/cache version without reloading an active game. Offer an update on Home or Results. Retain assets needed by open clients; avoid mixing a new deck or asset version into an existing round. Snapshot deck content at Start. Test multiple tabs and installed/browser contexts rather than assuming they share storage or permission state. Browser storage may be cleared or evicted; re-check actual offline assets before advertising readiness.

**A-08 — Hosting.** GitHub Pages is the planned permanent host, following the Patriot app's GitHub Actions build-and-deploy approach. Publish the static Vite `dist` output over HTTPS. Configure the production asset base, manifest URLs, and future service-worker scope for the final repository path or custom domain. Use app-specific cache and storage names, and limit cache cleanup to this app; other project sites on the same GitHub Pages origin may share browser storage. The current app uses one page with state-based screens; any future URL routing must work with Pages' static hosting. Verify manifest delivery, installation, sensor permissions, and offline/update behavior on the final URL. Milestone 1 uses a static-only local build server and an optional temporary Cloudflare HTTPS tunnel for phone trials. It does not expose the workspace. CI and Pages deployment workflows are implemented; see the [deployment guide](../docs/DEPLOYMENT.md). The first hosted run and service-worker implementation remain pending; see [testing instructions](../docs/TESTING.md) for the temporary phone preview.

## Privacy and diagnostics

The game processes sensor data in memory on the device and does not upload it. Imported word banks are read and stored on the device; there is no server upload. Classroom use requires no student identities, and results are not proficiency assessments. No analytics, account identifiers, camera, microphone, contacts, or location access are required. An opt-in development diagnostics view may record local sample traces with OS/browser/mode metadata for detector replay tests; it must not ship as automatic production telemetry.
