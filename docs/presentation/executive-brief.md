# Saudi Shield · Executive brief

> Independent prototype. Fictional exercise data only. Not affiliated with or endorsed by any government entity. "Saudi Shield" is a working title.

**Deck:** 14-slide executive briefing (Slides artifact, shared on request). Slide sources are in [`slides-source/`](slides-source/), with speaker notes in each `<aside>`.

## The proposal
A civilian companion channel that could sit beside the National Early Warning Platform, never in place of it. Cell broadcast and sirens stay authoritative. Saudi Shield republishes alerts signed by an authorised issuer, after human review, and adds what a short broadcast cannot: a verified history, a clear all-clear, more languages, accessibility, offline guidance and voluntary family check-ins.

## What it will never do
Originate or escalate a warning; replace cell broadcast or sirens; track, predict or locate any threat; let AI issue instructions or evacuation orders; look like an official government service.

## What the prototype demonstrates
- **Signed chain:** issuer signature → verification and quarantine → operator → a different approver → a different publisher → app verifies again with a pinned key.
- **AI assists, people decide:** drafts are labelled; content checks (speculative wording, conflicting instructions, number mismatches, too many steps) block approval; public text is rendered only from approved templates.
- **Civilian app:** Arabic and English with RTL, read-aloud, large text, high contrast, 1.2 KB lite feed, offline guidance, exercise ribbon on every screen.
- **Dashboard:** inbound queue, alert workspace, zones map, delivery (simulated), health, tamper-evident audit log, six roles.

## Evidence
31 core tests · 15 API tests · 17-step browser journey · 0 serious accessibility issues across 24 screens · see [`../06-testing.md`](../06-testing.md).

## Limits
Not connected to any official feed; demo authentication and in-memory storage; simulated delivery; no native builds or load tests; translations unreviewed.

## Stages and indicative costs (planning assumptions, not a quotation)
| Stage | Duration | SAR |
|---|---|---|
| Discovery with the authority | 8–12 weeks | 0.6–0.9M |
| Pilot integration | 4–6 months | 3–4.5M |
| Limited pilot (one region, drills only) | 3–6 months | 2–3M |
| Annual run | ongoing | 4–7M / year |

Assumes a blended rate of about SAR 45–60k per person-month and accredited in-Kingdom hosting. Excludes changes to the national platform and cell broadcast costs.

## Approvals required
MOI and Civil Defense mandate; authorised CAP-style feed and keys; PDPL compliance (SDAIA) with an impact assessment; NCA ECC and CCC controls with accredited hosting; CST alignment and clear app store listings; naming and identity agreed with the authority and DGA; certified translations.

## Proposed next steps
1. A half-day discovery workshop with Civil Defense.
2. Observe a scheduled national drill.
3. Nominate a technical contact for feed format, keys and hosting.
