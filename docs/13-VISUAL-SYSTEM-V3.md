# 13 — Visual System v3 and Workflow Consolidation

Status: adopted 2026-11-19. Refines doc 12: same audiences and safety rules, new visual language, fewer destinations, and the stale-plan presentation fix. Engine, checker, policy, offline degrader and evaluation unchanged.

## 1. Safety presentation fixes (done first)

| Problem seen in v1.1 | Fix | Regression test |
|---|---|---|
| After the cooling cabin failed, plan rows showed the old "work / rest at Central cooled rest cabin" next to the crew's new STOP badge, with a green "policy check passed" | A plan is **current** only while `plan.stale` is false. A stale plan is labelled "Previous plan — conditions changed", its instructions move into a collapsed, struck-through "historical, not in effect" list, its checker result reads "Checked against earlier conditions — not valid now" in neutral grey, and it cannot be acknowledged | `derive.test.ts` (isPlanCurrent), `judging.spec.ts` step 2 |
| Crew rows could show an outdated location | Crew instruction comes from `actionText`: if the accepted action is no longer allowed the text is "Stop work. No current plan protects this crew." — no resource named | `derive.test.ts` |
| Offline worker card kept naming the cached rest area after confirmations expired | After `confirmations_expire_after_min` offline, the worker card names no rest or water location | `worker.test.ts` |
| "Work stopped" implied observed adherence | "Stop work required"; recommended action is to *confirm on site* that the crew stopped | — |
| Hydration "every hour" contradicted NIOSH 2016-106 ("1 cup every 15–20 minutes") | All five languages updated; value and citation in `policy/worker-guidance-v1.json` | `guidance.test.ts` (golden, every language) |
| "Accept plan" read like approval to work | "Acknowledge plan — issues it to crews; not permission to work" | — |

## 2. Tokens (`web/src/styles/tokens.css`)

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#F7F8FC` | `#0B0F19` |
| `--surface` | `#FFFFFF` | `#111827` |
| `--surface-2` (subtle fill) | `#F1F5F9` | `#1A2233` |
| `--ink` | `#0F172A` | `#E5E7EB` |
| `--ink-2` | `#64748B` (AA on white for ≥14 px) → body uses `#475569` | `#94A3B8` |
| `--line` | `#E2E8F0` | `#1F2937` |
| `--accent` (primary, interactive) | `#4F46E5` | `#818CF8` |
| `--intel` (intelligence/teal) | `#0D9488` | `#2DD4BF` |
| `--crit` | `#DC2626` | `#F87171` |
| `--warn` | `#D97706` (text uses `#B45309` for AA) | `#FBBF24` |
| severity 1–4 | `#15803D`, `#D97706`, `#EA580C`, `#DC2626` + shape + word | lighter equivalents |

Radius 8 / 12 / 16. Elevation: `0 1px 2px rgb(15 23 42 / .04)` resting, `0 8px 24px rgb(15 23 42 / .08)` raised. Separators 1 px `--line`. Transitions 120–200 ms. Font: Inter Variable (self-hosted); IBM Plex Sans Arabic / Noto for scripts; IBM Plex Mono for times.

## 3. Navigation

Primary (left rail, light surface): **Overview · Worksite · Protection · Activity**.
Secondary (rail footer): Worker companion · Product tour · Help & documentation.
Top bar: site + shift time, forecast freshness, connectivity, language, theme.

Merged into **Protection**: Alerts & actions, Crew protection, Safety resources (all capabilities kept). Legacy URLs redirect: `/app/alerts`, `/app/crews`, `/app/resources` → `/app/protection`; `/demo`, `/command?judge=1` → `/tour`.

## 4. Screens

**Overview** — first viewport only:
```
Overview · Demo Site A · Wed 1 Jul · 10:30 GST · Forecast current · Online
┌ PROTECTION BRIEFING (intel panel) ─────────────────────────────┐
│ Central cooled rest cabin is down — 14 workers have no rest     │
│ • Affected: Concrete Pour, Site Logistics (2 crews)             │
│ • Why: heat limit requires rest; no other rest area in reach    │
│ • Protection: 2 of 3 rest areas available, 32 places confirmed  │
│ • Next: generate and acknowledge a new protection plan          │
│                                    [Review in Protection →]     │
└─────────────────────────────────────────────────────────────────┘
[Need intervention 20/42] [Crews protected 4/6] [Confirmed rest places 32]
┌ Worksite map (60%) ───────────────┐ ┌ Priority actions (top 5) ─┐
└───────────────────────────────────┘ └───────────────────────────┘
▸ Today's heat outlook (collapsed)
```
The briefing is assembled by `briefing()` in `site/derive.ts` from server state — deterministic, no language model.

**Worksite** — full-bleed overhead schematic: site boundary, building footprints per zone, access road and internal paths with walk times, resource pins (shade, cooled cabin, water) with capacity, crew markers at zone level, lost-protection links. Layer toggles: Crews · Resources · Protection links. Hover tooltip; selection opens a right drawer. Synthetic disclosure stays on the map.

**Protection** — decision workspace with four tabs:
1. *Interventions* — immediate interventions and coverage gaps, each with reason and next step; upcoming risk (hours where the site level rises, midday break).
2. *Plan* — current (acknowledged) vs proposed per crew, unresolved gaps, policy-check result, **Acknowledge plan**; rule detail in an evidence drawer.
3. *Resources* — dependencies, capacity, confirmation age, consequence of loss, Confirm on site / Report unavailable / Report repaired.
4. *Crews* — every crew with level, action and reasoning; crew drawer with the trace and symptom report.

**Activity** — unchanged content, new styling.

**Product tour** (`/tour`) — the real Overview with one compact scenario bar at the bottom: chapter title, one-line context, one action button, step dots. Chapters: Morning protection outlook → Cooling facility outage → Affected crews identified → Revised protective action → Unsafe previous arrangement rejected → Connectivity failure and conservative fallback. Advanced failure controls sit in a scenario drawer. Every chapter calls the real API.

**Website** (`/`) — licensed Gulf construction photography (Pexels / Unsplash, attributions in `web/public/img/ATTRIBUTION.md`), one dominant CTA, a product preview built from real components, four sections: Anticipate risk · Coordinate protection · Respond when systems fail · Protect without surveillance. Technical validation only in footer/resources.

**Worker companion** (`/worker`) — unchanged structure, new tokens; current action without scrolling.

## 5. Acceptance

Doc 12 §9 criteria still apply, plus: no stale plan row or green check visible after a resource failure; four primary destinations; briefing text derived only from state; photography attributed; Playwright suite green.
