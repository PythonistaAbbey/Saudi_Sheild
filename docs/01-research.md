# 01 · Research: the official Saudi emergency-warning landscape

> Status: Milestone 1 deliverable. Researched November 2026 from public sources only (listed at the end).
> Nothing here claims knowledge of non-public systems. Where a fact could not be confirmed it is marked **(unconfirmed)**.

## 1. Purpose of this research

Saudi Shield is meant to **complement** the Kingdom's existing emergency-warning infrastructure, not replace or imitate it. Before designing anything we need to know what the official systems already do well, where an independent companion app could add value, and which legal and operational approvals would be needed before any real deployment.

## 2. The National Early Warning Platform for Emergencies

Arabic name: المنصة الوطنية للإنذار المبكر في حالات الطوارئ

| Aspect | What public sources say |
|---|---|
| Owner | Ministry of Interior, through the **General Directorate of Civil Defense** |
| Launch | Inaugurated by the Minister of Interior on 9 July 2022, after a first-phase trial in February 2021 (Al Baha and several governorates) |
| Delivery technology | **Cell broadcast** to phones attached to mobile networks, sent to a targeted geographic area, with a distinctive loud tone and an on-screen message |
| Partners | Mobile network operators, coordinated through the telecoms regulator (CITC, renamed the Communications, Space and Technology Commission, **CST**, in 2023) |
| Complementary channels | **Fixed sirens** in designated areas, tested periodically |
| Use cases | Severe weather, and any emergency requiring precautionary action. In 2026 the platform was used during live aerial-threat events (for example Riyadh and Eastern Province alerts in March and November 2026), followed by "danger has passed" messages per governorate |
| Tests | Periodic regional drills. Example: 3 November 2025, Riyadh, Diriyah, Al-Kharj, Al-Dilam, Tabuk, Jeddah and Thuwal: a new "behaviour" tone at 13:00, the national alert tone at 13:10 and fixed sirens at 13:15 |
| Languages of messages | **(unconfirmed)** Public reporting does not state the languages used |
| Opt-in | None reported. Cell broadcast reaches compatible handsets in the area without registration |

### 2.1 Public alert signals (as published by Civil Defense)

| Colour | Meaning | Siren tone |
|---|---|---|
| Yellow | A risk has been detected and **may** occur | Intermittent tone, 60 s: danger is near |
| Red | The danger **has occurred** | Wavering tone, 60 s: danger has occurred |
| White | The danger **has ended** | Steady tone, 30 s: danger has ended |

Saudi Shield **adopts these three public meanings verbatim** so that the companion app never teaches people a second, conflicting vocabulary.

### 2.2 Published public guidance during alerts

Summarised from Civil Defense guidance as reported by the press:

1. Stay calm and follow official channels only.
2. Go immediately to the nearest safe indoor place, an interior room away from windows.
3. Stay indoors until the danger has passed.
4. Keep away from windows, glass, balconies, rooftops and open areas.
5. If outdoors, enter the nearest building or shelter behind a solid barrier.
6. Drivers should pull over safely, away from bridges and tall buildings.
7. Do not gather at, film or share images of incident sites or interception activity (doing so may carry legal liability).
8. Emergency numbers: **911** (Makkah, Riyadh, Eastern and Madinah regions), **998** (Civil Defense, rest of the Kingdom).

The app's built-in guidance (see `packages/core/src/guidance`) is written to match this wording and **cites it as the source**. It must be re-checked against current official guidance before any deployment.

## 3. The Madani application (مدني)

| Aspect | What public sources say |
|---|---|
| Owner | General Directorate of Civil Defense |
| Availability | App Store since 2013, Google Play since 2020 |
| Public services | Job application results, volunteer platform, safety licences (Salamah), facility visit requests, complaints and enquiries (Qareeb), awareness publications and videos |
| Staff services | Work email, Daem platform, leave requests, field-readiness platform, Hajj training observation |
| Integration | Gateway to other government services such as Absher and Tawakkalna |
| Emergency alert feed | **Not described** in public sources. Madani is a services app; live warnings are delivered by the National Early Warning Platform via cell broadcast |

## 4. Other relevant official channels

* **Tawakkalna**: in March 2026 the Ministry of Defense added a service for the public to report suspicious aerial sightings. *Saudi Shield deliberately does not replicate or connect to sighting reports*, because that is a defence function outside our civilian-communication scope.
* **National Center for Meteorology (NCM)**: issues weather warnings (sandstorms, heavy rain, flash floods, heat). A future integration would receive NCM warnings through the same authenticated channel as Civil Defense.
* **Official social media accounts** of Civil Defense and regional emirates, which publish follow-up updates.

## 5. Gap analysis: where a companion app could help

These are *opportunities consistent with public information*, not criticisms of the official system. Each must be validated with the authorities.

