# Product scope and experience

Status: product scope includes the playable MVP and backend-free deck sharing. The September 29 decision supersedes the earlier creator-account proposal. Related: [gameplay](02-gameplay.md), [decisions](06-decisions.md), [sharing](10-deck-sharing.md).

## Purpose

Make it easy for a party group or language class to start a short guessing game from a shared link. The guesser should be able to play a complete round without looking at or touching the screen after placing the phone at their forehead.

The game takes inspiration from the forehead-guessing format. Public branding, interface artwork, sounds, and prompt collections will be original. The repository name is a working name.

## Scope

**P-01 — Local guest play.** A group plays on one phone without login, a room code, or a server connection during a round. People take turns by physically passing the phone.

**P-02 — Deck selection.** Choose a bundled or custom word bank and see its description and prompt count. Starter categories are Famous People, Animals, Everyday Objects, and Actions, with independently curated English and Arabic banks. Proposed content target: at least 50 reviewed prompts per starter bank. Custom banks may be shorter. Each prompt fits on the smallest supported landscape display. See the [word-bank spec](07-word-banks.md).

**P-03 — Round setup.** Choose 30, 60, or 90 seconds, with 60 seconds selected initially. Explain tilt down = Correct and tilt up = Pass using text and a simple demonstration. Motion is the default control mode. Offer sound controls and a settings switch labeled Use buttons instead of motion, off initially.

**P-04 — Motion setup.** Explain why movement access is needed, request permission from an explicit tap when required, and confirm usable sensor readings. The first motion session includes practice for Correct, return to neutral, Pass, and return to neutral. Recalibrate neutral posture before every round.

**P-05 — Hands-free round.** Show one large prompt, time remaining, and a small score. Give distinct visual and sound feedback for Correct, Pass, and round end. Do not speak the prompt aloud automatically.

**P-06 — Results.** Show the total correct, total passed, unanswered prompt if applicable, and the ordered prompt history. Distinguish a completed round from an interrupted/abandoned round. Provide Play again and Change deck actions.

**P-07 — Manual access.** Correct/Pass buttons are off and hidden by default. Users can enable Use buttons instead of motion in settings at any time before a round, even when sensors work. A recovery screen may offer Enable buttons; activating it changes the same setting, with no second confirmation. Remember the explicit choice locally until the user turns it off. Never enable buttons merely because a capability check fails or a timeout expires. Manual mode replaces motion scoring, and a clue-giver operates the buttons while the guesser looks away or holds the phone outward. Explain that another person must operate the controls. Support portrait or landscape in manual mode, with no motion permission or calibration requirement, plus keyboard controls for desktop use and testing.

**P-08 — PWA and offline play.** PWA delivery is a confirmed requirement. The app works from a browser link without installation. Offer optional home-screen installation instructions outside the round. Motion-controlled forehead gameplay requires a usable landscape presentation, including during scoring tilts; successful browser orientation locking is not required. Once the current shell and bundled content are fully cached, the user can launch, play, and view results offline. Show offline readiness only after caching succeeds.

**P-09 — Resilience.** Permission denial, unavailable sensors, unavailable audio, storage failure, or a rejected wake lock must result in an understandable state with a usable next action. A missing optional capability must not strand setup. Check browser capabilities and actual sensor/layout behavior, then show relevant recovery guidance. For a screen that remains in portrait, suggest holding the phone sideways and, if it still will not rotate, turning off Portrait Orientation Lock. Offer Enable buttons as the final fallback; immediately offer it when motion is definitely unavailable or denied, without forcing irrelevant rotation steps. Working sessions receive no warning.

**P-10 — English and Arabic cards.** Show one target-language prompt per card. Render Arabic text right to left while keeping the existing interface; no translations or bilingual UI are required. English and Arabic text must also display correctly in import previews, editable fields, and results.

**P-11 — Custom word banks.** Users can paste or import their own lists, including comma-delimited words/phrases pasted into a text box, preview/correct the cards, save a named bank, and play it offline once the app assets are cached. Offer an explicit Commas option so `cat, dog, New York` becomes three cards while preserving spaces within each phrase. Provide basic bank management and text-file export. Parsing formats and storage requirements are specified in [W-03–06](07-word-banks.md).

**P-12 — Party and classroom use.** Reuse the same game for both audiences. A teacher's target-language list is the lesson content; the existing timer, manual-controls option, and prompt history support classroom play. Do not add student accounts or assess proficiency from game scores.

**P-13 — Share independent decks.** A saved deck can generate a portable link and QR containing its fixed content. No accounts or backend are required. Recipients preview and save a fresh local copy; repeat imports never overwrite edits. Offer link/file fallback for large decks. Links cannot be revoked or updated remotely. See the [sharing spec](10-deck-sharing.md).

## Screen flow

1. **Home / decks:** starter banks, My decks, Create deck, Open deck link, Help, and settings. Share deck on a saved custom bank opens snapshot review and QR/link generation. Received links show a preview before Save. Incoming links wait for active rounds and open editors.
2. **Setup:** deck summary, duration, movement explanation, sound test, and the manual-controls setting (off by default, or restored from an explicit saved choice).
3. **Enable movement / practice:** capability checks, permission button where needed, demonstration, and actual flip feedback. If checks fail, show relevant recovery guidance and offer Enable buttons. Skip this step when the user has explicitly selected manual controls. No scored prompts appear here.
4. **Ready:** “Hold sideways at your forehead, screen facing your friends.” The player taps Start; the preparation countdown gives time to position the phone.
5. **Preparing:** 3–2–1, stable posture check, then a start cue and first prompt. If posture is not ready, show a positioning hint without spending round time.
6. **Playing:** prompt dominates the screen. Correct/Pass buttons appear only in manual mode. A brief Correct/Pass overlay replaces the prompt after an accepted action; motion mode also waits for return to neutral before revealing the next prompt.
7. **Interrupted:** hide the prompt and explain the interruption. Allow resume with a short preparation countdown, manual mode where applicable, or end round.
8. **Results:** score and history, then pass the phone or start again.

## Usability and accessibility

- Aim for prompts readable by clue-givers roughly 1–2 meters away; validate with physical devices and real groups.
- Use labeled feedback and icons as well as color. Maintain at least 4.5:1 contrast for ordinary text and 3:1 for large text.
- Use touch targets at least 44 CSS pixels, safe-area padding, and readable content at increased text size. Setup and results support portrait as well as landscape. Landscape deck selection/setup should fit the viewport with primary actions visible; use contained scroll areas for long content and dialogs for settings/help rather than a long page.
- Respect reduced-motion preferences; avoid flashing feedback and unnecessary motion effects.
- Support screen-reader navigation for setup and results. Do not automatically announce a secret prompt in forehead mode; manual mode can provide an explicit prompt-reading option.
- Sound cues are helpful for the guesser but cannot be guaranteed audible. Provide a sound test; the game remains usable with clue-givers announcing visual feedback.
- Teach a controlled tilt while holding the phone securely; a full turnover or vigorous shake should not be necessary.

## Deferred scope

Online multiplayer, recipient/player accounts, public profiles, leaderboards, paid decks, advertisements, camera recording, voice recognition, public deck discovery, shared editing, and automatic library synchronization remain deferred. Custom-bank import/editing and backend-free QR/link sharing are implemented. Creator accounts, hosted short codes, revocation, and remote publication management are deferred. Automatic translation, bilingual cards, and a translated interface are not required. Native packaging and app-store distribution remain outside the PWA delivery model.
