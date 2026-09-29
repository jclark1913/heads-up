# Build plan and validation

Status: milestone 1 and the local TXT/CSV/JSON creation/import flow, saved-deck management, remembered round preferences, and latest results are implemented, with 94 passing unit tests and 111 passing browser scenarios across Chromium and WebKit. The landscape-transition scenario also passed a focused rerun in all three browser projects. Desktop browser checks and synthetic readings are not physical-phone validation. The owner reports largely successful device trials. Exact configurations, build/results, and remaining issues are still to record before declaring milestone 2 complete. See [run/test instructions](../docs/TESTING.md).

## Delivery approach

The [remaining-feature task backlog](09-remaining-build-plan.md) breaks milestones 2–4 into implementation-sized work with dependencies and acceptance checks. This spec remains the source of milestone gates and T-scenarios; the [device evidence index](../docs/device-trials/README.md) tracks actual trials. Scaffolding the backlog does not clear a physical-device gate.

Build a small playable vertical slice in the eventual application, then tune it on both phones before expanding the feature set. Practice and diagnostics use the same detector and input path as the real round. A separate sensor demo is not the first deliverable.

The first milestone is ready for owner testing when the build and automated checks pass and a phone-accessible HTTPS preview is available. Physical gesture acceptance belongs to the next milestone; do not claim it from emulation or make it a prerequisite for handing over the first test build. Each milestone ends with an observable result rather than a calendar estimate.

## Milestone 1 — Playable gesture MVP

**Deliverable:** an HTTPS link to a small game the owner can play on the Pixel 10a and iPhone 17 Pro, with a visible build identifier and the [device trial checklist](08-device-trial.md).

**What the owner can do:**

