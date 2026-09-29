# First device trial

Status: the owner reports device tests were largely successful. This checklist remains the record format; exact builds, configurations, measured results, and remaining issues have not yet been supplied. Do not infer that unrecorded combinations passed.

Save observations and retests in the [device evidence folder](../docs/device-trials/README.md). It includes a measured-trial template and the four device/launch combinations needed to close the gate for [remaining feature work](09-remaining-build-plan.md).

Use this with the playable build from [milestone 1](05-validation-and-delivery.md). Start or reopen the temporary HTTPS link using [the testing instructions](../docs/TESTING.md). First answer whether the game feels usable on the owner's two phones. The larger counts and measured targets for completing milestone 2 are specified in the build plan.

## Test devices

- Pixel 10a — Chrome; Android and Chrome versions to be recorded.
- iPhone 17 Pro — Safari; iOS version to be recorded.

Begin in a normal browser tab at the supplied HTTPS URL. Use the same build on both phones. Record the build ID shown by the app (inside Help on compact landscape screens); a result from an older build does not validate a newer one.

## Quick first pass on each phone

1. Open the link, select the English test bank, and enable movement with a tap. Record whether a permission dialog appeared and whether usable readings arrived.
2. Hold the phone sideways, screen outward at the forehead. If it will not rotate, use the app's guidance and check the phone's rotation-lock setting. Do not assume the app can read that setting.
3. In practice, try five deliberate down/Correct tilts and five up/Pass tilts, returning to neutral after each. Repeat with the opposite end of the phone pointing left. Have a clue-giver note missed, wrong-direction, or duplicate outcomes.
4. Hold one scoring tilt for two seconds. It should produce one outcome and keep the next card hidden until the phone returns to neutral. Move naturally while upright and check for accidental answers.
5. Play a 60-second round with another person. Check that feedback is understandable, each accepted answer advances once, the timer ends the round, and results match the observed answers.
6. Play an Arabic round. Check joined letters, vowel marks where present, text direction, and phrase readability with someone able to read the supplied prompts.
7. Switch apps or open Control Center during a round, then return. Expect an interrupted state and explicit Resume with preparation; the movement involved must not score a card.
8. Start from a fresh browser permission state where practical, deny movement access, and check the recovery flow. Buttons appear only after selecting Enable buttons. If denial cannot be reproduced, mark it Not tested rather than assuming it passes. Turn manual mode off before further gesture tests.
9. Install/add the app to the Home Screen using the supplied instructions and repeat the practice and a full round online. Record installed launch separately; verify the same build ID.

Report the quick trial even if something fails. It is useful feedback for tuning, not a requirement to complete the full milestone 2 sample before returning observations.

## What to send back

Use this record once per device and launch mode. Include the local diagnostics report when available; a short description is enough to report an initial failure. Copying or exporting a report is explicit and does not upload it.

- Build ID and test date:
- Device model:
- OS version:
- Browser and version (for iPhone, record iOS/Safari version information available):
- Launch mode: browser tab / Home Screen or installed app:
- Rotation lock: on / off / unknown:
- Landscape direction: phone's top edge toward left / right:
- Bank and control mode:
- Permission result and sensor readiness:
- Intended Correct attempts / recognized Correct / missed / wrong-direction:
- Intended Pass attempts / recognized Pass / missed / wrong-direction:
- Duplicate outcomes and unintended outcomes while holding normally:
- Held-tilt behavior and when the next card appeared:
- Unexpected rotation, exposed prompts, or repeated interruptions:
- Timer/results, cues, Arabic rendering, interruption/resume, and manual fallback:
- Comfort: too much movement / too sensitive / comfortable:
- Steps to reproduce any failure:
- Local diagnostic report filename, if attached:
- Overall: Not run / Pass / Fail / Partially tested:

Do not infer missed or wrong-direction counts solely from the detector's own event log; the observer records intended gestures and compares them with what the game did. Record each landscape direction separately for the milestone 2 counts.

## Acceptance follow-up

After the quick trial identifies issues, repeat the milestone 2 measured tests on the revised build. Include threshold-crossing feedback timings from diagnostics, the two-minute neutral session, ten held tilts, five-minute display-awake observation, and full rounds. Keep failed records with their build IDs and append retest results; never overwrite a failure as if it had originally passed.
