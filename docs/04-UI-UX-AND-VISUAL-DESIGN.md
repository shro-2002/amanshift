# 04 — UI/UX and Visual Design

> **2026-11-19:** screen inventory and navigation (§3–§6) superseded by [doc 12](12-PRODUCT-EXPERIENCE-REDESIGN.md). Severity tokens, accessibility rules, banned words and worker-card rules below remain binding.

Status: FROZEN v1.0. The implementation session builds exactly this. Where time runs out, follow the cut order in §8.

## 1. Design direction

**"Control-room calm."** A safety instrument, not a dashboard. Paper-warm neutrals, one deep-teal brand colour, severity colours used only for severity. Dense but quiet: typographic hierarchy over boxes, hairline rules over shadows, no gradients, no glowing charts, no stock illustrations, no AI sparkle iconography.

Communicates: **trust** (provenance on every number), **safety** (the most restrictive state is always the most visible), **scientific credibility** (methods and limits one click away), **worker dignity** (crews, never individuals; no surveillance imagery), **UAE relevance** (Arabic is first-class, not translated afterwards; midday-ban window drawn on every timeline).

Provisional logo: wordmark "AmanShift" in IBM Plex Sans SemiBold, with أمان set in IBM Plex Sans Arabic beneath at 60 % size. Mark: a shield outline whose lower half is a horizontal bar chart of four stepped levels (tightening = taller). Monochrome only; brand teal on light, paper on dark.

## 2. Tokens

```css
:root {
  /* neutrals */
  --bg:#F6F4EF; --surface:#FFFFFF; --surface-2:#EFECE4; --line:#D9D4C7;
  --ink:#1B1F23; --ink-2:#4A5159; --ink-3:#6B7280;
  /* brand */
  --brand:#0F5257; --brand-ink:#FFFFFF; --focus:#1D4ED8;
  /* severity (fill / text-on-fill) */
  --sev-1:#1F7A4D; --sev-1-ink:#FFFFFF;   /* STANDARD   */
  --sev-2:#E3B341; --sev-2-ink:#1B1F23;   /* INCREASED  */
  --sev-3:#C2410C; --sev-3-ink:#FFFFFF;   /* WORK/REST  */
  --sev-4:#B42318; --sev-4-ink:#FFFFFF;   /* STOP       */
  --degraded-hatch: repeating-linear-gradient(135deg, transparent 0 6px, rgba(27,31,35,.18) 6px 8px);
  /* type */
  --font-latin:"IBM Plex Sans",system-ui,sans-serif;
  --font-ar:"IBM Plex Sans Arabic","Noto Naskh Arabic",sans-serif;
  --font-ur:"Noto Naskh Arabic",sans-serif;
  --font-hi:"Noto Sans Devanagari",sans-serif;
  --font-bn:"Noto Sans Bengali",sans-serif;
  --font-mono:"IBM Plex Mono",ui-monospace,monospace;
  --t-12:.75rem; --t-14:.875rem; --t-16:1rem; --t-20:1.25rem; --t-24:1.5rem; --t-32:2rem; --t-44:2.75rem;
  /* space (4-pt) */ --s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px; --s-6:24px; --s-8:32px; --s-12:48px;
  --radius-sm:4px; --radius-md:8px;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg:#111416; --surface:#181C1F; --surface-2:#20262A; --line:#2E363B;
  --ink:#ECEAE4; --ink-2:#B6BCC2; --ink-3:#8B939A; --brand:#5FB3B3; --brand-ink:#0B1214;
  --sev-1:#3FA370; --sev-2:#E8C25B; --sev-3:#E8692E; --sev-4:#E5484D;
  --sev-1-ink:#0B1214; --sev-2-ink:#0B1214; --sev-3-ink:#0B1214; --sev-4-ink:#0B1214; } }
:root[data-theme="dark"] { /* same values as the media block */ }
```

All severity text/fill pairs must pass 4.5:1 (checked by axe in CI, T-UI-03). Fonts self-hosted via `@fontsource/*` so offline works.

## 3. Severity semantics (never colour alone)

| Level | Name (en) | Arabic | Shape | Fill | Default action pictogram |
|---|---|---|---|---|---|
| 1 | STANDARD | عادي | ● circle | --sev-1 | water cup |
| 2 | INCREASED CARE | حذر | ▲ triangle | --sev-2 | water cup ×2 + person-in-shade |
| 3 | WORK / REST | عمل / راحة | ◆ diamond | --sev-3 | clock split + shade |
| 4 | STOP | توقّف | ⬢ octagon | --sev-4 | hand + shade + phone |

