# STATUS — AmanShift

Updated: 2026-11-19 (planning session). Phase: **Specification frozen; implementation not started.**

## Verified facts (with date and source)

| Fact | Source | Checked |
|---|---|---|
| Challenge 07 text matches our statement | hack2skill event page | 2026-11-19 |
| Registration closed 10 Nov ("Registration Closed" buttons) | event page | 2026-11-19 |
| Deadline "20 November"; **no hour or time zone published** | event page / FAQ | 2026-11-19 |
| Judging: health impact & clinical relevance; technical depth; working solution & demo; responsible AI, safety & data governance; scalability & deployment readiness; commercial viability & path to pilot (no weights) | event page | 2026-11-19 |
| Deliverable: working prototype + technical documentation + assumptions, dependencies, limitations; full requirements only on registered dashboard | FAQ | 2026-11-19 |
| Evaluation 20–30 Nov; top 3 present at GITEX 2026, 7–11 Dec; generic rules mention 7 min demo + 3 min Q&A | event page, T&C | 2026-11-19 |
| No organizer data; declare all sources; IP stays with team; organizer has 6-month right of first refusal + marketing licence (T&C) | FAQ, T&C | 2026-11-19 |
| Abu Dhabi heat code: ADOSH-SF CoP 11.0 v4.0 (15 Jul 2024) + Technical Guideline v4.0, ADPHC; TWL three zones (>140 / 115–140 / <115), no TWL stop-work zone | ADPHC PDFs | 2026-11-19 |
| NIOSH REL = 56.7 − 11.5 log10 M, RAL = 59.9 − 14.1 log10 M (M in W, 1-h TWA); clothing factors Table 3-2 | NIOSH 2016-106 text (saved `docs/sources/`) | 2026-11-19 |
| Midday break 12:30–15:00, 15 Jun–15 Sep 2026 | secondary news only | 2026-11-19 |
| "oshad.ae" now hosts an unrelated site — do not cite | research agent | 2026-11-19 |
| No product named "AmanShift" found (basic web search; not a trademark search) | web search | 2026-11-19 |

## Data-access results (disposable experiments, 2026-11-19)

- **Open-Meteo Previous Runs API:** `*_previous_day1` hourly variables return for 24.433 N, 54.651 E for July 2022, 2023, 2024 and Jun–Sep 2025 (2,928 h, 0 nulls for T, RH, surface pressure, wind, instantaneous shortwave and direct radiation). No key needed.
- **IEM OMAA METAR:** Jun–Sep 2025 one request → 3,035 rows; 2,927 on-the-hour pairs with forecast. Space requests ≥ 10 s.
- **thermofeel 2.3.0** (Apache-2.0) installs on Python 3.13/M4; provides `calculate_wbgt_liljegren(t2_k, rh, pressure, va, ssrd, fdir, cossza)`. No cos-zenith helper in 2.3.0 → use pvlib.
- **Smoke test (2025, in-sample, untuned, NOT a result):** forecast air-T daytime MAE ≈ 1.05 °C, bias ≈ −0.1 °C; forecast sun-WBGT estimate warmer than observation-based estimate by ≈ 1.3 °C (MAE ≈ 1.5 °C). Daytime observation-based sun estimate median ≈ 31.5 °C. Used only to confirm the pipeline works.

## Completed planning work
Docs 00–11, AGENTS.md, CLAUDE.md, README.md, this file. Five-perspective audit done: 9 P0 found and fixed, 3 P1 open (F18 NIOSH stricter than ADOSH, F19 metabolic values to verify, F20 native review).

## Blockers (must clear before/at implementation start)
- **B1** ~~Confirm registration~~ — user confirmed registered (2026-11-19 10:17 IST). Still to do: read the dashboard's full submission requirements and add them here.
- **B2** Confirm submission hour/time zone (ask support+fhdic@hack2skill.com). Until confirmed: submission-ready 2026-11-20 08:00 GST, submit by 12:00 GST.

## Outstanding decisions (defaults chosen; change only with reason)
- D1 Public host: Render vs Fly.io → whichever deploys first.
- D2 Optional TWL-primary mode → deferred (FUT, needs occupational-health review).
- D3 Native-speaker review of ar/hi/ur/bn strings → not available before deadline; strings marked "pending native review".

## Scientific uncertainties
- U1 NIOSH WBGT limits may be conservative for self-paced Gulf workers (Bates & Schneider 2008) → frequent level 3–4 in summer afternoons; cost reported.
- U2 Liljegren not validated against Gulf measurements; smoke test shows a warm forecast bias.
- U3 Shade estimate (diffuse-only radiation) is approximate.
- U4 `metabolic_rest_w = 105` and `very_heavy = 603.2 W` need occupational-health review.
- U5 Midday-break 2026 dates from secondary sources only.
- U6 Observation-based reference shares radiation terms with the forecast (REF-SUN partly circular; REF-SHADE less so).

## Spec changes
- 2026-11-19 pre-implementation audit amendments A1–A13 applied (doc 11 §4). Record every later deviation here with reason.

## Current status
CONDITIONAL GO (see doc 11). Next task: T0.1 (doc 08).
