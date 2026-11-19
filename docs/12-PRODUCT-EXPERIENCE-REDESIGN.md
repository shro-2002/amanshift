# 12 — Product Experience Redesign

Status: adopted 2026-11-19 (post v1.0-rc1). Supersedes the screen inventory and navigation of doc 04 §3–§6. Doc 04's severity tokens, accessibility rules, banned words and the pictogram-first worker card rules remain binding. The engine, checker, policy, offline degrader and evaluation are **unchanged**; this document changes only how they are presented.

## 1. Why

v1.0-rc1 put checker rule IDs, hashes, mutation tables and a demo control drawer on the main screen. A safety manager has to read engineering evidence to find out who needs protecting. The redesign moves each audience to its own surface:

| Surface | Audience | Purpose |
|---|---|---|
| **Website** `/` | contractor, safety department, judge | Understand the human problem in 10 seconds; enter the product |
| **Safety Command Center** `/app/*` | site supervisor, HSE officer | Know who needs intervention and what protection exists; act |
| **Worker app** `/worker` | crew members (shared phone/tablet) | One instruction, in their language, readable in sun, offline |
| **Demonstration** `/demo` | judge, pilot sponsor | Run the live failure-resilience scenario with scenario controls |
| **Help & technical validation** `/help/*` | judge, auditor, occupational-health reviewer | Method, limits, measured evaluation, reproducibility |

The engineering evidence supports the product; it is one click away, never in the way.

## 2. Product story (used on the website and in the video)

1. **Problem.** Outdoor workers in Abu Dhabi face dangerous heat for much of the summer working day. Heat exposure depends on the work, the clothing and whether shade, cooling and water are actually there.
2. **Promise.** "Every worker deserves to return home safely." AmanShift turns tomorrow's forecast, onsite readings and the real state of protective resources into one clear protective action per crew.
3. **Proof of care.** When the forecast goes stale, a cooling cabin breaks or the network drops, AmanShift never relaxes protection: it tightens, and it tells the supervisor exactly who is affected.
4. **Rights.** No names, no tracking, no biometrics. The crew is the smallest unit. Not for discipline, pay or hiring.

Claims we do **not** make: preventing illness, clinical validation, regulatory certification, measured WBGT, individual risk prediction.

## 3. Information architecture

```
/                      Website (marketing, no app chrome)
/app                   Overview — the 5-second answer
/app/worksite          Worksite map (interactive SVG schematic)
/app/crews             Crew protection (cards + detail drawer)
/app/resources         Safety resources (availability, capacity, confirmation)
/app/alerts            Alerts & actions (intervention workflow + plan review)
/app/activity          Safety activity (readable timeline of the audit log)
/worker                Worker protection app (mobile-first, no app chrome)
/demo                  Demonstration environment (guided steps + live views)
/help                  Help & resources index
/help/validation       Technical validation report (eval/out/*.json)
/help/method           Method, assumptions and limitations
```

Legacy routes redirect: `/command` → `/app`, `/command?judge=1` → `/demo`, `/cards` → `/worker`, `/evidence` → `/help/validation`, `/method` → `/help/method`.

**Settings is omitted.** The only settings that exist are language and theme; both live in the top bar. An empty settings page would be decorative.

## 4. Design system

### 4.1 Direction
Restrained industrial: deep navy chrome, warm desert-sand working surfaces, petroleum teal for brand and interaction, amber and red reserved for severity. Dense where data is dense; generous only around the one decision on each screen. No glass, no gradients on data, no emoji.

### 4.2 Tokens (`web/src/styles/tokens.css`)

| Role | Light | Dark |
|---|---|---|
| `--navy-900` chrome | `#0B1B2B` | `#081420` |
| `--navy-700` | `#13314A` | `#13314A` |
| `--teal-600` brand/interactive | `#0F6A6E` | `#4FB3B0` |
| `--sand-50` page | `#F5F1E8` | `#0F1519` |
| `--sand-100` surface-2 | `#ECE5D6` | `#1A2228` |
| `--surface` card | `#FFFFFF` | `#151C21` |
| `--ink` | `#14202B` | `#E9E5DC` |
| severity 1–4 | doc 04 tokens (unchanged, contrast-checked) | |

Severity colour is used only for severity, always paired with the level word and a shape (doc 04 §2).

### 4.3 Type
IBM Plex Sans (Latin, 400/500/600/700), IBM Plex Sans Arabic, Noto Naskh Arabic (Urdu), Noto Sans Devanagari, Noto Sans Bengali, IBM Plex Mono for times only. Self-hosted via `@fontsource` (offline PWA; no third-party font requests). Scale: 12 / 14 / 16 / 20 / 24 / 32 / 44 / 60. Worker app minimum body 20 px, action line 28–32 px.

### 4.4 Icons
One inline SVG icon set (`components/Icon.tsx`), 24 px grid, 2 px stroke: shade canopy, cooled cabin, water, crew, clock, alert, stop hand, phone, medic cross, forecast, meter, offline, check, chevron, map. The same glyphs are the worker pictograms (scaled, stroke 2.5).

