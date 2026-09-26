# Heads Up — playable gesture MVP

Status: milestone 1 implemented. Automated validation passes; physical gesture validation on the Pixel 10a and iPhone 17 Pro is still pending. Platform research checked September 24, 2026.

A phone-based party game: one person holds the screen facing their friends at forehead height, guesses the displayed prompt, and tilts the phone to record a correct answer or pass before time expires.

Delivery must be a PWA. Stable landscape gameplay during flips on iPhone and Android is a release requirement. Resolve failures within the web implementation; native packaging is out of scope. The core motion APIs are available on iOS Safari and Android Chrome, but permission handling, gesture reliability, screen behavior, and installed-app behavior must pass physical-device testing before declaring support. See the sourced [platform assessment](specs/03-motion-and-platforms.md).

## Read the specs

1. [Product scope and experience](specs/01-product.md) — audience, defaults, screens, and MVP requirements.
2. [Gameplay and round rules](specs/02-gameplay.md) — countdown, scoring, gesture rearming, interruptions, and results.
3. [Motion and platform feasibility](specs/03-motion-and-platforms.md) — iOS/Android support, permissions, detector design, and sources.
4. [Architecture and data](specs/04-architecture.md) — proposed application boundaries, models, offline behavior, and deployment requirements.
5. [Build plan and validation](specs/05-validation-and-delivery.md) — four milestones starting with a playable gesture MVP, device gates, and acceptance scenarios.
6. [Decisions and open questions](specs/06-decisions.md) — confirmed requirements and remaining defaults.
7. [Word banks and Arabic cards](specs/07-word-banks.md) — text/CSV/JSON ingestion, custom-bank storage, starter categories, and right-to-left card text.
8. [First device trial](specs/08-device-trial.md) — Pixel 10a/iPhone 17 Pro checklist and a reusable observation record.
9. [Remaining feature build plan](specs/09-remaining-build-plan.md) — implementation tasks, dependencies, acceptance checks, and device gates for milestones 2–4.

## Working defaults

- One phone, one guesser, one or more clue-givers in the same room.
- Landscape play, screen facing outward; both landscape directions supported.
- Tilt the screen toward the floor for **Correct**; toward the ceiling for **Pass**.
- Three-second preparation countdown, followed by a 60-second round; optional 30/90-second rounds.
- Correct = one point; pass = zero points; no repeats within a round.
- Guest play for parties and language classes, English/Arabic word banks, sound cues, and offline play after assets are cached.
- Single target-language prompts, with Arabic rendered right to left. The interface does not need to be bilingual.
- Starter categories including Famous People, plus custom banks from pasted text/CSV/JSON or imported TXT/CSV/JSON files, with a shared card preview. Text uses one card per line by default; tabs or all whitespace can be selected explicitly.
- Motion controls are the default. Correct/Pass buttons are hidden until the user enables the manual-controls setting; remember that explicit choice locally.
- When checks reveal a problem, offer relevant permission or landscape guidance first, then an explicit Enable buttons fallback. Do not switch control modes automatically.

The decision log distinguishes confirmed requirements from proposed defaults. The first playable slice is implemented with two small test banks, motion practice, timed rounds, opt-in manual controls, and local diagnostics. Imports, expanded categories, offline caching, and safe updates remain later milestones. Physical-device validation is pending.

## Build sequence

1. Playable gesture MVP: an HTTPS test build with permission/practice, two small English/Arabic test banks, a timed round, gesture scoring, results, opt-in buttons, and local diagnostics.
2. Validate and tune that game on the owner's Pixel 10a and iPhone 17 Pro, in browser and installed modes, before adding the remaining features.
3. Complete starter categories, TXT/CSV/JSON ingestion, custom-bank management, and everyday settings.
4. Finish offline use, safe updates, accessibility/polish, and broader device coverage before release.

The first milestone is ready for owner testing; the second establishes measured gesture acceptance. Small test banks and online-only play are deliberate first-slice limits, not reductions in the final product scope. See the [build plan](specs/05-validation-and-delivery.md) for deliverables and exit checks.

The remaining work is scaffolded in the [task backlog](specs/09-remaining-build-plan.md). Start with HU-01 device observations, track evidence in [device trials](docs/device-trials/README.md), and close the Android/iOS validation gate before implementing HU-03 onward. The backlog prepares feature work while phone testing is pending.

## Run the app

Use Node 22.12+ and `npm install`, then `npm run dev`. For a temporary HTTPS link on your phones, run `npm run phone:test` on Windows and keep this computer awake. Stop it with `npm run phone:test -- -Stop`.

See [testing and HTTPS setup](docs/TESTING.md) for commands, validation evidence, diagnostics, and current limitations. This first build stays online; imports and offline caching follow the gesture trials.

## Deploy to GitHub Pages

GitHub Actions workflows are included for pull-request validation and deployment from `main` after checks pass. Set the repository's **Settings → Pages → Source** to **GitHub Actions**, then run **Deploy to GitHub Pages**. Subsequent pushes to `main` deploy automatically.

See [the deployment guide](docs/DEPLOYMENT.md) for first-time setup, the Pages URL, and a local preview under the repository path.
