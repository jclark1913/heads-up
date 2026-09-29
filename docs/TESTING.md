# Run and test the first playable build

Milestone 1 is implemented. The owner reports largely successful device tests; exact configurations, results, and remaining issues have not yet been recorded. Synthetic browser tests exercise the real game/detector path but cannot establish physical gesture accuracy or device permission behavior.

## Local development

Use Node 22.12 or newer (this build used Node 24). From the project directory:

```sh
npm install
npm run dev
```

Open the printed localhost URL. Desktop play requires explicitly enabling Use buttons instead of motion. A phone visiting a plain HTTP LAN address does not get the secure-context exception that localhost gets.

Useful commands:

- `npm run check`: type check, lint, 115 unit tests, and production build.
- `npm run test:e2e -- --workers=2`: 141 browser scenarios in Chromium mobile, WebKit mobile, and desktop Chromium. Install browsers once with `npx playwright install chromium webkit`.
- `npm run format:check`: formatting.
- `npm run icons`: regenerate checked-in install icons from public/icon.svg.
- `npm run serve:test`: serve only dist on 127.0.0.1:4173 after building.

Browser device profiles approximate viewport/input behavior; they do not impersonate or certify the owner's exact phones. The motion scenario covers both scoring directions, a held tilt, overshoot, neutral rearming, a transient viewport rotation, and switching to manual controls while paused.

## HTTPS on the two phones

On Windows, start a temporary test link:

```sh
npm run phone:test
```

The launcher builds the app, downloads the official Cloudflare tunnel helper into .tools if needed, verifies its pinned SHA-256 digest, and starts the static server and tunnel in hidden background processes. It prints an HTTPS URL. No hosting account is required for a [Cloudflare Quick Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/).

Open that URL in Safari on the iPhone 17 Pro and Chrome on the Pixel 10a. Keep the computer awake and connected. The link is temporary and lasts only while those helpers run. Run the command again to retrieve the active link; the local process/URL record is in .tmp/phone-test.json. Stop the helpers with:

```sh
npm run phone:test -- -Stop
```

Restarting the tunnel creates a new origin. Use the new link and reinstall the Home Screen shortcut when it changes. Browser permissions, settings, and custom decks belong to the origin. A new tunnel URL cannot see decks saved under an earlier URL; use the same URL for persistence tests.

The tunnel serves only the built dist assets, with cache disabled for iteration. Source files, specs, node_modules, and local diagnostic files are not served. Port 4173 must be free; do not run another preview server or browser test suite on that port while starting the tunnel. Permanent hosting can replace this helper later.

## First trial

Follow [the short checklist](../specs/08-device-trial.md). For a useful first report:

1. Open a deck and Enable movement. Hold the phone sideways, screen outward. If rotation is blocked, use the conditional rotation-lock guidance.
2. Practice down = Correct and up = Pass, returning upright between tilts. Try both landscape directions.
3. Play a full round, then repeat in the installed/Home Screen launch.
4. Report misses, wrong directions, duplicate answers, accidental rotation, comfort, and the build number shown in the footer.

For more detail, open Help from the deck picker or setup, then expand Device testing & diagnostics before starting and enable Record a local sensor trace. This records a bounded in-memory trace for that visit only. Pause or finish the round to download/copy the JSON report. Turning recording off clears it. Nothing is uploaded automatically. The report contains browser information and motion measurements; add your intended gestures and observed mistakes separately.

## What is in this build

- Two 20-card English/Arabic test banks, a three-second preparation countdown, and 30/60/90-second rounds (60 by default).
- Tap-initiated permission, calibration, practice, gesture dwell/rearming, a landscape game surface, and interruption/resume handling.
- Correct/Pass feedback, sound where available, results, replay, and an optional screen wake lock.
- Versioned round-length/sound/control preferences, with legacy manual-choice migration. Manual controls remain off by default; saved muted sound is applied before audio initialization.
- A single saved result with fixed deck/card snapshots, duration, start/finish times and active elapsed time. Home reopens it after reload; live rounds are never restored.
- Home Screen manifest/icons and local diagnostics.
- Custom decks from pasted text/CSV/JSON and UTF-8 TXT/CSV/JSON files, explicit text delimiters and CSV column/header/separator controls, editable previews, draft TXT export, IndexedDB saves, and a My decks collection.

