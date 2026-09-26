# Device trial record

Status: Not run. Replace this with observed results only; no field below is evidence until tested.

## Identity

- Purpose: Quick feedback / G2 measured acceptance / Regression smoke / Offline-update trial / Release certification
- Test date and tester:
- Exact in-app build identifier:
- HTTPS URL and deployment source:
- Device model:
- OS version:
- Browser/version (record available iOS/Safari information):
- Launch mode: Tab / Home Screen or installed
- Rotation lock: On / Off / Unknown
- Control mode and bank(s):
- Detector tuning constants (or diagnostic report reference):
- Previous failure/retest record, if applicable:

## Quick observations

- Permission request/readiness and setup:
- Correct/Pass mapping, comfort, misses, duplicates:
- Landscape stability and whether tilted prompts stayed hidden:
- Completed round, timer/results, sound, Arabic readability:
- App switching/interruption/resume:
- Denial/no-data recovery and explicit manual fallback:
- Reproduction steps for each failure:
- Diagnostic filename/reference (optional):
- Overall: Not run / Partially tested / Pass / Fail

Quick feedback does not establish G2 acceptance. Leave the following checks Not tested until the measured trials are performed.

## Measured orientation record — duplicate for the other direction

Physical direction: phone's top edge toward Left / Right. Describe this physically rather than relying only on a browser angle label.

- **Correct gestures:** intended attempts / correctly recognized / missed / wrong-direction / duplicate outcomes. Target: at least 19 of 20 correct, zero wrong-direction and zero duplicates. Result: Not tested.
- **Pass gestures:** intended attempts / correctly recognized / missed / wrong-direction / duplicate outcomes. Target: at least 19 of 20 correct, zero wrong-direction and zero duplicates. Result: Not tested.
- **Neutral/natural movement:** duration and unintended outcomes. Target: two minutes, zero unintended outcomes. Result: Not tested.
- **Held tilts:** attempts by direction, hold durations, outcomes per tilt, and next-prompt visibility. Target: ten tilts total covering both directions, at least two seconds each, exactly one outcome per tilt, next prompt withheld until neutral. Result: Not tested.
- **Landscape/privacy:** portrait exposure, unintended rotation, repeated interruption, or posture/rotation guidance needed. Target: stable landscape during normal scoring, no exposed prompt while tilted. Result: Not tested.
- **Feedback latency:** sample count, timing method/reference, threshold-crossing and feedback timestamps, median and p95 in milliseconds. Target: median below 250 ms, p95 below 400 ms including dwell. Result: Not tested. If traces cannot establish the measurement, retain Not tested and describe missing instrumentation.
- **Display awake:** duration, power settings, wake-lock support/status, rejected/released lock behavior. Target: five minutes without sleep where supported; record unsupported behavior explicitly. Result: Not tested.
- **Permission/lifecycle recovery:** allow, deny/no-data, app switching/Control Center, resume and recalibration; no hidden scoring or automatic manual switch. Result: Not tested.
- **Full rounds:** bank/language, selected duration, finish reason, scoring/feedback/readability observations, and outcome. At least two complete 60-second rounds per launch mode, including Arabic, across the orientation records. If a bank exhausts early, record it and finish remaining gesture samples in practice or another round. Result: Not tested.
- **Orientation outcome:** Not run / Partially tested / Pass / Fail. List outstanding targets:

## Gate review

- Both landscape records complete:
- Every applicable milestone 2 target met, with evidence:
- Outstanding failures or untested checks:
- Candidate build matches the other required device/launch reports:
- Fix task/report references and retest record links:
- Reviewer/date and conclusion: Pending / Retest required / Pass for this configuration

G2 requires all four device/launch combinations on the candidate build. This record alone cannot approve the complete gate or wider device support.
