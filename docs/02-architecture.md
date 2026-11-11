# 02 · System architecture

> Status: Milestone 1 deliverable. Describes both the **prototype** in this repository and the **target** architecture for a future, formally approved deployment.

## 1. Design principles

1. **Authority first.** Only messages signed by a registered, authorised issuer can enter the publication pipeline. Saudi Shield cannot originate a warning.
2. **Humans approve, software assists.** Every public message is approved by a named person under a two-person rule. AI only drafts presentation text and flags problems.
3. **Structured facts, generated words.** The hazard, level, area, instructions and timing are structured fields that come from the authority. The wording in each language is rendered from *pre-approved templates*. AI cannot change the structured fields.
4. **Defence-in-depth delivery.** Cell broadcast and sirens remain authoritative. The app is an *additional* channel and never claims to be the primary one.
5. **Fail safe and fail loud.** If verification fails, a key is revoked, or the feed goes stale, the system withholds publication, tells operators, and tells the public to rely on official channels.
6. **Privacy by default.** No account is needed to receive alerts. Location stays on the device. Family check-ins are opt-in and minimal.
7. **Civilian scope.** No sensor data, tracking, trajectories or impact estimation, by design and by data model (see [05-safety-boundaries.md](05-safety-boundaries.md)).

## 2. Context

```
                 ┌──────────────────────────────────────────┐
                 │ AUTHORISED ISSUERS (future, by agreement)│
                 │ Civil Defense · NCM · regional authority │
                 └───────────────┬──────────────────────────┘
                     signed CAP 1.2 messages (Ed25519 / XML-DSig)
                                 │
   official cell broadcast ◄─────┤   (unchanged, remains authoritative)
   and sirens                    ▼
                 ┌──────────────────────────────────────────┐
                 │            SAUDI SHIELD PLATFORM         │
                 │ ingest → verify → review → approve →     │
                 │ publish → update / clear / cancel        │
                 └───────┬──────────────────────┬───────────┘
                         │                      │
            operations dashboard          signed public feed
            (authority staff)          (app, web, partner channels)
                                                │
                                      civilian mobile app
```

In the **prototype**, the "authorised issuer" is a **simulator** using a demo key labelled `DEMO-ISSUER · FICTIONAL`. Every message carries CAP `status = Exercise`, and the core library refuses to process `status = Actual` in prototype builds.

## 3. Components

| Component | Prototype (this repo) | Target deployment |
|---|---|---|
| `packages/core` | TypeScript domain library: alert model, signing and verification, workflow state machine, RBAC, hash-chained audit, geography, templates, AI-assist guardrails, synthetic scenarios, offline guidance | Same library, shared by backend and clients |
| `apps/api` | **NestJS** REST + Server-Sent Events, in-memory repository, demo authentication | NestJS services behind an API gateway, PostgreSQL + PostGIS, message queue, HSM-backed keys, SSO |
| `apps/dashboard` | **Next.js** operations dashboard | Same, behind SSO and mutual TLS, on the authority's network |
| `apps/mobile` | **React Native (Expo)** civilian app, also built for web for demos | Native iOS and Android builds |
| `db/schema.sql` | PostGIS schema (reference, not used by the in-memory demo) | Primary datastore |

### 3.1 Why NestJS

* A typed, modular structure (modules, guards, interceptors) maps cleanly onto *role guards* and *audit interceptors*, the two most important controls here.
* It shares TypeScript and the `core` library with the dashboard and app, so the same validation and verification code runs everywhere.
* It is mature and widely used in Gulf government and enterprise projects, which eases handover.

## 4. Alert lifecycle

```
            ┌───────────┐ signature ok ┌───────────┐ operator  ┌──────────────┐
 ingest ──► │ RECEIVED  ├─────────────►│ VERIFIED  ├──────────►│ IN_REVIEW    │
            └─────┬─────┘              └───────────┘ prepares  └──────┬───────┘
                  │ bad signature / unknown key                       │ approver (≠ preparer)
                  ▼                                                   ▼
            ┌───────────┐                                      ┌──────────────┐
            │QUARANTINED│ (never publishable)        reject ◄──┤  APPROVED    │
            └───────────┘                                      └──────┬───────┘
                                                                      │ publisher
                                                                      ▼
                         update (new signed msg, same flow)   ┌──────────────┐
                        ┌────────────────────────────────────►│  PUBLISHED   │
                        │                                     └──┬────────┬──┘
                        │                     authority "White"  │        │ authority Cancel
                        │                                        ▼        ▼ or approver retraction
                        │                                  ┌─────────┐ ┌───────────┐
                        └──────────────────────────────────┤ CLEARED │ │ CANCELLED │
                                                           └─────────┘ └───────────┘
                         auto: EXPIRED when `expires` passes without update
```

Rules enforced in `packages/core/src/workflow.ts`, with tests:

* Only `VERIFIED` messages can enter review. `QUARANTINED` is terminal.
* **Two-person rule**: the approver must be a different person from the preparer.
* Publishing requires an `APPROVED` alert, a valid issuer signature, an unexpired validity window, and a passing *content check* (no unresolved blocking issues).
* Clearing ("White") requires a signed message from the authority that references the original alert.
* Cancelling (for example a message issued in error) requires either an authority Cancel message or an approver plus a second approver.
* Every transition writes an audit entry.

## 5. Roles and permissions

