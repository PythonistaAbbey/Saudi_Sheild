# 05 · Safety boundaries

These boundaries are part of the product, not a disclaimer. They are enforced in code where possible and checked in tests.

## 1. Out of scope, permanently

Saudi Shield does **not** and will not include:

* missile, rocket or drone tracking of any kind;
* flight-path or trajectory reconstruction;
* launch-site detection;
* impact or debris-fall prediction;
* target identification or damage assessment;
* interception, air-defence or any other military capability;
* public reports of sightings, impacts or interceptions (these are defence functions handled by official channels).

The data model has **no fields** for sensor tracks, coordinates of threats, velocities, headings or impact points. A warning area is a civil-protection polygon supplied by the authority, not a computed footprint.

## 2. Alerting boundaries

| Boundary | Enforcement |
|---|---|
| Saudi Shield cannot originate a warning | Publication requires an inbound message signed by a registered issuer (`workflow.ts`, `crypto.ts`) |
| Human approval for every public message | Two-person rule in the workflow state machine; tested |
| AI cannot declare emergencies, change levels or areas, or issue evacuation orders | The assist interface is read-only on structured fields; output is labelled `aiDraft` and is never published without approval; tested |
| No uncertain estimates presented as instructions | Templates only render authority-supplied instruction codes; the checker blocks speculative wording ("may hit", "expected impact", probabilities) |
| Prototype data is always fictional | Every prototype message has CAP status `Exercise`; core refuses `Actual` unless built in an approved deployment mode, which this repository does not enable; tested |
| No impersonation of official services | Independent name and identity in the prototype, permanent prototype label, no government logos, "not an official service" on every screen |

## 3. Demonstration rules

1. All scenarios are **synthetic**. Exercise zones are coarse fictional shapes, not real incidents.
2. Every alert in a demo shows `EXERCISE · FICTIONAL`.
3. Demo keys are labelled `DEMO-ISSUER` and are published in this repository, so they are worthless for real signing.
4. The prototype must not be deployed to public app stores or public URLs under a name that could be mistaken for an official service.

## 4. Privacy boundaries

* No account is needed to receive alerts.
* Location is chosen from a list or computed on the device; the server never receives it.
* Family check-ins are opt-in, reveal only "safe", "needs help" or "no update" and a time, and can be paused or deleted at any time.
* No analytics SDKs, no advertising identifiers.