- Every level badge = shape + number + word. Numbers are Western Arabic digits in all languages (field readability; decision recorded, pending native review).
- **Degraded/conservative** state overlays the hatch pattern and a tag `CONSERVATIVE — data degraded` (shape: dashed outline). It never changes the level colour to something calmer.
- **Clinical escalation** is not a level: a full-width banner with a red cross-free medical symbol (⚕) and the site emergency number.
- Provenance chip styles: measured = solid border; forecast = outlined; derived = dotted; fallback = dashed + hatch.

## 4. Layout, responsiveness, accessibility, RTL, multilingual

- Grid: 12 columns desktop (≥1280), 8 tablet (768–1279), 4 mobile (<768). Gutter 16 px; page side gutter 16 px mobile / 32 px desktop. No horizontal page scroll at 320 px.
- Touch targets ≥ 44×44 px (≥ 56 px on worker cards for gloved use).
- WCAG 2.2 AA: keyboard reachable in logical order, visible focus ring (`--focus`, 2 px, 3:1), `aria-live="polite"` for level changes, `aria-live="assertive"` only for STOP and escalation, Escape closes drawers, `prefers-reduced-motion` disables the only animation (level-change pulse, 300 ms).
- RTL: `dir="rtl"` on `<html>` for ar/ur; layout uses logical properties (`margin-inline-start`). Timelines keep time flowing left→right in all languages (numeric axis convention; decision logged, pending native review); text and panels mirror.
- Languages P0: English, Arabic, Hindi, Urdu, Bengali, all marked `pending native review` in the footer and on every worker card. Strings live in `web/src/i18n/*.json`; only fixed vetted strings appear on worker cards (no machine translation at runtime).
- Low literacy: each worker card leads with pictogram + shape + number; text is ≤ 8 words; optional audio button plays a pre-recorded clip (P1; only if native-reviewed clips exist, else hidden).

## 5. Information architecture

```
/                 S1 Introduction
/command          S2 Supervisor Command Center  ← primary demo screen
   ├ drawer       S5 Crew detail
   ├ panel        S4 Coverage map (embedded, also /coverage full-screen)
   ├ panel        S6 Failure injection (demo mode only)
   ├ drawer       S7 Plan comparison / replanning
   └ drawer       S8 Checker evidence
/forecast         S3 Forecast & replay workspace
/cards            S9 Worker alert cards (mobile, shared crew screen)
/offline          S10 Offline / stale / degraded states (also rendered in place)
/evidence         S11 Evaluation & benchmark evidence
/method           S12 Methodology & limitations
```

## 6. Screens

Common states: **Loading** = skeleton rows with fixed heights (no layout shift); **Error** = inline message with code + "retry" + "last good data from HH:MM" if any; **Empty** = one sentence + primary action.

### S2 — Supervisor Command Center (primary demo screen)

Purpose: in one view, show each crew's level, whether it is protected, what to do now, and why. User: site supervisor/HSE officer.

Desktop wireframe (1440×900):

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ AmanShift · Site: Demo Site A (synthetic) · Abu Dhabi       14:05 GST ▸ replay 2025-08-xx │
│ [● Online] Forecast: Open-Meteo run 06:00 · age 2h ◻ │ Policy abudhabi-heat-v1 │ EN ▾ │ ☾ │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ SITE STATUS  ⬢ 2 crews STOP · ◆ 3 WORK/REST · ▲ 1 · ● 0      Coverage 4/6 crews covered  │
│ ⚠ Insufficient protection capacity: cooled rest R2 DOWN 13:52 (injected)        [Re-plan] │
├───────────────────────────────────────────────┬──────────────────────────────────────────┤
│ CREWS (sorted by level desc, then id)          │ COVERAGE (site schematic, zones)          │
│ ┌──────┬──────┬─────────────┬──────┬────────┐  │   Z1 ──3min── Z2 ──5min── Z3              │
│ │Crew  │Level │Now          │Cover │Why     │  │   [C1][C2]   [R1 shade 20]  [C4]          │
│ │C2 ×8 │⬢4 STOP│Stop, go R3 │ ✗    │R2 down │  │   [W1 water] [R2 cool ✗DOWN] [R3 shade]   │
│ │C4 ×6 │⬢4 STOP│Stop        │ ✗    │no rest │  │   lines: solid=covered edge,             │
│ │C1 ×10│◆3 W/R │30/30, R1   │ ✓    │WBGTe…  │  │          dashed red=lost edge            │
│ │…     │      │             │      │        │  │                                          │
│ └──────┴──────┴─────────────┴──────┴────────┘  │                                          │
├───────────────────────────────────────────────┴──────────────────────────────────────────┤
│ TIMELINE 06:00 ─────────[midday ban 12:30–15:00 hatched]──────── 18:00   ▲ now            │
│ site max level strip ●●▲▲◆◆⬢⬢⬢◆◆▲   estimated WBGT sun/shade lines, meter points ◇        │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ PLAN p-7f3a ✓ APPROVED chk-1.0 (10/10)  [Approve] [Submit unsafe plan] [Evidence] [Cards]  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
 Demo drawer (toggle "Demo controls", right edge): S6 failure injection