### 4.5 Motion
150 ms colour/opacity transitions on interactive states; 250 ms slide for drawers; level changes pulse the badge once. All disabled under `prefers-reduced-motion`.

## 5. Screen inventory and wireframes

### 5.1 Website `/`
```
┌ AmanShift  ·  How it works  For workers  Privacy  Validation   [Open Command Center] ┐
│ HERO (navy):  Every worker deserves to return home safely.          ┌ live product ┐ │
│  Predict dangerous heat exposure, coordinate protective resources   │ snapshot     │ │
│  and keep workers informed — even when critical systems fail.       │ (illustrated │ │
│  [Open Safety Command Center]  [Explore Worker Experience]          │  site + card)│ │
├ THE PROBLEM — 3 facts, cited (midday break dates, NIOSH limits, ADOSH TWL)          ┤
├ HOW IT WORKS — Forecast → Crew & task → Protection available → One action           ┤
├ FOR WORKERS (phone mock: card in Arabic) │ FOR SUPERVISORS (overview mock)           ┤
├ WHEN THINGS FAIL — stale forecast / cooling down / offline → protection tightens     ┤
├ PRIVACY & RIGHTS — no names, no tracking, not for discipline                         ┤
├ CTA band + honest footer (synthetic site, historical weather, decision support)      ┘
```
Imagery: an illustrated Gulf worksite (SVG, no stock faces, no real brands). A licensed photograph can replace the hero art without layout change (`web/public/img/hero.jpg`).

### 5.2 Overview `/app` (desktop)
```
┌nav┐┌ Site · Wed 1 Jul 2026 · 10:30 GST · Forecast fresh · Online · [lang] ┐
│Ov │├ ATTENTION BANNER (only when something is wrong, red/amber, plain language) ┤
│Ws │├ Workers on site 42 │ Need intervention 14 (2 crews) │ Confirmed rest places 48 │ Heat now / outlook ┤
│Cr │├ PRIORITY ACTIONS (ordered)                    │ WORKSITE (mini map, clickable) ┤
│Rs │├ HEAT OUTLOOK 06–18 (est. WBGT, midday break)   │ PROTECTION PLAN status + review ┤
│Al │└ CREWS strip: name · zone · level · action ──────────────────────────────────┘
│Ac │
└───┘
```
Mobile: nav collapses to a top menu button; tiles 2×2; sections stack in the order Attention → Actions → Tiles → Map → Outlook.

### 5.3 Worksite `/app/worksite`
Full-width SVG schematic: three zones (West Frame, Central Podium, East Plant Yard) along an access road, building/structure blocks, resources drawn as glyph + capacity, crews as level-coloured pills. Selecting a resource shows state, capacity, last confirmation, assigned crews and "if unavailable" consequences (crews whose only rest option it is). Selecting a crew shows task, level, protections reachable, the current plan action and why. Unavailable resources are hatched with a red outline; uncovered crews get a red ring. Label: "Synthetic schematic — not a surveyed site; crews shown at zone level, no individual location."

### 5.4 Crew protection `/app/crews`
Card grid sorted by need. Each card: task name (stable id small), zone, size, level badge, current action in words, rest/water assignment, degraded marker. Drawer: plain-language reasoning first ("Heavy work in coveralls in direct sun: limit reached at 75 % work"), then expandable "How this was determined" (the full computation trace), permitted options, and the two-step symptom report.

### 5.5 Safety resources `/app/resources`
List grouped by type: state (Available / Unavailable / Restored, awaiting confirmation), capacity and current assigned load, minutes since physical confirmation (stale after 30), crews served, consequence if lost. Actions: **Confirm on site** (physical reconfirmation) and **Report unavailable**. Both are real supervisor actions logged to the audit trail.

### 5.6 Alerts & actions `/app/alerts`
The intervention workflow (§6). Alert cards derived only from state: resource unavailable, crews without reachable rest, forecast stale/lost, offline, symptom escalation, plan outdated. Then the **Protection plan review** panel: per-crew actions in words, policy-check status ("Policy check passed — 10 safety rules"), expandable rule details, accept button (enabled only when the check passed and the plan is current).

### 5.7 Safety activity `/app/activity`
Reverse-chronological timeline with icons per event kind and the scenario clock. Footer line: "Audit trail integrity verified" (hash chain) — hashes themselves are not shown.

### 5.8 Worker app `/worker`
```
┌ AmanShift  [EN][عربي][हिं][اردو][বাং]  ┐
│ Your crew: [Concrete Pour ▾]          │
│ ┌──────────────────────────────────┐ │
│ │ ■ WORK / REST           (level 3) │ │
│ │ [clock pictogram] [shade]         │ │
│ │ Work 45 min, rest 15 min in       │ │
│ │ Central cooled rest cabin         │ │
│ │ English line (if other language)  │ │
│ └──────────────────────────────────┘ │
│ Next: rest at 10:45 · Water: Central  │
│ ┌ Feeling unwell? ──────────────────┐ │
│ │ Stop. Cool down. Tell supervisor.  │ │
│ │ Emergency 998 (UAE ambulance)      │ │
│ └──────────────────────────────────┘ │
│ Updated 10:30 · offline state · translation pending native review │
└──────────────────────────────────────┘
```
Rules: pictogram + level word + shape first; selected language line, English second; never names a resource that is not trusted-up (backend already falls back to STOP / "nearest shade"); offline banner and conservative levels from the degrader; 56 px touch targets; contrast ≥ 7:1 for the action line.

