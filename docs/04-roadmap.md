# 04 · Technical roadmap

| Milestone | Scope | Exit criteria | Status |
|---|---|---|---|
| **M1 · Research and architecture** | Official landscape research, gap analysis, legal and operational dependencies, architecture, UX spec, safety boundaries | Docs reviewed and merged | Done ([PR #1](https://github.com/PythonistaAbbey/Saudi_Sheild/pull/1)) |
| **M2 · Interactive prototype** | `core` library; Expo civilian app (AR/EN, RTL); Next.js dashboard; synthetic data; visual identity | App and dashboard run locally; screenshots in `docs/screenshots` | Done |
| **M3 · Simulation environment** | NestJS API: signed ingest, verification, workflow, RBAC, audit chain, public signed feed and SSE; scenario simulator driving dashboard and app | A fictional alert can be received, verified, reviewed, approved, published, shown in the app and cleared, end to end | Done |
| **M4 · Family and accessibility** | Family check-ins, read-aloud, plain-language mode, large text and high contrast, offline guidance, low-bandwidth feed | Accessibility checklist passes; feed works under 50 kbps | Done (lite feed: 1.2 KB gzipped for 6 alerts) |
| **M5 · Testing and validation** | Unit tests (core), API e2e tests (roles, two-person rule, quarantine, safe failure), UI journey tests (Playwright), accessibility scans | CI green; test report in [`docs/06-testing.md`](06-testing.md) | Done |
| **M6 · Presentation package** | Executive deck: problem, solution, architecture, demo, limits, costs, phased plan, approvals | Deck and one-page brief in `docs/presentation` | Done ([brief](presentation/executive-brief.md)) |

## Beyond the prototype (indicative phases for an approved programme)

1. **Discovery with the authority (8–12 weeks)**: confirm scope, feed format, keys, templates, languages and hosting; data protection impact assessment.
2. **Pilot integration (4–6 months)**: CAP feed integration in a test environment, NCA ECC controls, joint drills aligned with the official test calendar.
3. **Limited pilot (3–6 months)**: one region and selected languages, during drills only.
4. **National rollout**: subject to evaluation and formal approval.
