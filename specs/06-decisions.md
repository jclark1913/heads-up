# Decisions and open questions

Status: PWA delivery, motion as the default, conditional rotation guidance, and opt-in manual buttons confirmed by the project owner on September 25, 2026. English/Arabic target-language cards, custom-bank imports, and party/classroom use are also confirmed. Creator accounts and unlisted deck sharing are also approved in this planning session. Remaining defaults enable a concrete implementation plan and remain revisable.

## Confirmed by the project request

- A cross-platform phone app delivered as a PWA, accessible by browser link with optional home-screen installation.
- GitHub Pages is the planned permanent host, using the same static deployment approach as the Patriot app.
- A countdown and a timed forehead guessing game with the display facing other players.
- Up/down phone movement records whether the guess was successful.
- Motion is the default; manual scoring buttons are a user-enabled setting, off initially.
- Detect actual capability/readiness issues, offer relevant help including rotation-lock guidance, and offer enabling buttons as the final fallback.
- English and Arabic cards, with Arabic displayed right to left; a bilingual interface and translations are not needed.
- Basic starter categories including Famous People, plus user-imported custom word banks. The requested ingestion direction is CSV, JSON, and plain text, including whitespace-delimited lists. The owner also explicitly requested comma-delimited words/phrases pasted into a text box; include a Commas option in the shared preview flow.
- The same game serves parties and language students; no separate learning mode is requested.
- Build a basic playable vertical-slice MVP first, then use the owner's Pixel 10a and iPhone 17 Pro for gesture testing before expanding features.
- The owner authorized implementation of milestone 1 and now reports device tests were largely successful. Exact build/configuration results and remaining issues are not yet recorded; this qualitative report does not establish every measured acceptance target.
- On September 25, 2026, the owner requested a scaffolded build plan for the remaining features, contingent on Android and iOS testing. The [task backlog](09-remaining-build-plan.md) prepares that work; physical validation remains the prerequisite for feature implementation.

- On September 29, 2026, the owner explicitly chose backend-free sharing. This supersedes the earlier account/hosted-publication proposal: embed fixed decks in QR links and use file export when too large.

## Delivery decision and proposed defaults

**D-01 — PWA delivery (confirmed).** Use browser sensor APIs and require real-device validation first. Native apps, wrappers, and app-store distribution are outside the chosen delivery model. Stable landscape during normal scoring flips on iPhone and Android is a release requirement. Resolve failures through the web detector, layout, or setup experience and retest; unresolved core failures block release.

**D-02 — Controls and fallback (confirmed flow; proposed mapping).** Motion is the default. Show relevant guidance for detected problems, including conditional instructions to turn off Portrait Orientation Lock when landscape cannot be achieved. Correct/Pass buttons are hidden until the user enables Use buttons instead of motion in settings or accepts an Enable buttons offer. Remember that explicit choice locally; never switch automatically after an error. Manual mode replaces motion scoring and supports portrait play operated by a clue-giver. Down = Correct and up = Pass remain the proposed mapping, with no separate wrong-answer penalty. Optional inverted controls remain deferred.

**D-03 — Round format.** Three-second preparation, 60-second default, optional 30/90-second durations, one point per correct answer, no within-round repeats, and no penalty for passing.

**D-04 — Content (confirmed scope; proposed starter list).** Include English/Arabic cards and custom word-bank import now. Proposed starter categories are Famous People, Animals, Everyday Objects, and Actions, with at least 50 prompts per starter bank. Keep card text in its supplied target language and render Arabic right to left. No translation pairs, bilingual interface, or separate classroom mode. See the [word-bank spec](07-word-banks.md).

**D-05 — Infrastructure (confirmed, revised September 29).** Local creation/import, play, and sharing remain account-free and static. No Supabase or other backend is required. Keep preferences, the latest result, and custom banks on-device. Paste or UTF-8 TXT/CSV/JSON → select delimiter/column → preview/correct → save remains the ingestion flow. Export plain-text word lists for backup and large-list transfer.

**D-06 — Interruptions.** Detected interruptions pause casual play. Resume is explicit and recalibrates. Reloaded/killed pages start at Home. A suspension missed by lifecycle callbacks consumes wall time rather than silently extending the game.

**D-07 — Build sequence (confirmed direction; proposed milestone gates).** The owner has authorized and received the first implementation of the playable vertical-slice MVP in the React/TypeScript app. Its first handoff includes permission/practice, a real timed round, gesture scoring, results, two small English/Arabic test banks, opt-in buttons, and local diagnostics at an HTTPS URL. Validate and tune on the owner's Pixel 10a and iPhone 17 Pro before expanding categories/imports; finish offline and broader release validation afterward. Include installed-mode trials early. A testable build is distinct from a gesture-validated build; documentation, emulation, and proposed thresholds are not physical-device evidence. See the [four-milestone build plan](05-validation-and-delivery.md) and [device trial](08-device-trial.md).

**D-08 — Backend-free sharing (confirmed September 29, 2026).** Generate a fixed snapshot link/QR from a saved deck, carrying compressed cards in the URL fragment. Recipients preview and save independent local copies. Larger decks use link/file fallback. No sign-in, service, short codes, remote updates, or revocation. This replaces the earlier creator-account/Supabase proposal. See the [sharing spec](10-deck-sharing.md) and revised HU-15–18.

## Questions to settle before public release

1. **Name and visual identity:** what should the game be called? Working repository naming is sufficient for the playable gesture MVP.
2. **Starter-bank curation:** which famous people and regional/cultural references suit the intended groups? Proposed banks remain family-friendly; both spoken clues and acting are allowed without saying the displayed answer.
3. **Minimum devices:** which oldest iOS and Android versions matter? Proposed iOS starting floor is 18.4; Android minimum is pending the device test inventory. The first trial uses a Pixel 10a and iPhone 17 Pro, with exact OS/browser versions still to record; these do not establish the minimum supported devices. This affects certification scope, not capability detection.
4. **Arabic starter content:** which dialect/register and use of vowel marks best fit the first bundled banks? Custom banks preserve whatever target-language spelling the teacher or host supplies. This does not require language-learning settings.
5. **Final URL:** GitHub Pages is the planned permanent host, following the Patriot app. The repository name/path and any custom domain remain to be chosen before deployment.
6. **Competitive features:** should teams, multiple-round totals, or result corrections exist? Default is independent rounds with no result editing.

7. **Sharing device checks:** validate QR scanning, native sharing/downloads, and the final Pages path on both phones. No service/provider selection is pending.

## Revisit triggers

- Missed, wrong-direction, or duplicate gestures on a required device: tune/replace the browser detector or simplify the gesture, then repeat physical testing.
- Frequent display sleep or disruptive rotation on required configurations: improve web presentation and setup handling, then retest. Keep unresolved core failures visible as release blockers.
- Shared editing, automatic library sync, hosted short codes, revocation, or public discovery becomes a requirement: reconsider a backend explicitly. The current product remains backend-free.
- Physical trials show users cannot distinguish tilt directions or return to neutral reliably: revise the tutorial/control model before adding more game features.
