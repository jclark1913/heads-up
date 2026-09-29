# Heads Up — gesture game and custom decks

Status: the gesture MVP, TXT/CSV/JSON creation/import, deck management, remembered settings, latest result, and backend-free QR/link sharing are implemented. Physical sharing tests and detailed gesture trial records remain outstanding. Platform research checked September 24, 2026.

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
10. [Backend-free deck sharing](specs/10-deck-sharing.md) — portable links/QRs, independent local copies, and file fallback.

## Working defaults

- One phone, one guesser, one or more clue-givers in the same room.
- Landscape play, screen facing outward; both landscape directions supported.
- Tilt the screen toward the floor for **Correct**; toward the ceiling for **Pass**.
- Three-second preparation countdown, followed by a 60-second round; optional 30/90-second rounds.
- Correct = one point; pass = zero points; no repeats within a round.
- Guest play for parties and language classes, English/Arabic word banks, sound cues, and offline play after assets are cached.
- Single target-language prompts, with Arabic rendered right to left. The interface does not need to be bilingual.
- Starter categories including Famous People, plus custom banks from pasted text/CSV/JSON or imported TXT/CSV/JSON files, with a shared card preview. Text uses one card per line by default; Commas, Tabs and line breaks, or All whitespace can be selected explicitly. For example, paste `cat, dog, New York` with Commas selected to preview three cards.
- Create, import, play, and share without an account. QR/link sharing embeds a fixed snapshot; recipients preview and save independent local copies. Large lists can be exported as files.
- Motion controls are the default. Correct/Pass buttons are hidden until the user enables the manual-controls setting; remember that explicit choice locally.
- When checks reveal a problem, offer relevant permission or landscape guidance first, then an explicit Enable buttons fallback. Do not switch control modes automatically.

The decision log distinguishes confirmed requirements from proposed defaults. The first playable slice is implemented with two small test banks, motion practice, timed rounds, opt-in manual controls, and local diagnostics. Custom decks can now be created from pasted text/CSV/JSON or UTF-8 TXT/CSV/JSON files, corrected in preview, saved locally, and played. My decks supports renaming, card editing, replacement, confirmed deletion, and TXT export. Expanded categories, offline caching, and safe updates remain later work. Owner trial feedback is positive; full measured acceptance remains to be documented.

## Create a deck

Choose **Create deck**, paste your list, and select Lines (default), Commas, Tabs and line breaks, or All whitespace. For example, Commas turns `cat, dog, New York، قِطَّة` into four cards. Preview removes empty entries and exact duplicates while preserving the first spelling and Arabic diacritics.

Name the deck, correct or remove cards, and choose **Save deck & play** to enter setup. **My decks** lists saved decks after a reload. Saving requires a completed IndexedDB transaction; a failure keeps the draft open with retry and TXT export. Export a draft as a backup before saving if desired. Decks are local to the same browser and URL; a new temporary tunnel URL uses separate storage.

Use **Import file (.txt, .csv, .json)** to load a local file into the same preview. CSV has explicit column/header and separator controls; JSON accepts a string list or a title/words object. See [import formats and examples](docs/IMPORTING.md).

Imports support up to 1 MiB of UTF-8 text, 2,000 cards, 120 Unicode code points per card, and an 80-character deck name. Open **My decks → Manage deck** to rename a saved deck, edit/add/remove cards, export TXT, replace its cards from text or a file, or delete it. Replacement and deletion require confirmation. Failed writes retain the draft; conflicting edits from another tab offer reload or save as a new deck. Active rounds keep their original cards.

## Share a deck

Open **My decks → Share deck → Create share link** to show/download a QR or copy/share the link. Recipients preview it and choose **Save a copy & play**. Home also offers **Open deck link** for pasting a received link. Large lists use link or TXT-file fallback. Use the published site for links that work between phones. No account or backend setup is needed. [Sharing guide](docs/SHARING.md).

## Round settings and latest results

Open **Game settings → Round length** to choose 30, 60, or 90 seconds. The default is 60. Round length, sound, and your explicit motion/buttons choice are remembered in this browser. Length stays fixed during a round, including while paused. The timer starts with the first card and excludes preparation and explicit pauses.

After a round finishes or you confirm End round, **View latest result** on Home reopens its recap. Only the latest result is saved. It includes the original deck name, displayed cards/outcomes, selected duration, active time, and finish time; an early end is marked incomplete. Deck edits/deletion cannot change that recap. Play again uses the current deck if it still exists.

Reload always returns to Home and never resumes a live round. A storage failure keeps settings/results available for this visit and displays a notice. Existing saved data is retained if it cannot be read or a replacement write fails.

## Build sequence

1. Playable gesture MVP: an HTTPS test build with permission/practice, two small English/Arabic test banks, a timed round, gesture scoring, results, opt-in buttons, and local diagnostics.
2. Validate and tune that game on the owner's Pixel 10a and iPhone 17 Pro, in browser and installed modes, before adding the remaining features.
3. Complete starter categories, TXT/CSV/JSON ingestion, custom-bank management, and everyday settings; include backend-free sharing of fixed deck snapshots.
4. Finish offline use, safe updates, accessibility/polish, and broader device coverage before release.

The first milestone is ready for owner testing; the second establishes measured gesture acceptance. Small test banks and online-only play are deliberate first-slice limits, not reductions in the final product scope. See the [build plan](specs/05-validation-and-delivery.md) for deliverables and exit checks.

The remaining work is scaffolded in the [task backlog](specs/09-remaining-build-plan.md). Record the owner's trial observations in [device trials](docs/device-trials/README.md) and close remaining Android/iOS checks through HU-01/02. HU-15–18 now track backend-free sharing and its remaining physical checks; existing task IDs are preserved.

## Run the app

Use Node 22.12+ and `npm install`, then `npm run dev`. For a temporary HTTPS link on your phones, run `npm run phone:test` on Windows and keep this computer awake. Stop it with `npm run phone:test -- -Stop`.

See [testing and HTTPS setup](docs/TESTING.md) for commands, validation evidence, diagnostics, and current limitations. The app still needs an online launch; saved deck data lives in this browser, separately from the future offline app cache.

## Deploy to GitHub Pages

GitHub Actions workflows are included for pull-request validation and deployment from `main` after checks pass. Set the repository's **Settings → Pages → Source** to **GitHub Actions**, then run **Deploy to GitHub Pages**. Subsequent pushes to `main` deploy automatically.

See [the deployment guide](docs/DEPLOYMENT.md) for first-time setup, the Pages URL, and a local preview under the repository path.
