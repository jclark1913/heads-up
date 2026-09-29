# Remaining feature build plan

Status: updated September 29, 2026. Local creation/import, deck management, settings/results, and backend-free QR/link sharing are implemented. The owner prioritized sharing ahead of starter categories and rejected a backend/account requirement. Formal measured device evidence and physical sharing/UI checks remain outstanding.

The [delivery spec](05-validation-and-delivery.md) owns milestone acceptance and T-01–23 scenarios. This file owns task order, dependencies, and implementation boundaries. The [decision log](06-decisions.md) owns product choices. Check off tasks only with implementation and evidence; a written plan does not complete them.

## Starting point

The current app has two 20-card test banks, permission/practice, 30/60/90-second rounds, remembered motion/manual/sound preferences, saved latest results, local diagnostics, a manifest/icons, and CI/Pages workflows. Full measured support remains unverified; qualitative owner feedback is positive.

Reuse these existing boundaries:

- [Engine](../src/game/engine.ts): `createRound` takes the selected `durationMs` and snapshots prompts. Start/finish timestamps feed a separate immutable result record; the scoring/timing path remains shared.
- [Controller](../src/app/controller.ts): merges bundled and saved custom decks through the repository, waits for committed writes, and snapshots deck metadata for rounds/results. Versioned preferences and one latest result use local storage with in-memory failure recovery.
- [Screens](../src/App.tsx): use the shared library and round snapshots. [DeckCreator](../src/DeckCreator.tsx) owns paste/file options, preview, save, and saved-deck editing/replacement; [FittedPrompt](../src/FittedPrompt.tsx) is shared with the card sample.
- [Banks](../src/content/banks.ts): include schema/version/source metadata and optional language. [Validation](../src/content/decks.ts), [text parsing](../src/content/textImport.ts), and [IndexedDB repository](../src/content/repository.ts) support local creation and version-checked updates/deletes.
- [Delivery](../docs/DEPLOYMENT.md): build/CI workflows and Pages base-path configuration already exist. Verify the final hosted URL; service-worker caching and safe updates remain new work.

## Gates and execution order

1. **Now — record trial feedback and remaining issues:** HU-01, then HU-02. The owner reports largely successful trials; capture configurations/findings and complete any missing acceptance checks. Codex triages needed fixes. Planning continues while detailed evidence is recorded.
2. **After G2 — complete everyday play:** HU-03 provides the common bank contract. HU-04, HU-06, HU-07, and HU-10 can then progress independently. HU-05 follows settings; HU-08 joins parsers and storage; HU-09 finishes bank management.
3. **Sharing implementation:** revised HU-15 → HU-16 → HU-17 are implemented after local deck management, ahead of expanded starter categories at the owner’s request. HU-18 records the remaining physical transfer checks. Existing IDs remain stable.
4. **After G3S — finish the PWA:** HU-11, HU-12, HU-13, then HU-14. Apply accessibility within each earlier UI task; HU-13 audits the integrated local and sharing flows.

