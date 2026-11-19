# STATUS — AmanShift

Updated: 2026-11-19 ~09:30 GST (implementation session). Phase: **M0–M7 engineering complete; human-only steps remain (public deploy account, video, dashboard requirements, submission form).**

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
- **SC1 Train years = 2024 only (not 2022–2024).** Open-Meteo Previous Runs returns null `*_previous_day1` RH, pressure, wind and radiation for 2022–2023 (only T exists; verified by direct query). Per T-DQ (≥ 90 % paired) those years are excluded and reported. δ and `clim_p99_raw` are derived from 2024 only (≈ 31 samples per month×hour cell, so p99 ≈ cell maximum — more conservative, not less). Holdouts unchanged: 2025 exposed, 2026 clean.
- **SC2 `day_evidence` merged into `env`.** The snapshot's `env` list carries the whole local day of forecast evidence plus meter readings; kernel and checker both read future hours from it for t*. Same information, one list.
- **SC3 Demo Site A has three water points (W1–W3), not two,** so every zone has water within the 5-min limit; crews sized 6–10 so the healthy plan fits capacity; the coveralls crew is the heavy direct-sun crew. Site designed before running the selection rule; selection then picked 2026-07-01 under the strict rule (levels 2/3/4; C2 and C5 rest only via R2).
- **SC4 Permitted work fractions are set-based** (a fraction is permitted iff it is feasible for that rest option and ≤ caps), which equals "f ≤ f_max" whenever feasibility is downward-closed and is safer otherwise. Checker C2 uses the same definition.
- **SC5 Forecast issue time** for `previous_day1` values is modelled as the D-1 12:00 UTC run (16:00 GST D-1); replay retrieval age is 30 min. Documented in `amanshift/scenario.py`.
- **SC6 Dwell in the demo API**: `prev_eval` = worst raw evaluation of the previous tick *and* earlier evaluations at the current tick, so restoring a resource within the same tick cannot relax levels; relaxation needs two 15-min ticks (time-advance control).
- **SC7 Unsafe-plan demo** re-submits the last approved actions bound to the *current* snapshot hash, so the rejection cites substantive rules (C4, C2, C6) rather than only C8.
- Node 26 used instead of Node 22 LTS (installed toolchain); Vite 8 / TypeScript 7.

## Implementation results (all from `make eval`, see eval/out/report.md)
- F19 verified: metabolic category bounds 180/300/415/520 kcal/h appear verbatim in docs/sources text (ACGIH, quoted by NIOSH); the 415–520 gap is in the source. Note: NIOSH Table 5-1 own column gives light < 200 kcal/h (233 W); policy keeps 208.8 W per frozen spec — flagged for OH review (U4).
- M3 gate passed 2026-11-19 ~09:15 GST: 10,000-case T-KER-01/02 + 2,000-case T-KER-03..06 + T-KER-07 + T-CHK-DIFF, 0 failures (eval/out/property_tests.json).
- δ = 0.5 °C (train 2024). Clean holdout 2026, primary profile (REF-SHADE, level ≥ 3): numbers in eval/out/forecast_eval.json and report.md. Events cover most work hours, so an "always work/rest" baseline is reported alongside.
- Checker plan-mutation: 0 safety-critical survivors (eval/out/checker_mutation.json).
- Planner bench: 0 checker violations for AmanShift greedy over 600 synthetic sites (eval/out/planner_bench.json).
- Cost of safety large under degraded information (eval/out/cost_of_safety.json) — disclosed, by design.

- UI (M6): S1, S2 (+S4 coverage, S5 trace drawer, S6 demo drawer, S8 checker), S9 cards (en/ar/hi/ur/bn, RTL), S10 offline banners, S11 evidence, S12 methodology. Judge mode `/command?judge=1`.
- Verification (M7): `make test` green (backend 97 tests incl. property suite; web vitest 6 incl. fast-check T-OFF-01..03); Playwright 6/6 (T-E2E-06 judging moment, T-UI-01 smoke, T-UI-02 RTL, T-UI-03 axe 0 serious/critical, 320 px no overflow, T-OFF-04) against local server and the Docker image `amanshift:1.0`; pip-audit and npm audit: 0 known vulnerabilities; banned-wording grep clean.

## Not done / human-only
- Public URL (Render/Fly) needs a hosting account → doc 08 §6 cut 6 applies until deployed: `make demo` + video. Image builds and passes E2E locally.
- 2-minute video, submission form, reading dashboard requirements (B1 second half), deadline hour (B2).
- P1 items not built: lexicographic MILP planner, S3 replay workspace, S7 plan comparison, mutmut code-mutation score, print-optimised A4 sheet (browser print of S9 works), audio clips.

## Current status
CONDITIONAL GO conditions 3–5 met (M3 gate passed early; F19 verified; all UI numbers from eval/out). Remaining conditions are human steps (B1 dashboard read, B2 deadline hour).