The initial thresholds are tuning candidates: 50-degree tilt, 120 ms dwell, a 15-degree neutral band, and 200 ms neutral rearming. Their physical suitability and the screen-elevation sign in both orientations remain to be established on the actual phones.

The full category library, offline caching, safe updates, broader accessibility certification, and broad device certification remain later milestones. Backend-free deck sharing is implemented. Reload starts at Home, or opens a shared-deck preview if its link contains a deck fragment. This build must stay online; installation does not imply offline readiness.

## Backend-free QR/link sharing — September 29, 2026

Use **My decks → Share deck → Create share link** or **Open deck link** on Home. [User guide](SHARING.md). No accounts, service configuration, database hosting, or extra Pages workflow is required.

Validation: 115 unit tests and all 141 browser scenarios pass across Chromium mobile, WebKit mobile, and desktop Chromium. TypeScript, lint, formatting, and the production build also pass. Sharing screenshots were reviewed in portrait, short landscape, and at 200% text. The tests decode generated QR pixels and transfer the decoded link into a separate browser context. Safari focus return, fully visible QR presentation, and Arabic list layout were checked.

The portable format carries only the fixed title, words, and optional language. Automated checks cover exact Arabic/phrase preservation, Pages path preservation, strict validation and bounded decompression, actual QR decoding, fresh recipient storage/play, duplicate imports without overwriting edits, aborted saves, clipboard/share cancellation, missing compression APIs, and complete TXT export when the link is too large. Incoming links wait through rounds and open drafts.

Physical follow-up remains: on the published Pages URL, scan Pixel 10a → iPhone 17 Pro and in reverse; test native share sheets, copying/pasting, QR image download, TXT transfer/import, and installed/tab handoff. Review denser QR codes at normal camera distance. Use the permanent URL: localhost links do not work between phones, and temporary preview URLs expire. No public preview server was started for this work. Cold-launch offline support remains pending.

## Round preferences and latest result — September 27, 2026

Implemented HU-04/05: select 30/60/90 seconds in Game settings, remember sound and explicit controls, and reopen the latest finished/ended result from Home. Round duration cannot change while active or paused. Start/finish timestamps and active elapsed time are derived from the engine; pause/preparation time is excluded. An end before the first card has no start timestamp or displayed cards.

Validation: 94 unit tests, 111 browser scenarios, TypeScript, lint, formatting, and production build pass. New coverage includes all duration deadlines, legacy preference migration and failed migration, muted startup, invalid/future records, failed storage reads/writes, single persistence per finish, zero live-round persistence, pauses/countdowns, replay, and Arabic recaps after source-deck edits/deletion. The 27 added browser scenarios run across all three profiles. Settings, latest-result navigation, and recap screenshots were reviewed in mobile portrait, short landscape, and enlarged text.

The first browser run exposed test synchronization gaps: checks must wait for the playing phase and for deletion to commit before reload. The corrected scenarios pass; exact deadline boundaries and elapsed-time accounting also have deterministic engine tests.

On each physical phone, change duration/sound/buttons, close and reopen the same installed/tab context, finish a short motion round, reopen its recap, and verify muted sound. Browser automation does not certify device audio, permission prompts, or installed storage retention.

## Saved-deck management — September 27, 2026

My decks → Manage deck now supports rename, card edits/add/remove, UTF-8 TXT export, explicit replacement from text/files, and confirmed deletion. Writes compare versions and commit atomically; stale editors can reload or save a new copy. Library refreshes reflect deletion without disturbing an open draft or active round.

Validation: 73 unit tests and 84 browser scenarios across Chromium mobile, WebKit mobile, and desktop Chromium. The 24 new browser cases exercise the full lifecycle, Arabic TXT export/re-import, identity/version preservation, cancelled edits/replacement/deletion, aborted update/delete transactions after request success, two-tab conflicts, deleted-deck recovery, and mobile layouts at 200% text. Unit checks include immutable round/results snapshots and stale read completion after update/delete. Management screenshots were visually reviewed in portrait, short landscape, and enlarged text. Type checking, lint, formatting, and the production build also pass.