### 5.9 Demonstration `/demo`
A labelled environment ("Demonstration — historical weather, synthetic site"). Left: guided steps (Load 10:30 → Cooling cabin fails → Generate protection plan → Try keeping the old schedule → Network offline → Technical validation). Right: the live Overview, Alerts and Worksite components bound to the same session. Also: scenario controls (forecast stale/lost, onsite meter, restore + confirm, advance 15 min, reset). Every control calls the real API; nothing is prerecorded.

### 5.10 Help `/help`, `/help/validation`, `/help/method`
Validation report reads `eval/out/*.json` via `/api/v1/evaluation`: forecast skill vs baselines, property tests, checker mutation, planner benchmark, cost of safety, reference checks, reproducibility commands. Method: model chain, data sources, limitations.

## 6. Operational workflow — cooling resource fails

1. Resource R2 reported unavailable (Resources page, or demo control).
2. Backend re-evaluates: R2 loses trust → crews whose only rest edge was R2 lose it → kernel removes their work options → plan becomes outdated → approved actions that are no longer allowed fall back to STOP on worker cards.
3. UI: red attention banner "Central cooled rest cabin unavailable. 14 workers in 2 crews have no reachable rest area." Counts come from `coverage` and `crews[].rest_edges`; nothing is typed.
4. Alert card lists affected crews, what is no longer met ("no rest area within walking limit"), and why the current plan is inadequate ("plan was made before the outage").
5. **Generate protection plan** → `POST /plans`. Result shown in words per crew; `protection_insufficient` is stated plainly: "No adequate protection arrangement exists for Concrete Pour — the plan stops this task until rest is restored."
6. Policy check result shown; rule detail expandable. **Accept plan** requires a human click and is disabled unless the independent check passed and the plan matches the current conditions.
7. Restore: "Report restored" sets *unconfirmed*; only **Confirm on site** makes it trusted again.

The deliberately unsafe plan ("keep the old schedule") exists only in `/demo`.

## 7. Backend capability → UI mapping

| Backend | UI |
|---|---|
| `GET state` crews, `display_level`, `reasons`, `trace` | crew cards, drawer, overview tiles, worker card level |
| `site.display` (new: zone/crew/resource names) | every label; ids stay keys |
| `coverage.resources`, `edges`, `walk_min` | worksite map, resources page, consequence analysis |
| `banners` | attention banner + alert cards |
| `plan`, `checker`, `unsafe_check` | plan review, policy-check status, demo step 4 |
| `timeline.hours`, `midday_break`, `meters` | heat outlook chart |
| `log`, `chain_ok` | safety activity |
| `POST failures` resource_down | Resources "Report unavailable"; demo controls |
| `POST resources/{id}/confirm` | Resources "Confirm on site" |
| `POST plans`, `plans/{id}/approve` | Alerts "Generate" / "Accept" |
| `POST plans/check` keep_previous | demo only |
| `POST escalations` | crew drawer two-step symptom report |
| `GET cards`, `offline-pack` (+ `display`, `emergency_number`) | worker app, offline degrader |
| `GET evaluation` | technical validation |

## 8. Wording rules

- Policy check, not "approval": "Policy check passed (10 safety rules)", "Policy check failed: 3 rules".
- Never "safe", "cleared", "authorized", "you may work". Work actions read as limits: "Work up to 45 min per hour".
- Estimates are labelled "estimated WBGT (forecast)"; meter values "onsite reading"; missing data "not available — using conservative bound".
- Symptom guidance: "Stop. Cool down. Do not stay alone. Tell your supervisor. Emergency 998." Escalation closes only by the medic role.
- Translations remain marked "pending native review".

## 9. Acceptance criteria

1. Overview answers the four questions above the fold at 1440×900 and in the first two screens at 375×812.
2. No rule IDs, hashes, raw JSON, test names or unsafe-plan controls outside `/demo` and `/help`.
3. Cooling failure → banner, affected crews and worker counts derived from state; re-plan shows `protection insufficient` in words; old plan rejected in `/demo` with plain-language reasons.
4. Worker app: language switch works, Arabic/Urdu render RTL, no unavailable resource named, offline countdown visible, STOP-HOLD after expiry.
5. axe: no serious/critical violations on `/`, `/app`, `/app/alerts`, `/worker`, `/demo`, `/help/validation`.
6. No horizontal overflow at 320 px.
7. All backend tests, vitest and the updated Playwright suite pass; every number on screen traces to the API or `eval/out`.
