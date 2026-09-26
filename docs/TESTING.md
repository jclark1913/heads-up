# Run and test the first playable build

Milestone 1 is implemented. The Pixel 10a and iPhone 17 Pro have not yet been tested. Synthetic browser tests exercise the real game/detector path but cannot establish physical gesture accuracy or device permission behavior.

## Local development

Use Node 22.12 or newer (this build used Node 24). From the project directory:

```sh
npm install
npm run dev
```

Open the printed localhost URL. Desktop play requires explicitly enabling Use buttons instead of motion. A phone visiting a plain HTTP LAN address does not get the secure-context exception that localhost gets.

Useful commands:

- `npm run check`: type check, lint, 28 unit tests, and production build.
- `npm run test:e2e -- --workers=2`: 15 browser scenarios in Chromium mobile, WebKit mobile, and desktop Chromium. Install browsers once with `npx playwright install chromium webkit`.
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

Restarting the tunnel creates a new origin. Use the new link and reinstall the Home Screen shortcut when it changes. Browser permissions and saved settings belong to the origin, so they may need to be set again.

The tunnel serves only the built dist assets, with cache disabled for iteration. Source files, specs, node_modules, and local diagnostic files are not served. Port 4173 must be free; do not run another preview server or browser test suite on that port while starting the tunnel. Permanent hosting can replace this helper later.

## First trial

Follow [the short checklist](../specs/08-device-trial.md). For a useful first report:

1. Open a deck and Enable movement. Hold the phone sideways, screen outward. If rotation is blocked, use the conditional rotation-lock guidance.
2. Practice down = Correct and up = Pass, returning upright between tilts. Try both landscape directions.
3. Play a full round, then repeat in the installed/Home Screen launch.
4. Report misses, wrong directions, duplicate answers, accidental rotation, comfort, and the build number shown in the footer.

For more detail, expand Device testing & diagnostics before starting and enable Record a local sensor trace. This records a bounded in-memory trace for that visit only. Pause or finish the round to download/copy the JSON report. Turning recording off clears it. Nothing is uploaded automatically. The report contains browser information and motion measurements; add your intended gestures and observed mistakes separately.

## What is in this build

- Two 20-card English/Arabic test banks, a three-second preparation countdown, and 60-second rounds.
- Tap-initiated permission, calibration, practice, gesture dwell/rearming, a landscape game surface, and interruption/resume handling.
- Correct/Pass feedback, sound where available, results, replay, and an optional screen wake lock.
- Explicit manual controls, off by default, with the user's choice saved locally when available.
- Home Screen manifest/icons and local diagnostics.

The initial thresholds are tuning candidates: 50-degree tilt, 120 ms dwell, a 15-degree neutral band, and 200 ms neutral rearming. Their physical suitability and the screen-elevation sign in both orientations remain to be established on the actual phones.

Custom imports, the full category library, configurable duration, offline caching, saved results, safe updates, broader accessibility certification, and broad device certification remain later milestones. Reload starts at Home. This build must stay online; installation does not imply offline readiness.

## Validation recorded

On September 25, 2026, type checking, linting, the production build, 28 unit tests, and all 15 browser scenarios passed. A focused rerun of the transient-rotation motion scenario passed in all three projects. Screenshots were reviewed for desktop/mobile library layout and Arabic card rendering. The dependency audit reported no known vulnerabilities at installation.

Physical trial status remains Not run. Keep phone observations with their exact build, OS/browser version, and launch mode, and retain failures when appending retests.