Physical follow-up remains: on each phone, rename/edit with the software keyboard, export/download and re-import Arabic cards, confirm/cancel replacement and deletion, and run a short gesture smoke test. Automated WebKit is not the native iPhone Files or Downloads UI. No public preview server was started for this change.

## File import slice — September 27, 2026

Validation passed: TypeScript, ESLint, production build, 65 unit tests, and all 60 browser scenarios. Import screenshots were reviewed in portrait, landscape, and 200% text. The affected creator/import scenarios were rerun after bringing the column selector above secondary CSV options.

Coverage includes CSV quoting/header/column selection, JSON title and invalid-entry correction, UTF-8/BOM and Arabic preservation, malformed/oversized input, cancelled file selection, retrying the same file, replacement without losing corrections, and a late file read after closing/reopening the creator. An imported CSV deck survives reload and completes a round with exactly the selected cards.

Use [the import guide](IMPORTING.md) for TXT/CSV/JSON examples. Physical follow-up: on both phones, choose each file type with the native picker, cancel and retry, preview/correct, save/reload, and play in both landscape directions. Check the software keyboard and Arabic rendering. Browser automation does not certify the native Files/Downloads interfaces or physical gestures.

## Custom deck slice — September 26, 2026

Validation passed: TypeScript, ESLint, production build, formatting, 41 unit tests, and all 39 browser scenarios. Chromium and WebKit screenshots were reviewed for the deck preview and the short landscape library.

Use Create deck → paste → select delimiter → Preview cards → name/correct → Save deck & play. This enters the usual setup with the current control setting. Reload and open My decks to play again.

Unit coverage checks Unicode-preserving parsing, explicit delimiters, limits, malformed records, completed-write behavior, and round snapshots. Browser coverage checks end-to-end creation/reload/play/replay, Arabic preview, cancellation and correction retention, invalid cards, short landscape/200% text, unavailable storage, an aborted transaction after request success, export/retry, and retention of unreadable records.

Physical recheck: paste English/Arabic comma lists on each phone, correct a card, save, reload from the same URL, and play. Check the software keyboard and landscape/portrait transitions. Offline launch, file imports, existing-deck management, and sharing are not part of this slice.

## Landscape navigation update

Deck selection and setup now use a viewport-sized layout on landscape screens up to 600 CSS pixels high. Decks are shown immediately, practice sits beside the ready panel, and Start stays in view. Help, installation notes, diagnostics, and the build identifier are available in Help; the settings icon opens a separate dialog. Long recovery content and enlarged text can scroll inside their panels without moving the primary controls off screen.

The owner reported that phone play worked well, with deck selection/setup feeling too much like a scrolling webpage. This change addresses that specific feedback. Physical review of the revised layout is still pending: check both landscape directions in tab and Home Screen modes, open/close Help and settings, enable movement, practice, and start a round. Verify browser bars/cutouts do not cover controls.

Automated validation for this update: type checking, lint, production build, 28 unit tests, and 21 browser scenarios passed. New checks cover 844×390 and 740×320 layouts, permission recovery, dialog focus return, 200% text with Start visible, Arabic setup, and returning to portrait. Landscape library, setup, motion-ready, and enlarged-text screenshots were reviewed. These checks do not replace physical phone testing.

## Validation recorded

On September 25, 2026, type checking, linting, the production build, 28 unit tests, and all 15 browser scenarios passed. A focused rerun of the transient-rotation motion scenario passed in all three projects. Screenshots were reviewed for desktop/mobile library layout and Arabic card rendering. The dependency audit reported no known vulnerabilities at installation.

The owner reports largely successful physical trials. Record the exact build, OS/browser version, launch mode, and remaining findings in [device evidence](device-trials/README.md); the qualitative report does not establish every measured target. Retain failures when appending retests.