| # | Observation | Why it matters | Saudi Shield response |
|---|---|---|---|
| G1 | Cell broadcast messages are short and transient; once dismissed they are hard to find again | People under stress re-read instructions; follow-up and "danger has passed" messages need context | A **verified alert history** with the full message, timeline and current status of each warning area |
| G2 | Message languages are not publicly documented, while roughly four in ten residents are non-Saudi and millions of pilgrims visit each year | People who cannot read the message may not act on it | **Pre-approved multilingual templates**: Arabic and English first, with Urdu, Hindi, Bengali, Filipino, Indonesian and others next |
| G3 | Sirens and tones are hard for deaf and hard-of-hearing people; dense text is hard for blind, low-literacy and older users | Accessibility is a safety issue | Screen-reader-first layouts, read-aloud, large type, high contrast, vibration patterns, plain-language versions |
| G4 | After an alert, people phone family members, which congests voice networks | Reduces load and anxiety | **Voluntary family check-ins** ("I am safe") with minimal data |
| G5 | Preparedness guidance lives across PDFs, videos and social posts | It is needed when networks are slow or down | **Offline guidance** bundled in the app, under 1 MB |
| G6 | Unofficial channels spread rumours and fake "alerts" | False alerts cause panic or complacency | Every alert in the app is **cryptographically verified** against the authority's key and shows its source |
| G7 | A clear, persistent "all clear" state is not always visible | People stay sheltered too long or leave too early | Each warning area shows its **current status** (Yellow, Red, White) and the time of the last official update |

## 6. Dependencies before any real deployment

### 6.1 Legal and regulatory

| Dependency | Authority | Notes |
|---|---|---|
| Mandate to redistribute official warnings | Ministry of Interior, General Directorate of Civil Defense | Formal agreement (MoU or contract) defining scope, liability and branding |
| Personal Data Protection Law (PDPL) | SDAIA / National Data Management Office | Location and family data are personal data; consent, purpose limitation, minimisation, retention, data-subject rights, breach notification, and restrictions on transfer outside the Kingdom |
| Essential Cybersecurity Controls (ECC) and Cloud Cybersecurity Controls (CCC) | National Cybersecurity Authority (NCA) | Required for systems serving government or critical national infrastructure |
| Cloud hosting and data residency | CST cloud regulatory framework; NCA CCC | Host in-Kingdom on a CST-licensed, NCA-compliant provider |
| Telecommunications | CST | Only if SMS or other operator channels were used. Cell broadcast stays under the official platform |
| App store publication and naming | Digital Government Authority, trademark rules | The current name "Saudi Shield" must not be published publicly without approval, because it could be mistaken for an official service |
| Anti-Cyber Crime Law and Law of Combating Rumours | Public Prosecution | Relevant to impersonation of alerts and to the "no filming of incident sites" guidance |

### 6.2 Operational

1. An **authenticated feed** of official alerts, ideally in the OASIS Common Alerting Protocol (CAP 1.2), signed with keys controlled by the issuing authority.
2. **Key management**: an agreed public-key distribution and rotation procedure, plus revocation.
3. **Authoritative geography**: warning-area polygons, or a shared list of governorate and district codes, supplied by the authority.
4. **Approved translations** of standard message templates, signed off by the authority.
5. **Approved guidance content** for each hazard type.
6. **Operating procedures**: who on the authority side reviews companion-app wording, the escalation path, and 24/7 incident contacts.
7. **Exercise programme**: joint drills aligned with the official test calendar.

## 7. Conclusions that drive the design

1. **Cell broadcast stays authoritative.** Saudi Shield is a second, richer channel for context, history, languages and accessibility. The app says this plainly in onboarding and on every alert screen.
2. **No independent alerting.** Saudi Shield only republishes messages that arrive signed by an authorised issuer *and* pass human review. Nothing in the system can originate a warning.
3. **Use the official vocabulary.** Yellow, Red and White, the official emergency numbers, and the official guidance wording.
4. **Civilian scope only.** No sighting reports, tracking, trajectories, impact estimates or anything else of defence value. See [05-safety-boundaries.md](05-safety-boundaries.md).
5. **The prototype must not look official.** It uses an independent visual identity, no government emblems, and a permanent "Independent prototype · Fictional data" label.

## Sources

* Saudi Gazette, *Interior minister launches national platform for early warning in emergencies*, 9 July 2022: https://saudigazette.com.sa/article/622780
* Gulf News, *Civil Defense to trial Early Warning Messages service for smartphones*, 14 February 2021: https://gulfnews.com/world/gulf/saudi/saudi-arabia-civil-defense-to-trial-early-warning-messages-service-for-smartphones-1.77183503
* Asharq Al-Awsat, *What is the National Early Warning Platform in Saudi Arabia?* (Arabic), March 2026: https://aawsat.com/node/5249359
* Saudi Gazette, *Civil Defense strengthens readiness with sirens and phone alerts sounded across several Saudi regions*, November 2025: https://saudigazette.com.sa/article/656234
* Gulf News / AP, *Saudi Arabia issues early warning alerts in Riyadh and Eastern Province, urges residents to take shelter*, November 2026: https://gulfnews.com/world/gulf/saudi/saudi-arabia-issues-early-warning-alerts-in-riyadh-and-eastern-province-urges-residents-to-take-shelter-1.500740056
* Saudipedia, *Madani Application*: https://saudipedia.com/en/article/4081/government-and-politics/digital-government/madani-application
* Arab News, *Saudi defense ministry adds aerial threat reporting to Tawakkalna app*, March 2026: https://www.arabnews.pk/node/2636535
* OASIS, *Common Alerting Protocol Version 1.2*: https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2-os.html