- Choose between one small English test bank and one small Arabic test bank, roughly 20 prompts each. These are fixtures for playing and checking layout; the full starter categories and 50-prompt curation target come later.
- Enable movement, see actionable permission/rotation guidance if needed, and practice Correct/Pass without a timer.
- Start a three-second preparation countdown, calibrate at the forehead, and play a 60-second round. Down = Correct, up = Pass; feedback and a stable return to neutral precede the next card.
- Hear simple start/answer/end cues when audio is available and see labeled visual feedback. Score one point for Correct, zero for Pass; show ordered results and Play again.
- Pause/resume through basic visibility/posture recovery without scoring while hidden. A full reload starts over at Home.
- Explicitly enable manual buttons in setup or recovery; they remain off by default. Remember that choice when storage is available. A successful manual round does not count as a successful motion test.
- Open the same build from a browser tab or Home Screen after installation, initially online. Include a minimal manifest, icons, and installation instructions so installed presentation is tested early. Offline caching and safe service-worker updates are milestone 4 work; show no offline-ready claim in this build. [PWA installability requirements](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

**Build order within this milestone:**

1. Scaffold React, TypeScript, and Vite with the lightweight conventions discussed from the Patriot app: custom CSS, Vitest/React Testing Library, linting, and formatting. Keep the game engine and sensor detector independent of React. No backend or accounts.
2. Implement the engine and thin setup/round/results screens with injected time/randomness. Verify deadline, one-answer-per-prompt, deck exhaustion, and replay behavior using the explicitly enabled manual input path.
3. Add capability checks, tap-initiated permission, normalized sensor input, calibration, practice, and the detector. Feed motion and manual commands into the same engine.
4. Integrate landscape presentation in both directions, return-to-neutral privacy, lifecycle interruption/resume, simple cues, and optional wake lock. Optional API failures must not break the round.
5. Add opt-in local diagnostics and the minimal installable shell. Diagnostics show build ID, active stream, readiness, normalized tilt, detector state, accepted/rejected actions, and relevant timestamps. A local Copy/download report helps explain failures; never upload traces automatically.
6. Produce a phone-accessible HTTPS test build and hand off the short checklist with known issues. Use the top-level URL, not an embedded preview or an insecure LAN address. Choose the preview host during implementation; this planning step does not deploy anything.

**Ready-for-testing gate:** type checking, linting, build, focused engine/detector tests, and a browser flow covering setup → preparation → scoring → results → replay pass. Emulated denied/missing sensors expose the explicit manual fallback; Arabic cards render in the shared game. The preview URL, build ID, and checklist are supplied. Physical tests remain marked Not run until the owner or another tester performs them.

Keep custom import/storage, full category curation, configurable duration, offline support, and visual polish out of this first slice. Its working behavior and code are the foundation of the eventual app.

## Milestone 2 — Validate and tune gestures on both phones

**Deliverable:** the same playable game with measured gesture behavior and recorded results for the Pixel 10a and iPhone 17 Pro.

Start with Safari on the iPhone and Chrome on the Pixel in normal tabs. After the quick trial, repeat in iPhone Home Screen and Android installed mode, and in both landscape directions. Record OS/browser versions, build ID, launch mode, rotation-lock setting, and tuned detector constants. Use [the trial record](08-device-trial.md); desktop sensor emulation cannot satisfy this gate.

Proposed acceptance targets for each device/launch mode, tested in each landscape direction:

- 20 deliberate Correct gestures and 20 deliberate Pass gestures: at least 19 of each recognized correctly, zero opposite-direction outcomes, and zero duplicate outcomes.
- Two minutes of neutral holding, natural head movement, laughter, and modest repositioning: zero unintended outcomes in that session.
- Ten tilts held for at least two seconds, covering both directions: exactly one outcome per tilt, with no next prompt until neutral.
- Stable landscape throughout normal scoring tilts, without exposed portrait prompts or repeated interruption screens. Initial rotation-setting problems receive recovery guidance before Start; browser orientation locking must not be required.
- Median threshold-crossing-to-feedback latency below 250 ms and 95th percentile below 400 ms, including configured dwell. Use trace timestamps and, if necessary, an external recording with the tester's agreement; do not add camera capture to the app.
- Five minutes of use without display sleep under normal power settings where wake lock is supported; record behavior when the lock is rejected or released.
- Permission denial/no-data, Control Center/app switching, and resume follow the recovery rules. Enable buttons is offered where appropriate and is never activated automatically.
- At least two complete 60-second rounds per launch mode with plausible scoring, understandable feedback, and readable cards, including an Arabic round. If the bank is exhausted early, finish correctly and use practice or another round to complete the gesture counts.

**Exit gate:** recorded targets pass on both owner devices in tab and installed modes, and failures have been fixed and retested against the same build. These small samples validate the tested configurations only. Tune thresholds, dwell, neutral rearming, and layout from observations; the currently proposed constants are not measured results. Do not compensate for unreliable motion by silently enabling buttons.

If a target fails, keep iterating within this milestone before building the remaining product features. One working operating system is insufficient. All failures remain visible in the trial record.

## Milestone 3 — Complete the content and everyday game flow

**Deliverable:** a useful party/classroom app using the validated round and gesture path.

Add the basic category library with reviewed English and Arabic banks, 30/60/90-second duration choices, ordinary preferences, latest-result persistence, and custom-bank management. Implement pasted text/CSV/JSON and UTF-8 TXT/CSV/JSON files, explicit text delimiters including comma-delimited paste, shared preview/corrections, IndexedDB saves, and TXT export as described in [W-03–06](07-word-banks.md).

After local bank management, add [backend-free sharing](10-deck-sharing.md) through revised HU-15–18: fixed QR/link snapshots, preview, independent copies, and file fallback. The owner prioritized sharing ahead of starter categories. Complete T-19–22 for G3S; offline launch follows in milestone 4.

**Exit gate (G3 plus G3S):** a teacher or host can bring an English or Arabic list from a laptop to a phone, preview/correct it, save a named bank, play it, and export/reimport it without losing spelling or diacritics. Failed saves retain the draft; bank edits never mutate an active round. Parser/lifecycle cases T-16–17 and sharing cases T-19–22 pass. Shared snapshots remain fixed, repeat imports preserve edits, and oversized lists use file fallback. Repeat a short gesture smoke test on both phones after UI changes; no translation or separate classroom mode is introduced.

## Milestone 4 — Offline PWA and release readiness

**Deliverable:** an installable app ready for repeat party/classroom use, with explicit tested support boundaries.

Add service-worker caching, verified offline readiness, safe updates between rounds, storage migration/recovery, finalized installation help, and accessibility/visual polish. Complete the group trial and remaining acceptance scenarios below.

Expand physical coverage beyond the owner's two recent phones before advertising broad support: include the oldest iOS/browser combination intended for support, a current stable iPhone configuration, and a second Android manufacturer with a less powerful device. The Pixel counts as one Android device. If that wider coverage is unavailable, keep support claims limited to the recorded configurations and leave wider certification pending.

**Exit gate:** a confirmed cached install can cold-launch and finish a round in airplane mode with bundled/custom/received banks and required assets without an account; an app update preserves user banks and never reloads a live round. Validate both tab and installed launch. Repeat milestone 2 gesture targets for every configuration claimed as supported, and run interruption, fallback, accessibility, sharing isolation, and update/storage scenarios, including T-23. Record exact support versions and resolve launch-blocking decisions in the [decision log](06-decisions.md).

PWA delivery remains fixed. Unresolved iPhone or Android core-play failures block a public release. Native wrappers remain out of scope. Sharing remains backend-free; portable links and independent local copies work with the static Pages deployment.

## Acceptance scenarios

**T-01 — Normal round (P-01–06, G-01–06).** Start a 60-second game. Permission/practice/preparation spend no round time. First prompt and timer start together. Correct increases score by one; Pass does not. End displays accurate ordered results and replay starts cleanly.

**T-02 — Deadline race (G-03, G-05–06, A-01).** Accept an otherwise valid action just before the deadline. Reject actions at/after the deadline, duplicate action IDs, commands for old prompts, and callbacks from old rounds. Finish once. Expiry during feedback does not reveal or mark an unseen prompt unanswered.

**T-03 — Deck boundaries (P-02, G-02).** Test empty, single-prompt, malformed, and exhausted decks. No repeats or normalized duplicate content within a round. Both Correct and Pass consume a prompt. A completed final answer can finish early with `deck-exhausted`.

**T-04 — Gesture quality (M-05–08, G-04).** Replay traces for slow/fast tilts, brief spikes, tremor, threshold jitter, a long held tilt, opposite-direction overshoot, and return to neutral. Repeat left/right landscape. Assert exact event sequences, not just final score. A new answer always requires rearming.

**T-05 — Invalid stream (M-03, M-06–08).** Exercise null, NaN, missing values, legitimate zero values, delayed/out-of-order samples, sparse delivery, and gaps during dwell. Flat-at-start fails calibration. Invalid data cannot award a point. Do not mistake a browser that emits only changed readings for a failed sensor.

**T-06 — Permissions (P-04, P-09, M-01–04).** Test first allow, deny, rejected request, subsequent visit, explicit retry, unsupported interface, absent permission method with useful events, and permission granted with no useful data. No automatic prompt loop. Insecure LAN HTTP yields an actionable setup state. Use genuine taps on real phones to validate user activation.

**T-07 — Interruption timing (G-07–10, A-03).** Hide/restore during preparation, a prompt, and feedback. No hidden gestures score. Explicit pause retains remaining time; resume recalibrates before restoring the appropriate prompt. Simulate suspension without a callback and reconcile wall time; if expired, finish. Test lock/unlock, app switching, incoming interruptions, reload, and process eviction separately.

**T-08 — Rotation and display (P-05, M-09).** Test both landscape directions, portrait setup, OS rotation lock enabled/disabled, rejected orientation lock/fullscreen, browser chrome changes, cutouts, and near-flat tilts. An accepted flip cannot expose the next prompt to the guesser while the phone remains tilted. Sustained invalid posture enters recovery without repeated pause loops.

**T-09 — Optional capabilities (P-09, A-04).** Test blocked/suspended audio, muted device, missing vibration, wake-lock rejection, and wake-lock release during play. Visual feedback and scoring continue. Reacquisition has bounded behavior. No unhandled promise rejection interrupts a game.

**T-10 — Manual/accessibility (P-07, G-11).** Verify that a fresh session defaults to motion with Correct/Pass buttons hidden and manual keyboard scoring inactive. Explicitly enable the setting and complete a game without sensors on phone and desktop using buttons and keyboard, including portrait play. Motion events cannot score in manual mode. Held keys do not repeat answers. Test focus, labels, increased text size, contrast, reduced motion, and prompt confidentiality with a screen reader. Switching from interrupted motion play to manual mode preserves the current prompt and score.

**T-11 — Offline/install (P-08, A-05–06).** After confirmed caching, close and relaunch in airplane mode and complete a round with sound assets available. Test tab and installed launch separately. Incomplete cache, cache eviction, or first-ever offline use must not falsely advertise offline readiness or show a broken loading screen when a cached fallback is available.

**T-12 — Updates and storage (A-05–08).** Deploy a new shell/deck version while an older client plays; no mid-round reload or mixed deck. Apply the update between rounds. Corrupt preferences, unavailable storage, and schema changes do not prevent a game. A reload starts at Home and never resumes an unpersisted round.

**T-13 — Browser guidance (P-09, M-10).** A working Safari session receives no browser-switch warning. A missing optional orientation-lock API alone does not block a usable landscape session. Denied permissions, missing sensor data, and blocked landscape each receive relevant recovery guidance regardless of browser name. Recommending Chrome or Firefox on iPhone requires recorded evidence that the specific browser fixes that failure; changing only the browser name cannot satisfy a capability check.

**T-14 — Recovery choices and saved setting (P-09, G-11, M-11, A-02).** Exercise a missing optional lock API with working landscape (no failure), a portrait layout that becomes landscape after guidance, denied permission, absent sensor hardware/API, and a required capability lost during a round. Do not state that the OS rotation lock is on merely because the viewport is portrait. Retry clears resolved guidance and leaves manual buttons off. Dismissing or ignoring Enable buttons never enables it. One explicit activation enables manual mode, hides the prompt during the transition, preserves round state, and requires Resume before scoring. Reload restores the explicit choice if storage works; unavailable/corrupt storage falls back to motion without blocking an explicit manual selection for that session. Turning the setting off restores motion checks and hides/inactivates manual scoring. Switching modes rejects queued input from the prior mode. Returning from Control Center follows interruption rules and does not score or auto-enable buttons.

**T-15 — Arabic cards (P-10, W-01, W-07).** Play and review English and Arabic banks in both landscape directions and manual portrait mode. Check Arabic joining, vowel marks, mixed-script names, parentheses, digits, line wrapping, and longest permitted prompts in the real UI and offline. English UI remains unchanged; no translated companion card is shown. Gesture meanings stay identical. Review Arabic rendering with a fluent Arabic reader.

**T-16 — Import and preview (P-11, W-03–04).** Exercise pasted text/CSV/JSON and all three file formats, UTF-8 with/without BOM, LF/CRLF, blank entries, exact duplicates, distinct diacritics, malformed encoding, and quoted CSV fields. Lines mode preserves 'New York' as one card; All whitespace splits it visibly into two. In the text box, Commas turns `cat, dog, New York` into three cards without a file/header/column step. Test ordinary and Arabic commas, mixed comma/newline lists, surrounding spaces, repeated/leading/trailing delimiters, empty-entry counts, duplicates, and diacritics. Lines preserves literal commas; Commas does not treat quotes as escapes. A card containing a comma can instead be imported via Lines, quoted CSV, or JSON. Test repeated spaces, tabs, and Arabic lists without dropping diacritics/joining characters. Selecting a CSV column/header preserves the intended card text; CSV quoting is unaffected by text delimiter settings. JSON arrays and title/words objects yield the intended prompts; unsupported shapes, non-string entries, and syntax errors are identified without coercion or parser fallback. Multiline CSV cells/JSON strings are normalized visibly. Changing parsing options regenerates from the original input and confirms before discarding preview edits. Invalid/oversized entries are identified, never silently truncated. Render HTML-like input as literal text. Cancel saves nothing; Save creates only the reviewed bank. Test one-card and maximum-size banks.

**T-17 — Custom-bank lifecycle (W-05–06).** Save, rename, edit, export/reimport, explicitly replace, and delete a custom bank. A running round retains its original snapshot. Test failed/quota-exceeded saves, app update/migration, offline reload, and separate browser storage. Failed saving keeps the draft/export available. Text export round-trips Arabic spelling and diacritics; app cache updates leave saved user banks intact.

**T-18 — Classroom trial (P-12, W-08).** A teacher imports a target-language list and runs a round with learners using existing timer/control settings. Results show prompts for debrief, without translation, student identities, or proficiency claims. A short bank ending before the timer is understandable. Record reading and setup difficulties before changing the shared game flow.

**T-19 — Account-free sharing (P-13, S-01, S-06).** Create/import/play/share without sign-in or a service. Review a saved snapshot before generating its link. Cancel preserves local data. Check missing compression support and malformed links; provide file fallback.

**T-20 — Portable content contracts (S-02, S-04, A-09).** Round-trip exact English/Arabic text through gzip/base64url. Reject unknown versions/fields, invalid UTF-8, duplicate/non-string/overlong cards, oversized links, and decompression bombs. Shared payloads exclude source files, local IDs, results, preferences, and diagnostics. Validate the Pages repository path. Verify actual QR decoding and the density fallback.

**T-21 — Receiving and device transfer (S-02–03).** Open QR/link targets or paste links in fresh Android/iOS tab/installed sessions. Preview cards, save with fresh IDs, and play. Repeated opening offers the edited local copy or another fresh copy. Failed saves keep preview/export. Incoming links wait for rounds and drafts. Clipboard/share-sheet cancellation keeps manual copy and export usable.

**T-22 — Snapshots and fallbacks (S-04–05, A-09).** Local edits/deletion leave existing shared content unchanged. Identical content is recognized via fingerprint, without proving authorship. All words remain available through TXT when QR/link limits are exceeded. Explain that links can be forwarded and cannot be revoked. Check native QR scanning/downloads and file import on both phones.

**T-23 — Offline play and upgrades (S-06, A-06–09).** Once app caching is implemented and verified, cold-launch/play received decks offline. Upgrades preserve banks and optional fingerprint provenance. Decode links locally after the app loads; no lookup service is required. Before caching exists, do not promise offline launch.

## Test layers and evidence

- Unit tests: pure engine invariants, deadline races, deck validation, and gesture trace replay. Use synthetic traces plus consented development recordings; preserve timestamps and expected events.
- Browser tests: manual user flow, rendering, denied/missing capability adapters, offline behavior, storage, and update transitions. Browser sensor emulation verifies wiring, not physical accuracy or iOS permissions.
- Sharing tests: schema and byte limits, actual QR decoding, fresh recipient contexts, snapshot independence, storage failures, and deferred incoming links. Physical camera/native-sheet behavior still requires device evidence.
- Physical tests: actual permission prompts, sign/mapping, comfort, accidental triggers, both landscape orientations, sleep/audio, and installed launch differences.
- Small group trial: observe whether new players can begin and finish without coaching beyond the app's instructions. Record confusion and accidental passes; adjust tutorials and thresholds as needed.

Hand off milestone 1 for owner testing when its build checks pass. Expand product features after the milestone 2 physical gates pass. Publish support claims only for recorded, tested configurations. Keep failed results and unresolved limitations visible alongside passing results.
