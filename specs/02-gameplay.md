# Gameplay and round rules

Status: proposed behavioral contract. Related: [motion](03-motion-and-platforms.md), [acceptance tests](05-validation-and-delivery.md).

## Round lifecycle

**G-01 — Preparation.** Resolve deck loading and control readiness before allowing Start. Start begins a three-second preparation period with no prompt displayed and no scoring. Capture a stable neutral pose during this period. If it ends without a valid pose, remain in preparation with a positioning hint. Start the timed round only when the pose is valid; then show the first prompt and emit the start cue. Manual mode requires no pose, sensor permission, or landscape check. Restore an explicitly saved manual preference; otherwise start in motion mode with scoring buttons hidden.

**G-02 — Prompt order.** Snapshot and shuffle the chosen bundled or custom deck once for each round. Bank edits, replacements, or deletion after Start do not change that round's prompt text or results. Each prompt appears at most once in that round, including passed prompts. If all prompts are answered before the deadline, finish with reason `deck-exhausted`. Reject an empty deck before Start. A new round uses a new shuffle.

**G-03 — Answers.** An accepted Correct action records one point; Pass records zero. Both close the current prompt exactly once. Scoring uses action IDs and the expected prompt ID to reject duplicate/stale commands. Manual and motion inputs feed the same scoring rules.

**G-04 — Feedback and return.** After an answer, replace the prompt with labeled feedback for at least 300 ms unless the round finishes first; finishing takes precedence. In motion mode, also wait until the device returns to the calibrated neutral band and is stable before revealing the next prompt. The timer continues during feedback and while returning to neutral. Movement during either period must not score another answer. Manual mode advances after the feedback interval and requires a new discrete click/key press.

**G-05 — Deadline.** A round starts its selected 30/60/90-second clock when the first prompt is shown (60 seconds by default). Derive remaining time from a deadline, not from counting timer callbacks. At each action, check the deadline before accepting the action. A command processed at or after expiry is rejected and the round ends; queued sensor events cannot extend the round. Render the initial duration immediately, use a ceiling for displayed seconds, and clamp at zero.

**G-06 — Finish.** Finish exactly once, stop input, clear pending gesture/feedback work, and play the end cue. A visible but unscored prompt becomes `unanswered`; it counts as neither Correct nor Pass. If expiry occurs during feedback, there is no unanswered prompt unless a new one was actually displayed. Never reveal another prompt after expiry.

## State transitions

The round engine has `idle`, `preparing`, `playing`, `feedback`, `interrupted`, and `finished` states. Permission and practice are setup concerns outside the timed round.

- `idle → preparing`: Start accepted with a valid deck and selected control mode.
- `preparing → playing`: preparation time elapsed and required posture checks passed.
- `playing → feedback`: exactly one valid answer accepted before expiry.
- `feedback → playing`: feedback minimum elapsed, next prompt exists, time remains, and motion mode has rearmed.
- `playing / feedback → finished`: deadline reached, all prompts resolved, or user ends the round.
- `preparing / playing / feedback → interrupted`: page hidden, sustained invalid posture, or a detected unusable sensor stream.
- `interrupted → preparing`: explicit Resume; return through preparation and calibration.
- `interrupted → finished`: End round; recorded answers remain available.
- `finished → idle`: Play again or Change deck resets ephemeral state.

Guard all transitions against repeated browser callbacks. The finished state cannot accept an answer or be resumed.

## Interruptions

**G-07 — Hidden page.** When the app detects that it is hidden or leaving the page, hide the prompt, pause the round with remaining time captured at that moment, and disarm the detector. Resume requires a tap and another three-second preparation period. Do not award gestures while switching apps or lifting the phone away.

If interruption occurred during feedback, the accepted answer stays accepted; resume with the next unused prompt after preparation and any required calibration. If interrupted with a current unanswered prompt, resume that same prompt. If preparation was interrupted before the round started, restart preparation with the full duration.

**G-08 — Unexpected suspension.** A process can be suspended before an interruption callback runs. Maintain a wall-clock deadline alongside the active monotonic timer. If the app resumes without a saved pause transition, count the elapsed wall time conservatively; finish if expired, otherwise enter `interrupted` with the reconciled time. Do not silently grant extra time after an execution gap. A material clock discrepancy enters interruption rather than increasing remaining time.

**G-09 — Sensor/posture recovery.** In motion mode, loss of usable motion data or sustained portrait posture pauses play and hides the prompt. Offer the relevant permission or rotation guidance and Retry, plus Enable buttons as an explicit fallback. Do not reveal scoring buttons or change modes automatically. Manual mode is not interrupted for unavailable sensors or portrait posture. Brief orientation/viewport changes during a valid tilt must not cause a pause. Physical testing of the playable gesture MVP must determine reliable detection rules for these cases. If a stream cannot distinguish a stationary device from a stall, do not treat silence alone as conclusive sensor failure.

**G-10 — Reload and exit.** A full reload or process eviction does not resume a live round in the MVP. Restore preferences and the most recent saved result if available, and return to Home. An explicit End round preserves answered prompts as an incomplete result; it does not count the current prompt as a pass. Provide an exit confirmation during a round.

**G-11 — Changing controls.** Change control mode only in setup or while interrupted. Opening control settings during a round first enters interruption and hides the prompt. Enable buttons selects manual mode, stops sensor input, clears pending gesture candidates, and preserves accepted answers and remaining time. Resume uses the existing preparation countdown and interrupted-prompt rules. Returning to motion hides scoring buttons and requires permission/readiness checks and calibration again. Buttons and keyboard scoring are inactive in motion mode; motion scoring is inactive in manual mode. Browser recovery alone never changes the saved preference.

## Invariants

- At most one current prompt and one answer per prompt.
- Score equals the number of `correct` outcomes.
- Correct + passed + unanswered equals the number of displayed prompts at finish.
- Neither permission dialogs nor calibration spend round time.
- Once playing starts, feedback and return-to-neutral spend round time; explicit interruption does not.
- No answers are accepted outside `playing`, after the deadline, or for a different prompt/round ID.
- Settings affecting duration, deck, or gesture mapping cannot change during an active round.