| Role | Can | Cannot |
|---|---|---|
| `viewer` | See dashboards, alerts and statistics | Change anything |
| `operator` | Prepare alerts: choose translations, review AI drafts, attach warning areas from the authority's set | Approve or publish |
| `approver` | Approve or reject prepared alerts, request cancellation | Approve their own preparation; publish |
| `publisher` (duty officer) | Publish approved alerts, issue clears and cancellations | Edit content; approve |
| `auditor` | Read and verify the audit log, export evidence | Change alerts |
| `admin` | Manage users, roles and issuer keys (with dual control) | Prepare, approve or publish alerts |

Permissions live in one table (`packages/core/src/rbac.ts`) used by the API guards *and* the dashboard UI, so the UI never shows an action the API would refuse.

## 6. Message integrity and authenticity

* **Inbound**: each issuer message is canonicalised (sorted-key JSON in the prototype; XML-DSig on CAP XML in production) and signed with **Ed25519**. The platform checks the signature against a key registry entry with an issuer ID, validity window and revocation status. Unknown, expired or revoked keys go to quarantine.
* **Outbound**: the platform signs the public feed with its own publishing key. The app verifies every alert before showing it and shows a "Verified" badge with the issuer name. Unverifiable items are never displayed as alerts.
* **Replay protection**: message identifiers are unique per issuer, and `sent` time must fall within a skew window.
* **Audit**: an append-only log where each entry includes the SHA-256 hash of the previous entry. The auditor view re-computes the chain and flags any break.

## 7. Geography

* Warning areas are **supplied by the authority** as polygons or as administrative codes (region, governorate, district). Operators can *select* from those areas; they cannot draw arbitrary new public warning areas.
* PostGIS stores areas as `geometry(MultiPolygon, 4326)` with GiST indexes. The app checks whether the user's chosen location falls inside a warning area **on the device**, so the server never learns the user's position.
* Maps in the prototype are rendered from bundled public boundary data (Natural Earth via `world-atlas`) as SVG, so the demo needs no external tile service. The target uses **MapLibre GL** with self-hosted vector tiles (OpenStreetMap-derived) inside the Kingdom, which avoids sending users' map views to third-party providers.
* The prototype uses **coarse, fictional "exercise zones"** drawn as simple shapes. They do not represent real incidents.

## 8. Delivery

```
publish ─► outbox table ─► queue (prototype: in-process; target: RabbitMQ / Kafka)
                              ├─► signed public feed + SSE / WebSocket
                              ├─► push (APNs / FCM), data-only, "wake and fetch"
                              ├─► partner channels (web widgets, broadcasters)
                              └─► delivery receipts ─► statistics
```

* Push notifications are used **only as a trigger to fetch** the signed alert. The content is always fetched and verified, so a spoofed push cannot display a fake alert.
* Apps also poll the feed periodically and on launch, so missed pushes are recovered.
* The app never claims to be the primary channel: "Official cell broadcast alerts and sirens remain authoritative."

## 9. AI-supported communication

```
   approved structured alert ──► template renderer ──► AR / EN text (authoritative)
                │
                └──► AssistProvider (rule-based in prototype; LLM optional later)
                        ├─ translation check (does the text match the template?)
                        ├─ plain-language explanation   ┐
                        ├─ accessibility variants       ├─ all labelled "AI draft, needs human review"
                        ├─ conflict / clarity checker   │
                        └─ summary draft for briefings  ┘
```

Guardrails (`packages/core/src/assist`):

* The assist layer receives a **read-only** alert and returns **text suggestions plus findings**. It has no API to change level, hazard, areas, instructions, timing or status.
* Output is marked `aiDraft: true` and cannot be published until an operator accepts it and an approver approves the alert.
* The conflict checker blocks publication if, for example, the text says "evacuate" while the instruction codes say "shelter in place", or if the Arabic and English versions disagree on numbers or times.
* The prototype uses a deterministic rule-based provider so demos are reproducible and need no network. An LLM provider can be added behind the same interface, with the same guardrails.

## 10. Security controls (target)

| Area | Control |
|---|---|
| Identity | Authority SSO (SAML/OIDC) with phishing-resistant MFA for all dashboard users |
| Access | RBAC plus two-person rule; just-in-time elevation for admin |
| Keys | Issuer and publisher keys in an HSM; dual control for rotation; published revocation list |
| Transport | TLS 1.3 everywhere; mutual TLS between issuer and ingest |
| Data at rest | AES-256 encryption at rest; column encryption for family data |
| Audit | Hash-chained, append-only, exported daily to write-once storage |
| Hosting | In-Kingdom, CST-licensed cloud, compliant with NCA ECC and CCC |
| Privacy | PDPL compliance: consent, minimisation, retention limits, data-subject requests |
| Resilience | Active-active in two regions; feed served from CDN with signed payloads; documented degraded modes |

## 11. Safe failure behaviour

| Failure | Behaviour |
|---|---|
| Signature invalid or key revoked | Message quarantined; operators alerted; nothing published |
| Issuer feed silent beyond threshold | Dashboard health turns amber; app shows "Live updates may be delayed. Follow official channels." |
| App cannot reach the feed | App shows the last verified state with its time, plus offline guidance; never invents status |
| Conflicting messages | Newer signed message wins only if it references the earlier one; otherwise both are held for review |
| AI assist unavailable | Templates still render; publication is unaffected |

## 12. Repository layout

```
docs/                 research, architecture, UX, roadmap, safety boundaries
packages/core/        shared domain library and tests
apps/api/             NestJS backend and simulator
apps/dashboard/       Next.js operations dashboard
apps/mobile/          Expo / React Native civilian app
db/schema.sql         PostgreSQL + PostGIS reference schema
scripts/              screenshot and demo tooling
```
