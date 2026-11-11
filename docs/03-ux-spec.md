# 03 · UI/UX specification

> Status: Milestone 1 deliverable. The working prototype implements this spec; screenshots are in [`docs/screenshots`](screenshots).

## 1. Experience goals

| Goal | What it means in practice |
|---|---|
| **Clarity under stress** | One message, one action. The first screen of an alert answers *what is happening*, *what do I do now* and *is it official*. |
| **Speed** | An alert opens straight to its instructions. No splash screen, no animation, no sign-in. |
| **Trust** | Every alert shows its issuer, a verification badge and its time. The app never sounds more certain than the authority. |
| **Calm** | A restrained palette, no flashing, no countdowns, no sound beyond the system's own alert sound. |
| **Inclusion** | Arabic (right-to-left) and English from day one, screen readers, large text, high contrast, read-aloud and plain-language modes. |
| **Honesty about being a prototype** | A permanent label: "Independent prototype · Fictional exercise data · Not an official service". |

## 2. Visual identity

The identity is deliberately **independent**: no national emblem, no palm and swords, no ministry logos, no flag reproduction.

### 2.1 Mark

An abstract rounded-square "signal" mark: three concentric arcs above a solid dot, suggesting a calm, received signal. It is not a shield and contains no national symbols.

### 2.2 Colour tokens

| Token | Hex | Use |
|---|---|---|
| `green-900` | `#0A3D2C` | Headers on light, dashboard sidebar |
| `green-700` | `#0E5E43` | Primary actions, brand |
| `green-500` | `#2F8A63` | Focus rings, positive states |
| `green-50` | `#EAF3EE` | Positive backgrounds |
| `charcoal-900` | `#1B1F22` | Body text, dark surfaces |
| `charcoal-600` | `#4A5157` | Secondary text |
| `neutral-200` | `#E4E2DC` | Borders |
| `neutral-100` | `#F3F2EE` | App background (warm off-white) |
| `white` | `#FFFFFF` | Cards |
| `alert-yellow` | `#E3A008` on `#FFF7DB` | **Yellow**: a risk may occur |
| `alert-red` | `#B42318` on `#FDECEA` | **Red**: danger has occurred |
| `alert-white` | `#FFFFFF` with `green-700` | **White**: danger has ended |
| `exercise` | `#5B4BB7` | "EXERCISE / FICTIONAL" labelling, used only for that purpose |

Alert colours always appear **with a text label and an icon**, never as colour alone (WCAG 1.4.1). All text meets contrast of at least 4.5:1; alert headlines meet 7:1.

### 2.3 Typography

* **IBM Plex Sans Arabic** for both Arabic and Latin text, so both scripts share one carefully matched family. Weights 400, 500, 600 and 700.
* **IBM Plex Mono** for hashes, key IDs and identifiers in the dashboard.
* Mobile type scale: 13 / 15 / 17 (body) / 20 / 24 / 32 / 40 (alert headline). Line height 1.45 for Arabic, 1.35 for Latin.
* Respect the operating system's text-size setting up to 200 %.

### 2.4 Motion

* Normal screens: 150–200 ms opacity and position transitions.
* **Alert screens: no animation.** Content appears instantly. Respect "reduce motion".

## 3. Civilian mobile app

### 3.1 Information architecture

```
Tab bar:  Home · Alerts · Guidance · Family · More
          └ More: Emergency contacts · Settings · About this prototype
Full-screen: Alert detail (opens from notification, banner or history)
First run: Onboarding (4 steps)
```

### 3.2 Screens

