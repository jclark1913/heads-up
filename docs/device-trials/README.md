# Device evidence

Status: **Owner reports largely successful trials** (September 25, 2026). Exact build/configuration results and remaining issues are not yet recorded; the individual combinations below remain unverified. The [quick checklist](../../specs/08-device-trial.md) is the starting point; the [milestone 2 targets](../../specs/05-validation-and-delivery.md#milestone-2--validate-and-tune-gestures-on-both-phones) define acceptance.

## Owner layout feedback

The owner reports phone tests worked well and identifies deck selection/setup in landscape as the remaining layout concern: they felt like scrolling a webpage. A viewport-sized deck picker/setup and help/settings dialogs now address that feedback. Automated layout checks pass; physical review of the revised layout is pending. Exact device/build/mode measurements remain unrecorded, so this does not change the measured G2 status below.

## Required launch combinations

- [ ] Pixel 10a / Chrome tab — Outcome unrecorded; left/right landscape evidence pending.
- [ ] Pixel 10a / installed app — Outcome unrecorded; left/right landscape evidence pending.
- [ ] iPhone 17 Pro / Safari tab — Outcome unrecorded; left/right landscape evidence pending.
- [ ] iPhone 17 Pro / Home Screen — Outcome unrecorded; left/right landscape evidence pending.

Check a combination only when its full measured targets pass in both directions. A quick trial, partial sample, or successful manual game leaves it unchecked. Record exact OS/browser versions in reports; model names alone do not define support.

**G2 outcome:** Pending. Feature implementation HU-03 onward is waiting for this gate. See the [remaining build plan](../../specs/09-remaining-build-plan.md).

**Candidate build / URL:** Not yet recorded.

**Evidence:** owner feedback in this planning conversation: tests were largely successful. Detailed reports/review date are pending. Add report links and residual issues here; do not infer per-configuration passing outcomes.

## Record a trial

1. Copy [TEMPLATE.md](TEMPLATE.md) to `YYYY-MM-DD-device-mode-build-label.md` in this directory. Use a filename-safe build label and retain the exact in-app identifier inside the record. Use one record per device/launch mode and test run.
2. Start with quick feedback if that is all the time available. Mark unperformed checks Not tested. For G2, complete measured sections separately for each landscape direction; duplicate the orientation section in the template.
3. Record both intended gestures and observed results. The detector log alone cannot establish misses or wrong-direction accuracy.
4. Link diagnostic reports only when deliberately supplied for this investigation. Keep raw reports local by default and review them before committing; the app does not upload them automatically.
5. Retain failures. Add a new record for each retest and link both directions between the original and follow-up. After a fix, validate all required configurations against the same final candidate build.
6. When every target has evidence, update the four checkboxes and G2 outcome above with candidate build, report links, and review date. A blocked, failed, or missing result cannot be relabeled Pass.

Later milestone smoke checks, offline trials, and release certification can use the same records with their purpose labeled. A short smoke check does not replace full release certification.