**G2: motion validated.** HU-01 and HU-02 pass the existing [milestone 2 targets](05-validation-and-delivery.md#milestone-2--validate-and-tune-gestures-on-both-phones) on both phones, tab and installed, both landscape directions. All required configurations validate the same candidate build. Quick impressions or manual-mode success do not clear this gate. Failed or partially tested configurations keep feature implementation on hold.

**G3: everyday flow complete.** HU-03–10 complete; T-16–17 import/lifecycle checks pass; a host can import, correct, save, play, export, and reimport an English or Arabic bank; short motion smoke tests pass on both phones after UI integration. This gate does not claim offline readiness.

**G3S: sharing ready.** Revised HU-15–18 and T-19–22 pass. A sender shares a fixed QR/link snapshot; a fresh recipient saves/plays it on the other phone. Large lists have working file fallback and no backend/account dependencies. Automated evidence is available; physical native scanning and installed-mode transfer remain to record.

**G4: release ready.** G3S and HU-11–14 complete; offline cold launch and safe updates pass on real devices; release-blocking product decisions are resolved; support claims match recorded configurations. Wider device coverage can remain explicitly unverified, but core failure on either owner phone blocks release.

Use one task per reviewable change where practical. If a task needs multiple changes, retain its ID and divide it into parts; complete the task only when integrated acceptance checks pass. No calendar estimates are committed before device findings establish the tuning effort.

## Milestone 2 — Device validation

### HU-01 — Record the Android and iOS baseline

- [ ] Complete. **Dependency:** existing MVP and accessible HTTPS build. **Owner:** project owner/tester, with Codex support.
- Run the [quick trial](08-device-trial.md) first, then measured acceptance on Pixel 10a/Chrome and iPhone 17 Pro/Safari. Test tab and installed launch independently, in both landscape directions.
- Store reports using the [evidence index and template](../docs/device-trials/README.md), including build, URL, OS/browser versions, intended gestures, observed outcomes, and diagnostics references.
- **Done when:** all four device/launch combinations have observations; each direction has measured counts or an explicit reason it could not be tested. This task can finish with failures; those route to HU-02 and keep G2 closed.
- **Verification:** T-01, T-04, T-06–10, T-13–15. Missing data is Not tested, never Pass.

### HU-02 — Fix trial failures and close G2

- [ ] Complete. **Dependency:** HU-01 observations. **Owner:** Codex fixes; owner/tester retests.
- Turn each reproducible failure into a focused fix, prioritizing wrong-direction/duplicate scoring, exposed prompts, rotation, permission, and interruption problems. Record nonblocking observations separately.
- **Touchpoints:** `src/motion/detector.ts`, `src/platform/layout.ts`, `src/platform/effects.ts`, `src/app/controller.ts`, relevant screens/tests. Change only what evidence warrants.
- Add deterministic regressions for reproducible failures. If latency or another target cannot be established with existing diagnostics, add the minimum local measurement support and rerun; do not infer success from missing measurements.
- **Done when:** every G2 requirement passes on the final candidate build, failures and retests remain linked, tuning constants are recorded, and the evidence index records the gate outcome. A passing baseline needs an evidence review, without unnecessary detector changes.
- **Verification:** full milestone 2 physical targets plus affected automated checks. Both operating systems remain required; fixes stay within the PWA.

## Milestone 3 — Content and everyday use

The owner authorized the first custom-deck slice after successful phone tests. HU-03/06/07/08 are partially implemented below; whole-task checkboxes remain open for their broader acceptance requirements. G2 still needs its measured records before release certification. Paths labeled Planned remain suggestions for work not yet implemented.

### HU-03 — Versioned banks and a shared library boundary

Implemented slice: version/source/schema metadata, optional language, common library, custom validation, and round identity/content snapshots. Ingestion and management use this contract; publication provenance remains.

- [ ] Complete. **Dependency:** G2.
- Extend `Bank` with `version`, `source`, optional category/language metadata, custom-record schema/timestamps, and optional publication provenance for received copies. A received copy remains a custom bank with fresh local IDs. Keep editorial notes with bundled content. Introduce a repository boundary for bundled and custom banks.
- **Planned files:** `src/content/types.ts`, `library.ts`, `validation.ts`; integrate existing `banks.ts`, controller, and screens.
- Apply shared nonempty/ID/limit validation and conservative duplicate comparison: trim + Unicode NFC; preserve displayed spelling and Arabic diacritics. Bundled banks remain immutable.
- Resolve the selected bank before Start and snapshot identity, version, title, language metadata, and prompts. Gameplay/results must not depend on later lookups of an edited/deleted bank. Preserve the engine's existing prompt snapshot behavior.
- **Done when:** bundled play still works through the boundary, invalid/missing selections return to a usable library, and repository changes cannot mutate an active round or its results.
- **Verification:** T-01–03, T-10, T-15, T-17; validation and snapshot regressions.

### HU-04 — Duration and remembered preferences

Implementation and automated checks complete: 30/60/90-second settings, unified versioned preferences, legacy migration, restored sound before cues, session-only recovery, and fixed active-round duration. Physical relaunch/audio/motion checks remain before closing acceptance.

- [ ] Complete. **Dependency:** HU-03.
- Add 30/60/90-second selection, default 60. Pass it into the existing engine parameter and replace hardcoded duration copy throughout setup/play/results.
- **Planned files:** `src/platform/preferences.ts`, extracted settings UI where useful; integrate the controller and `GameEffects`.
- Persist a versioned duration/sound/control-mode record. Migrate the existing `heads-up.controls.v1` manual choice once; a valid new record wins. Failed migration must not discard the legacy choice. Invalid data uses safe defaults and unavailable storage still permits session settings.
- Restore saved sound to both UI and effects before cues can play. Capability failures never write a manual-control preference.
- **Done when:** duration drives the whole round and survives reload alongside sound and explicit controls; fresh users still start with motion and 60 seconds.
- **Verification:** T-01–02, T-07, T-09–10, T-12, T-14; deadline boundaries for all durations and preference migration/failure cases.

### HU-05 — Save and reopen the latest result

Implementation and automated checks complete: one immutable latest-result snapshot, Home reopening, incomplete early ends, original text after deck changes/deletion, and failed/corrupt storage recovery. Reopening does not instantiate a live round. Physical same-context relaunch acceptance remains.

- [ ] Complete. **Dependencies:** HU-03, HU-04.
- Define the versioned [result snapshot](04-architecture.md#data-model): deck identity/version/title, duration, timestamps/active elapsed time, finish reason, and ordered prompt/outcome snapshots.
- **Planned files:** `src/game/results.ts`, `src/platform/results.ts`, results/Home integration.
- Persist at most the latest completed or ended round once. Reopening a result cannot resume a game. Handle a missing source bank with a return-to-library action; saved text remains readable.
- **Done when:** reload starts at Home with access to the latest result; an ended round is marked incomplete; corrupt/unavailable storage preserves in-memory results and explains a failed save.
- **Verification:** T-01–03, T-07, T-12, T-17; repeated finish callbacks, deleted/edited source bank, invalid stored result. Do not persist live rounds or sensor traces.

### HU-06 — Text, CSV, and JSON ingestion

Implementation and automated checks are complete: all four text delimiters, strict UTF-8 file decoding, Papa Parse 5.7.0 CSV with explicit separator/header/column selection, JSON lists/title-words objects, shared preview diagnostics, Unicode-preserving deduplication, and input/card limits. Invalid JSON entries remain editable without coercion. See [the import guide](../docs/IMPORTING.md). Physical picker acceptance is tracked with HU-08; the broader device gate remains open.

- [ ] Complete. **Dependency:** HU-03.
- Build pure parsers returning candidate text, source locations, and diagnostics for a shared preview. Retain original input in the draft; parsing cannot save a bank.
- **Planned files:** `src/content/import/text.ts`, `csv.ts`, `json.ts`, `decode.ts`, `types.ts`, with focused tests alongside them.
- Implement explicit Lines / Commas / Tabs and line breaks / All whitespace text modes; Commas splits ordinary/Arabic commas and line breaks, trims surrounding whitespace, preserves phrases, and reports ignored empty entries; CSV column/header selection using a proper CSV parser; JSON string arrays and `{ title, words }`. Evaluate the CSV dependency during implementation and record the choice.
- Decode UTF-8 strictly with optional BOM. Visibly flatten embedded CSV/JSON newlines. Reject malformed syntax, unsupported shapes, and invalid entries without coercion or silent parser switching.
- Use proposed limits of 1 MiB input, 2,000 playable entries, and 120 Unicode code points per prompt. Apply limits to paste and files; report violations without truncation. Surface duplicate/empty counts and editable diagnostics.
- **Done when:** all supported inputs feed one preview contract and preserve multiword prompts, Arabic joining characters, spelling, and diacritics according to the selected format.
- **Verification:** T-16 fixtures for boundaries, BOM/line endings, comma-delimited phrases/Arabic lists, repeated/trailing separators, quoted CSV, invalid UTF-8/JSON, mixed scripts, duplicates, and HTML-like literal text. Confirm Lines preserves literal commas and Commas does not interpret CSV quotes.

### HU-07 — Durable custom-bank storage

Implemented slice: validated IndexedDB reads, transactional create/update/delete, completed-write acknowledgment, failure recovery, preservation of unreadable records, and atomic expected-version checks. Revisions preserve identity and increment the bank version; stale edits require reload or a new copy. Cross-tab/focus refreshes reconcile the library without restoring deleted records. Persistence requests and migration coverage for future schema versions remain.

- [ ] Complete. **Dependency:** HU-03; independent of parser/UI implementation.
- Add a versioned IndexedDB repository with transactional create/read/update/delete, stable IDs, bank versions, and schema migration handling. Integrate the shared library boundary.
- **Planned files:** `src/content/storage.ts` and integration tests. Use an app-specific database name separate from replaceable caches and other Pages projects.
- Report Save success only after transaction completion. Expose unavailable/quota/blocked-upgrade states to callers and preserve in-memory drafts. Failed writes/migrations must not reset existing banks.
- Define explicit replacement and stale-edit behavior: replacement preserves custom-bank identity and increments version; stale editors must reload or deliberately resolve conflicts instead of silently overwriting a newer record.
- **Done when:** custom records survive reload, bundled banks cannot be overwritten, failed transactions preserve data, and schema/version transitions have a tested contract before later PWA updates.
- **Verification:** T-12, T-17; transaction failure, quota simulation, blocked/aborted migration, concurrent edits, and storage namespaces. Offline app launch comes in HU-11.

### HU-08 — Add-bank and editable preview flow

Implemented slice: paste and TXT/CSV/JSON files, format/delimiter/header/column selection, counts, correct/remove/name, fitted card sample, discard/reparse confirmation, draft TXT export, save, and play. Failed/replaced/cancelled reads preserve drafts. All 39 creator/import browser scenarios pass across the three browser profiles; actual phone picker/keyboard acceptance remains.

- [ ] Complete. **Dependencies:** HU-06, HU-07.
- Connect Paste / Import file → explicit options → shared preview/correction → named Save → My word banks. Include a text box with a Commas option and example `cat, dog, New York`; show three editable cards without requiring a file or CSV column selection. Use the normal mobile file picker for files.
- **Planned files:** `src/screens/BankImport.tsx`, `BankLibrary.tsx`, shared prompt presentation extracted from `FittedPrompt`, and controller integration.
- Show playable/empty/duplicate counts, invalid entry locations, limits, and a sample at gameplay size. Use safe text rendering and direction isolation for titles/cards/editable fields; no automatic language classification.
- Confirm before discarding preview edits when reparsing original input or leaving a dirty draft. Cancel saves nothing. Keep the draft open on failure, with UTF-8 TXT export available even before HU-09's management screen.
- **Done when:** a host imports each format, corrects invalid text, saves and plays the reviewed bank; short lists are allowed and setup explains early exhaustion. Empty/invalid banks cannot start a round.
- **Verification:** T-03, T-10, T-15–17; paste/files, options, corrections, cancel, failed save/export, long Arabic prompts, and actual iOS/Android picker behavior.

### HU-09 — Edit, replace, delete, and export banks

Implemented: My decks management with rename, card edits/add/remove, TXT export, confirmed deletion, and explicit replacement through the shared importer. Failed writes keep drafts, conflicts offer reload/new-copy recovery, and active rounds/results retain snapshots. All 24 management browser scenarios pass; physical keyboard/download/export acceptance remains, so the completion checkbox stays open.

- [ ] Complete. **Dependency:** HU-08.
- Add rename, prompt corrections/add/remove, confirmed deletion, explicit re-import replacement, and Export words. Ordinary re-import creates a new bank.
- **Planned files:** `src/screens/BankEditor.tsx`, shared `src/content/export.ts`, library/storage integration. Reuse validation and the export path already needed for failed drafts.
- Export UTF-8 TXT with one card per line, retaining text/order. Explain local storage and make export easy to find as a backup; sharing later embeds only an explicitly reviewed snapshot in a portable link. Persistent-storage requests are optional and never a guarantee.
- **Done when:** export/reimport preserves English/Arabic spelling and diacritics, cancelled destructive actions change nothing, failed saves keep edits, and cross-tab edits/deletes cannot alter active rounds or saved results.
- **Verification:** T-16–17; full lifecycle, stale edits/replacement versions, storage failure, snapshots, and actual mobile download/export behavior.

### HU-10 — Curate starter categories

- [ ] Complete. **Dependency:** HU-03; final rendering check uses HU-08's shared presentation.
- Add Famous People, Animals, Everyday Objects, and Actions in independently curated English and Arabic banks. Proposed target: eight banks with at least 50 reviewed prompts each, not translation pairs.
- **Planned files:** `src/content/bundled/` data/validation and editorial notes. Retain the small MVP banks as test fixtures if helpful.
- Resolve cultural references and Arabic register/diacritics with the owner before treating lists as reviewed. Record authorship/source notes and fluent Arabic review; generated drafts do not satisfy editorial acceptance.
- **Done when:** approved banks have stable IDs/versions, clear names/counts/descriptions, unique valid prompts, readable longest cards, and recorded review.
- **Verification:** T-03, T-15; automated validation plus human readability/content checks on both phones. User-created banks do not require 50 cards.

## Milestone 3 continued — Backend-free deck sharing

The September 29 decision replaces the older authentication/API tasks. Keep IDs HU-15–18 for continuity; their old service/account requirements are superseded, not pending setup.

### HU-15 — Portable snapshot contract

- [x] Implementation complete. **Dependency:** local deck validation/management.
- Versioned title/ordered words/optional language payload, gzip/base64url fragment, full validation, bounded decoding, and file fallback.
- Preserve the current Pages base path. Exclude local IDs, source files, results, preferences, and traces.
- **Verification:** T-19–20, unit tests including malformed versions, Arabic/phrases, decompression limits, and URL size limits.

### HU-16 — QR/link creation

- [x] Implementation complete. **Dependency:** HU-15.
- Saved-deck review → Create share link; local QR generation, copy, native share where available, selectable-link fallback, PNG download, and TXT export.
- Keep QR density within the defined limit. Never truncate oversized decks; offer links or files.
- **Verification:** T-20, T-22; decode the actual QR image in tests, compare all exported words, test unavailable APIs and cancelled copy/share.

### HU-17 — Recipient preview and independent copies

- [x] Implementation complete. **Dependency:** HU-16 and local repository.
- Open/scanned/pasted link → preview → explicit Save a copy & play with fresh IDs and completed-write confirmation.
- Remember content fingerprints; offer prior edited copy or another copy without overwriting.
- Defer incoming links through games and existing dialogs. Failed saves preserve preview/export.
- **Verification:** T-21–22; separate browser contexts, Arabic rendering/play, duplicate imports, aborted writes, game/draft deferral, focus and small-screen layouts.

### HU-18 — Physical sharing readiness

- [ ] Complete. **Dependency:** HU-17 and the published Pages build.
- Generate links on the permanent URL and scan Pixel 10a → iPhone 17 Pro and in reverse, including Arabic.
- Check native share sheets, QR image download, clipboard/manual copy, oversized TXT transfer/import, installed/tab opening, and both orientations.
- Record build, OS/browser, launch mode, observed limits, and any failures. Automated decoding and emulation do not certify camera scanning or native handoff.
- **Done when:** T-19–22 pass on both phones and G3S has recorded physical evidence. Offline launch remains HU-11–14.

## Milestone 4 — Offline use and release

### HU-11 — Offline shell and truthful readiness

- [ ] Complete. **Dependency:** G3S.
- Add service-worker registration, versioned precaching, and offline status. Cache the complete shell, bundled content, icons, and required local assets; account for current generated sound cues and any future font/audio files.
- **Planned files:** `src/pwa/`, `vite.config.ts` integration, readiness UI, browser offline tests.
- Respect the deployed base path, manifest identity, and service-worker scope. Use app-specific cache names. IndexedDB banks stay separate; do not casually change installed-app identity.
- Show Ready offline only after the required asset set is cached and usable; recheck after startup/eviction. Cache/storage failure leaves an honest online-only state. No first-ever offline launch promise.
- **Done when:** a previously confirmed ready app cold-launches and completes bundled/custom/received-deck rounds offline without login, including Arabic/feedback, in tab and installed modes on both phones. Sharing has no remote lookup or private management responses; decode portable content locally after the shell loads.
- **Verification:** T-09, T-11, T-15, T-17, T-23; offline/cache-loss/partial-install tests, repository-subpath preview, physical airplane-mode cold starts.

### HU-12 — Safe updates and storage recovery

- [ ] Complete. **Dependency:** HU-11 and HU-07's migration contract.
- Stage new shell/content versions and offer updates on Home/Results. Protect preparation, play, feedback, and paused rounds; no forced reload/activation that discards their state.
- **Planned files:** `src/pwa/` coordination/UI, storage migrations, an old-build/new-build browser test harness.
- Retain assets needed by open clients and avoid mixed versions. Test another tab playing when one accepts an update; defer activation or prove the playing client remains coherent. Coordinate within shared contexts and test installed/browser storage boundaries separately.
- Recover from rejected cache writes, interrupted upgrades, blocked databases, and schema mismatch without deleting banks. Restrict cleanup to this app; never clear all origin storage.
- **Done when:** updates apply between rounds, results/settings/banks survive, and live/paused rounds remain unchanged with multiple clients open.
- **Verification:** T-07, T-11–12, T-17, T-23; two-version production builds, stale tabs, migration rollback/failure, real-device installed updates.

### HU-13 — Accessibility, installation help, and group trials

- [ ] Complete. **Dependency:** HU-10–12; earlier tasks already meet baseline accessibility requirements.
- Audit setup/import/edit/play/results and sender/recipient sharing flows for focus/navigation, labels, contrast, 44 CSS-pixel targets, text zoom, safe areas, reduced motion, and long/mixed-script layout.
- Keep secret prompts out of automatic screen-reader announcements in forehead mode; retain manual/keyboard play. Verify optional audio/wake-lock failures remain understandable.
- Finalize install/offline/storage help and browser Back/exit behavior. Explain independent local copies, fixed portable links, file fallback, and why deleting a deck cannot recall a shared link.
- Run a small party trial and a teacher/learner trial with a target-language list. Record confusion, reading difficulties, accidental actions, and fixes; no separate classroom mode or proficiency scoring.
- **Done when:** flows are usable with relevant assistive settings, Arabic readability has human review, and group-trial blockers are fixed/retested.
- **Verification:** T-08–10, T-13–15, T-18–23; tools plus actual keyboard/screen-reader/device and participant checks.

### HU-14 — Final hosting checks and release certification

- [ ] Complete. **Dependency:** HU-11–13, G3S, and resolved release decisions below.
- Verify permanent HTTPS Pages URL, build/base path, manifest/install assets, sensors, offline/updates, and storage isolation. Build on the existing CI/Pages workflows.
- Run automated checks and applicable T-01–23 scenarios; repeat milestone 2 physical targets on every claimed supported configuration using the final candidate build.
- Seek the intended oldest iOS/browser, a current stable iPhone configuration, and a second Android manufacturer/less powerful device. If unavailable, limit claims to measured configurations and retain the coverage gap explicitly.
- **Deliverables:** release checklist, final build/URL, known limitations, supported-device evidence, and updated README/testing/deployment docs. Create these records during the task rather than implying certification now.
- **Done when:** G4 evidence is complete and release scope reflects it. Core iPhone/Android failures block release. Publication follows the owner's release decision.

## Decisions to resolve at the right time

- **Before HU-10 acceptance:** starter categories, cultural references, Arabic dialect/register and diacritics. Keep the proposed eight-bank/50-card target until revised; see D-04.
- **During HU-06:** CSV parser choice and proposed shapes/limits against representative files. New formats such as XLSX/PDF remain out of scope.
- **During HU-18:** physical QR capacity/readability, installed/tab handoff, and final Pages path. No provider, sender, or account configuration is required.
- **Before HU-14:** final name/identity, intended minimum devices/OS versions, and permanent URL. The deployment guide identifies the current repository-path URL; verify it before release rather than inventing a new host.
- **Separate future scope:** creator/player accounts, hosted short codes, remote revocation, automatic library sync, shared editing, public discovery, online multiplayer, teams, profiles, payments, translation, and native packaging remain deferred.

## Implementation handoff and definition of done

Carry each HU ID into its branch/PR description and link to this backlog. Use the [build-task issue template](../.github/ISSUE_TEMPLATE/build-task.yml) if tracking work in GitHub; this scaffold does not publish issues.

For each implemented task:

- [ ] Dependencies and device gate are satisfied; acceptance checks have evidence.
- [ ] Relevant unit/browser regressions cover new behavior and important failures. Preserve engine, detector, input-mode, and interruption invariants.
- [ ] `npm run format:check`, `npm run check`, and relevant `npm run test:e2e -- --workers=2` scenarios pass; run the full browser suite at milestone integration, as CI already does.
- [ ] Repeat a short Android/iOS motion smoke test after setup, gameplay layout, shared prompt rendering, or controller lifecycle changes; record build/outcome.
- [ ] Update affected specs/testing notes and task status. Keep automated and physical evidence distinct; previous test counts do not prove a new build.

Local creation/import, saved-deck management, settings/latest results, and backend-free QR/link sharing are implemented. Next product work is HU-10 (reviewed starter categories), including Arabic register/content choices. Record physical QR/native-share checks under HU-18 and outstanding gesture/picker/keyboard/export observations under HU-01/08/09.
