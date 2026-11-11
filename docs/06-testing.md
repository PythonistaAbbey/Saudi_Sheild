# 06 · Testing and validation (Milestone 5)

> Results below are from the run on 11 November 2026 against commit `4d8c32f` and later. Re-run with the commands in each section.

## Summary

| Suite | What it covers | Result |
|---|---|---|
| Core unit tests (`packages/core`, Vitest) | Signatures, key validity and revocation, tamper detection, replay, safety boundaries, content checker, role permissions, two-person rule, retraction, expiry, audit chain, AI-assist guardrails, templates, geography, signed feed, data-saver feed, scenarios, family privacy | **31 / 31 pass** |
| API end-to-end tests (`apps/api`, Vitest + Supertest) | Authentication, role guards on every step, access-denied auditing, ingest → publish → clear, signed feed verification, quarantine of tampered and non-exercise messages, malformed input, simulator autopilot cannot bypass checks, lite feed | **15 / 15 pass** |
| UI journey (`scripts/demo-journey.cjs`, Playwright) | The full civilian journey across dashboard and app, in 17 asserted steps (below) | **17 / 17 pass** |
| Accessibility scan (`scripts/a11y-check.cjs`, axe-core, WCAG 2.2 A/AA rules) | 10 dashboard pages and 14 app screens in Arabic and English | **0 serious or critical violations** across 24 screens ([report](testing/a11y-report.json)) |
| Type checks | All four packages with `tsc --noEmit` | Clean |

## 1. Full user journey

`node scripts/demo-journey.cjs` drives a real browser through:

1. App onboarding: prototype disclosure, language choice, on-device location, "official alerts come first".
2. Operator signs in to the dashboard.
3. Fictional issuer sends a signed Yellow alert; signature verified.
4. Operator prepares it; AI drafts appear labelled; the operator **cannot** approve.
5. A different approver approves (two-person rule).
6. Duty publisher publishes after a confirmation dialog and PIN.
7. The app fetches the signed feed, verifies it with its **pinned** key and opens the alert.
8. The issuer escalates to Red; autopilot runs prepare → approve → publish with three distinct fictional staff.
9. The app shows Red with numbered steps, Arabic and plain-language versions.
10. The issuer declares White; the app shows "all clear" and the verified history.
11. Tampered and unknown-key messages are quarantined.
12. The content checker blocks speculative wording ("debris may fall…"); Approve is disabled.
13. Areas, delivery, roles, audit (as auditor), health and simulator pages render.
14. Guidance, family check-in, contacts and accessibility settings work.
15. Offline: the app shows the last verified state with its time and points to official channels.
16. Data saver: the compact feed renders identical wording on the device.
17. A **forged** feed item injected into the network response is rejected and never displayed.

Screenshots from this run are in [`docs/screenshots`](screenshots).

## 2. Notification reliability

| Check | How | Result |
|---|---|---|
| Missed push recovered | App polls the signed feed every 10 s and on launch; SSE "changed" nudges trigger an immediate fetch | Journey steps 7, 8 and 10 rely on it |
| Spoofed push or server cannot show a fake alert | Push and SSE carry no content; the app verifies every item with a pinned Ed25519 key | Journey step 17; core test "signs the public feed" |
| Stale data is never presented as current | Offline mode labels the time of the last verified update and tells people to follow official channels | Journey step 15 |
| Low bandwidth | Lite feed for 6 alerts: **3.2 KB** vs 12.4 KB full (**1.2 KB vs 3.5 KB gzipped**); text rendered locally from identical templates | Core and API tests; journey step 16 |
| Cell broadcast stays primary | The app says so in onboarding, on every alert and in the footer of Home | Visual check in screenshots |

## 3. Role permissions

Every workflow endpoint is tested with the wrong role and the right role (API tests "blocks every role except the right one at each step"). Denied attempts are written to the audit log. Publication needs three different people; the two-person rule is enforced in the workflow (and in the target database schema as a `CHECK` constraint).

## 4. Privacy controls

* The server never receives the user's location: zone matching happens on the device (`areasContaining`). There is no location field in any API request.
* Family check-ins share only status and time; pausing deletes the last check-in; check-ins expire after 72 hours; leaving removes the member (core test "family check-ins").
* No accounts, analytics or advertising identifiers in the app.

## 5. Safe failure behaviour

| Failure | Expected | Verified by |
|---|---|---|
| Bad signature, unknown, revoked or expired key, issuer mismatch, clock skew | Quarantined, never publishable | Core "signature verification"; API "safe failure" |
| CAP status other than `Exercise` | Refused | Core and API |
| Payload with tracking or targeting fields | Quarantined and the fields are discarded | Core "quarantines payloads carrying tracking or targeting fields" |
| Malformed JSON | Quarantined, no crash | API "handles malformed input" |
| Replay of an identifier | Quarantined | Core "rejects replays" |
| Conflicting or speculative wording | Approval and publication blocked | Core and journey step 12 |
| Audit log edited or truncated | Chain verification fails at the first broken entry | Core "audit chain" |

## 6. Known limitations

* Demo authentication (pick a user) stands in for SSO and MFA.
* In-memory storage; the PostGIS schema in `db/schema.sql` is a reference and is not exercised by tests.
* Delivery statistics are simulated.
* Native iOS and Android builds were not produced in this environment; the app was tested through its web build (same React Native code via `react-native-web`). Read-aloud and haptics need a device test.
* The app's web bundle includes the full icon set (about 2.5 MB uncompressed); production builds should import icons individually.
* Load and soak testing has not been done.

## How to re-run

```bash
pnpm install
pnpm --filter @saudi-shield/core build && pnpm --filter @saudi-shield/core test
pnpm --filter @saudi-shield/api test
# UI journey and accessibility (needs the three servers, see README)
node scripts/demo-journey.cjs
node scripts/a11y-check.cjs
```