```

- Hierarchy: (1) site status line with count per level and coverage ratio; (2) blocking banner if any crew is uncovered or the checker rejected; (3) crew table; (4) coverage schematic; (5) timeline; (6) plan bar.
- Crew row columns: crew id + size, level badge, "Now" instruction (≤ 6 words), coverage ✓/✗ with resource ids, top reason code. Row click → S5. Rows with degraded inputs show hatch + CONSERVATIVE tag.
- Row overflow menu: **Report symptoms in this crew** (two-step confirm; also on S9).
- Interactions: primary = **Re-plan** (enabled when snapshot changed since last plan); secondary = Compare plans (S7), Evidence (S8), Cards (S9), language, theme, time scrub (replay only).
- Mobile (<768): status line → banner → crew list as cards → coverage collapsed into "Coverage 4/6 ▸" → plan bar sticky bottom. Timeline becomes a horizontal level strip only.
- States: loading skeleton; empty "Load a scenario" button; API error keeps last snapshot with hatch and "showing data from HH:MM"; success shows plan bar green check.
- Acceptance (AC-S2-*): 1) level change is announced via aria-live within 1 s of a new snapshot; 2) killing R2 in S6 updates coverage and banner without page reload; 3) every numeric value has a provenance chip on hover/focus; 4) no element below 4.5:1; 5) renders at 320 px without horizontal scroll; 6) no individual worker names, locations or biometrics appear anywhere.

### S1 — Introduction
Purpose: 20-second orientation for judges. Layout: left column headline "Protection must never weaken when information disappears.", 3 numbered claims (crew screening; coverage graph; fail-safe kernel + independent checker), button **Open demo site** (→ /command, loads scenario) and **See the evidence** (→ /evidence). Right column: static annotated screenshot of S2. Footer: "Decision support, not diagnosis or work authorization. Synthetic site, real Abu Dhabi weather." Acceptance: loads in < 1.5 s; both buttons keyboard reachable.

### S3 — Forecast & replay workspace
Purpose: show the environmental basis. Layout: scenario selector (date list with provenance), chart of estimated WBGT sun and shade (lines), forecast vs observed-derived (when replaying history), midday-ban hatch, level thresholds per workload as horizontal reference lines (labelled "NIOSH REL, moderate work"), table of hourly values with provenance. Interaction: play/pause replay at 1 h per 3 s, scrub. Acceptance: chart has a data table alternative; thresholds labelled with source.

### S4 — Coverage visualization
SVG schematic of zones (rectangles), crews (rounded chips with level shape), resources (icons: shade awning, snowflake-free "cooled" room icon, water drop) with capacity "12/20". Edges: solid = assigned; thin grey = available; dashed red = lost due to failure. Legend always visible. No map tiles, no GPS. Acceptance: colour-blind safe (edge state also by dash pattern); text list alternative below.

### S5 — Crew detail drawer
Content: crew attributes (size, workload, PPE, acclimatization, exposure); computation trace: estimated WBGT → +clothing adjustment → effective WBGT → limit (REL or RAL) → max work fraction → level; active floors (staleness, midday ban, meter, TWL); permitted actions list; assigned resources; "Report symptoms in this crew" button (→ escalation confirm dialog). No individual data fields exist. Acceptance: trace numbers match API exactly; escalation needs a two-step confirm.

### S6 — Failure injection (demo mode)
Toggle-able drawer with buttons: **Cooling R2 fails**, **Shade R1 fails**, **Forecast goes stale (+4 h)**, **Forecast feed lost**, **Network offline (client)**, **Meter reads 34.5 °C at Z2**, **Restore all**. Each shows what changed in a log list. Visible label "Demo controls — simulated failures". Acceptance: each button produces a new snapshot and logged `failure_injected` event.

### S7 — Plan comparison / replanning
Two or three columns: Current plan, Proposed plan, (optional) Unsafe example "Keep working as scheduled". Rows per crew: action, work fraction, resources, walk minutes. Footer metrics: unprotected weighted persons, crews stopped, walk minutes, checker verdict. Buttons: **Approve** (only if checker approved), **Submit unsafe plan to checker** (demo). Acceptance: Approve disabled with tooltip when rejected.

### S8 — Checker evidence panel
List of 10 active rules (C1–C6, C8, C10–C12) with ✓/✗, per-violation message, crew id, citation (doc + policy key + source). Shows checker version, snapshot hash, policy version, time. "Why independent?" expandable text. Acceptance: rejected plan shows at least one violation with citation; rules are listed even when all pass.

### S9 — Worker alert cards (mobile / shared screen / print)
```
┌──────────────────────────┐
│ CREW C2      ⬢ 4  STOP   │  ← shape+number+word, 56px
│ [hand][shade][phone]     │  ← pictograms
│ توقّف. اذهب إلى الظل R3   │  ← ≤8 words, selected language
│ Stop. Go to shade R3.    │  ← English always second line
│ Drink water. Tell        │
│ supervisor if unwell.    │
│ ── until 14:30 · updated │
│    14:05 · ◻ forecast    │
│ [Language ▾] [Print]     │
│ pending native review    │
└──────────────────────────┘
```
Swipe/arrow between crews. Print view: A4 sheet with all crews for the next 6 hours (paper fallback). Acceptance: readable at arm's length (level word ≥ 32 px); works offline; RTL correct for ar/ur.

### S10 — Offline, stale and degraded states
Banner variants (top, full width, hatch):
- Stale (> 60 min since pack): "Offline 1 h 12 m — showing conservative levels until reconnected."
- Expired (> 3 h): "Offline plan expired — STOP-HOLD: shade, water, contact supervisor."
- Forecast fallback: "Forecast unavailable — using conservative seasonal maximum."
Crew levels show cached level → displayed level ("◆3 → ⬢4") with reason. Local confirmation button per resource marked "will sync". Acceptance: toggling network off in DevTools shows banner within 5 s; displayed level never below cached level (property-tested).

### S11 — Evaluation & evidence
Sections, each with a data-type badge (REAL OBSERVATIONS / HISTORICAL FORECASTS / SIMULATED SITE / SYNTHETIC TESTS / NOT VALIDATED): reference-value reproduction table; forecast warning skill table (holdout years, POD/FAR/CSI, baselines) and reliability chart; fail-safe property test counts; checker mutation-kill table; planner benchmark table; cost-of-safety; "Not validated" list. Each table links to the artifact file and the command that regenerates it. Acceptance: numbers are loaded from `eval/out/*.json`, never typed into the UI.

### S12 — Methodology & limitations
Plain-language explanation of: estimated vs measured WBGT, TWL handling, NIOSH limits, levels, fail-safe property (with the formula), checker independence and its limit, what is synthetic, what is not validated, governance rules. Acceptance: reachable from every screen footer; ≤ 1,200 words.

## 7. Components
LevelBadge(level, degraded, size) · ProvenanceChip(provenance) · CrewRow · CoverageGraph(svg) · Timeline(levels, wbgt, banWindow) · PlanTable · RuleList · Banner(kind) · WorkerCard · LanguageSwitcher · DemoDrawer. Buttons: primary filled brand; secondary outlined; destructive (escalation) filled sev-4 with confirm. Hover: 4 % ink overlay; active: 8 %; focus ring always.

## 8. Cut order if time runs short
Keep S2 (+S4, S6, S8 embedded, with Approve / Submit unsafe plan / escalation), S9 (with escalation button), S10, S11, S12. S1 text-only, S3 and S7 are P1 from the start. Cut further in this order: S3 replay animation (keep static chart) → S7 third column → S1 screenshot (text only) → dark mode → audio → print view (keep on-screen cards).