| Screen | Purpose | Key elements |
|---|---|---|
| **Onboarding** | Set expectations, language and location | 1 Prototype disclosure · 2 Language (العربية / English) · 3 Location: choose region and city from a list; GPS optional, stays on the device · 4 "Official cell broadcast alerts and sirens remain authoritative" |
| **Home** | Calm status at a glance | Status card for the user's area (No active alerts / Yellow / Red / White, with time of last official update) · active alert banner · quick actions: I'm safe, Guidance, Contacts · feed health line |
| **Alert detail** | Act now | Level band with label and icon · headline · **What to do now**: numbered steps from the authority's instruction codes · area map with the user's area highlighted · issuer and Verified badge · issued, updated and expiry times · language switch · Read aloud · Plain-language version · "I'm safe" button · footer: "Official cell broadcast alerts remain authoritative" |
| **Alert history** | Find past and current alerts | Filter: Active / All · list items with level chip, hazard, area, time and status (Active, Cleared, Cancelled, Expired) · Verified badge |
| **Guidance** | Offline preparedness | Hazard cards: aerial threat (shelter in place), sandstorm, flash flood, extreme heat, fire, earthquake · each with Before / During / After · "Available offline" badge · source line |
| **Family** | Voluntary reassurance | Family circle with consent status · "I'm safe" / "I need help" check-in · last check-in time · invite by code · pause sharing · explains exactly what is shared |
| **Emergency contacts** | Authoritative numbers | 911 (Riyadh, Makkah, Madinah, Eastern regions) · 998 Civil Defense · 997 Ambulance · 999 Police · tap to call |
| **Settings** | Preferences | Language · region and city · text size · high contrast · reduce motion · read alerts aloud automatically · demonstration mode (on, cannot be turned off in the prototype) |

### 3.3 Alert screen anatomy (top to bottom)

1. **Exercise ribbon** (prototype only): `EXERCISE · FICTIONAL · تمرين · افتراضي`
2. **Level band**: full-width colour band, icon, label ("Red · Danger has occurred").
3. **Headline** at 32–40 pt.
4. **What to do now**: a maximum of five numbered steps; the first step is the most important.
5. **Where**: area names plus a small map.
6. **Source**: issuer name, Verified badge, time issued and last updated.
7. **Actions**: I'm safe · Read aloud · Plain language · Share (shares the official text, not screenshots of incidents).
8. **Footer**: "Follow official channels. Official cell broadcast alerts and sirens remain authoritative."

### 3.4 Notification copy rules

* Lead with the level word, then the action: "Red · Take shelter now: interior room, away from windows".
* No exclamation marks, no capitals for emphasis, no emoji.
* Never include unverified detail, estimates or speculation.

## 4. Operations dashboard

### 4.1 Layout

A dark green sidebar (navigation, user and role, environment badge `EXERCISE ENVIRONMENT`), a top bar with system health and the clock (Arabia Standard Time, UTC+3), and a content area on a warm off-white background. Responsive down to tablet portrait.

### 4.2 Pages

| Page | Purpose |
|---|---|
| **Overview** | Active alerts by level, inbound queue, delivery statistics, feed and service health, recent audit events |
| **Inbound** | Messages received from issuers, with authenticity panel: issuer, key ID, signature result, payload hash, received time, skew |
| **Alert workspace** | One alert end to end: structured facts (read-only), rendered AR/EN text, AI assist panel with findings, approvals timeline, actions allowed for the current role |
| **Warning areas** | Map of authority-supplied areas with current status; select areas for an alert; area metadata |
| **Delivery** | Per-alert delivery funnel (queued, sent, delivered, opened, "I'm safe") and per-channel statistics |
| **System health** | Service status, queue depth, feed freshness, key validity, last drill |
| **Audit log** | Hash-chained events with verification result and export |
| **Users and roles** | Users, roles and the permission matrix |
| **Simulator** | Run fictional exercise scenarios step by step (Milestone 3) |

### 4.3 Action safety

* Destructive or public actions (Publish, Clear, Cancel) need a **confirmation dialog** that restates the level, areas and languages, plus re-entry of the operator's PIN.
* Buttons for actions the current role cannot perform are **not shown**; a short note explains who can.
* The two-person rule is shown visibly: "Prepared by A. Operator · Awaiting approval by a different approver".

## 5. Accessibility checklist

* WCAG 2.2 AA throughout; AAA contrast on alert content.
* Full screen-reader labels in Arabic and English; alert detail is announced in reading order with the level first.
* Touch targets of at least 48 × 48 dp.
* Right-to-left mirroring for Arabic, including icons with direction.
* No information conveyed by colour, sound or vibration alone.
* Plain-language mode targets a reading age of about 9 years.
* Read aloud uses the device's text-to-speech in the alert's language.

## 6. Content voice

Calm, direct and specific. Use the authority's words. Say what to do, then why. Never guess.

| Do | Don't |
|---|---|
| "Go to an interior room away from windows." | "Find somewhere safe!!" |
| "Issued by the exercise issuer at 14:05." | "Experts believe…" |
| "Live updates may be delayed. Follow official channels." | "No danger detected." (when the feed is down) |
