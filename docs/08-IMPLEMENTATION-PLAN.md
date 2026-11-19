# 08 — Implementation Plan

Status: FROZEN v1.0. Clock: planning finished 2026-11-19 ~09:30 GST. Target **submission-ready 2026-11-20 08:00 GST**, submit by 12:00 GST (deadline hour unpublished). Engineering budget ≈ 20 h including tests; buffer 4 h.

## 1. Repository structure

Repository root = this project folder (it currently holds the docs; run `git init` at T0.1).

```
<repo root>/
  AGENTS.md  CLAUDE.md  README.md  STATUS.md  Makefile  docker-compose.yml  Dockerfile
  policy/abudhabi-heat-v1.json         # single policy file, cited values
  data/SOURCES.md  data/cache/         # cached real data (small), licences
  data/scenarios/                      # demo scenarios (SIM-SITE + real weather)
  backend/
    pyproject.toml  uv.lock
    amanshift/{data,screening,policy,engine,api,store}/
    amanshift_checker/                 # independent package
    eval/                              # evaluation scripts → eval/out/
    tests/{unit,property,golden,integration}/
  web/
    package.json  package-lock.json  vite.config.ts
    src/{screens,components,i18n,offline,api}/
    tests/{unit,e2e}/
  eval/out/                            # generated, committed for judges
  docs/
```

## 2. Stack (pin exact versions in lockfiles at T0.1)

Backend: Python 3.12, `uv`, FastAPI, Uvicorn, pydantic v2, numpy, pandas, scipy, `thermofeel==2.3.0` (Apache-2.0, verified installable 2026-11-19), pvlib (BSD-3), httpx, pytest, hypothesis, ruff, mypy (strict on `engine/` and `amanshift_checker/`), pip-audit. Optional P1: mutmut.

Frontend: Node 22 LTS, React 18, TypeScript (strict), Vite, vite-plugin-pwa (Workbox), `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-sans-arabic`, `@fontsource/ibm-plex-mono`, `@fontsource/noto-sans-devanagari`, `@fontsource/noto-sans-bengali`, `@fontsource/noto-naskh-arabic`, `idb-keyval`, vitest, fast-check, Playwright, `@axe-core/playwright`. No UI kit, no chart library (hand-written SVG, ≤ 2 chart types).

Deploy: Docker (python:3.12-slim multi-stage with node build), Render or Fly.io free tier.

## 3. Milestones (vertical slices) and tasks

Effort in hours (h). Times are GST targets.

### M0 Foundations — 1.5 h — by 11:30
| ID | Task | h | Dep |
|---|---|---|---|
| T0.1 | Repo skeleton, uv + npm init, lockfiles, Makefile, ruff/mypy/vitest configs, CI-free `make test` | 0.5 | — |
| T0.2 | `policy/abudhabi-heat-v1.json` with every value + citation from doc 02 §4; pydantic loader; golden tests T-REF-02/03 | 0.5 | T0.1 |
| T0.3 | `data/` fetchers + file cache + manifest; fetch 2022–2026 Jun–Sep (IEM one request/year, 10 s sleep) | 0.5 | T0.1 |
**Exit:** `make test` green on golden tests; caches present with manifest.

### M1 Screening — 1.5 h — by 13:00
| T1.1 | pvlib solar geometry; thermofeel Liljegren wrapper → `wbgt_sun`, `wbgt_shade` (diffuse-only); T-REF-01, T-REF-04 | 1.0 | T0.3 |
| T1.2 | Climatology p99 table (month × hour, 2022–2024 obs-based REF-SUN) for fallback bound | 0.5 | T1.1 |
**Exit:** hourly estimates for any cached day; reference tests pass.

### M2 Risk + coverage — 2 h — by 15:00
| T2.1 | `risk.py`: effective WBGT, limit, work-fraction search, level, midday ban, TWL zone mapping, reason codes | 1.0 | T0.2, T1.1 |
| T2.2 | `coverage.py`: graph, edges, coverage result | 0.5 | T0.2 |
| T2.3 | Demo scenario S-AUH-1: synthetic site (6 crews, 6 resources, 3 zones) on the selected real day (rule doc 09 §4) | 0.5 | T1.1 |
**Exit:** unit tests for worked examples doc 05 §10 pass.

### M3 Kernel + checker (critical) — 3 h — by 18:00 (GO gate 22:00)
| T3.1 | `kernel.py`: trust/freshness, uncertainty sets, worst-case bound, permitted actions, dwell/recovery, escalation | 1.25 | M2 |
| T3.2 | `amanshift_checker`: own policy parser, rules C1–C11, citations; T-IND-01 | 1.0 | T0.2 |
| T3.3 | Property tests T-KER-01..03, 05, 06 | 0.75 | T3.1 |
**Exit:** 10,000-case property run 0 failures; checker unit tests per rule (pass + fail case each).

### M4 Planner + API + log — 2 h — by 20:00
| T4.1 | `planner.py` deterministic greedy + infeasibility status + T-KER-04, T-KER-07 (MILP = P1, after M7) | 0.5 | M3 |
| T4.2 | FastAPI routes doc 03 §7, envelope, failure injection, offline-pack, per-session demo state + reset | 1.0 | T4.1 |
| T4.3 | SQLite hash-chained log; T-SEC-01, T-SEC-04 | 0.5 | T4.2 |
**Exit:** `curl` script runs judging moment steps 1–4 against local API.

### M5 Evaluation — 1.5 h (runs largely in background) — by 21:30
| T5.1 | `eval/forecast_eval.py` with leakage guard, baselines, bootstrap | 0.75 | M1, T2.1 |
| T5.2 | `eval/checker_mutation.py`, `planner_bench.py`, `cost_of_safety.py`, `property_report.py`, `report.md` generator | 0.75 | M4 |
**Exit:** all `eval/out/*.json` generated; numbers recorded in STATUS.md with data-type labels.

### M6 Interface — 5 h — by 02:30 (20 Nov)
| T6.1 | Vite app, tokens, fonts, i18n scaffold (5 languages, RTL), LevelBadge, ProvenanceChip | 0.75 | — |
| T6.2 | S2 command center with S4 coverage SVG, S6 demo drawer, plan bar, S8 checker panel | 2.0 | M4 |
| T6.3 | S9 worker cards (+ S5 drawer lite) | 0.5 | T6.2 |
| T6.4 | Offline: service worker, offline pack, `offline-degrader.ts`, S10 banners, T-OFF-01..03 | 0.75 | T4.2 |
| T6.5 | S11 evidence (reads eval/out), S12 methodology, S1 intro (text) | 0.75 | M5 |
| T6.6 | (P1) S7 plan comparison; P0 unsafe-plan button lives in S2/S8 | 0.25 | T6.2 |
**Exit:** judging moment works in the browser end to end.

### M7 Hardening, deploy, submission — 3 h — by 05:30, buffer to 08:00
| T7.1 | Playwright E2E incl. T-E2E-06, axe, RTL snapshots | 0.75 | M6 |
| T7.2 | Docker image, deploy public, `make demo` verified from clean clone | 0.75 | M6 |
| T7.3 | README (run/judge guide), assumptions/dependencies/limitations page, docs sync, STATUS | 0.5 | all |
| T7.4 | Screenshots (doc 09 §8), 2-min video, submission form | 1.0 | T7.2 |
**Exit:** release checklist doc 10 §3 all ticked.

## 4. Critical path
T0.1 → T0.2 → T1.1 → T2.1 → T3.1 → T4.1 → T4.2 → T6.2 → T7.1 → T7.2 → T7.4. Checker (T3.2) and evaluation (M5) run in parallel branches; the UI shell (T6.1) can start any time.

## 5. Integration checkpoints
IC1 after M2: worked examples reproduce by hand. IC2 after M4: curl judging moment. IC3 after T6.2: browser judging moment. IC4 after T7.2: judging moment on public URL.

## 6. Scope cuts (apply in order when a milestone is > 1 h late)
1. S3 replay workspace → static chart in S11 only.
2. S7 → unsafe-plan button lives in S8 only.
3. FR-OFF-02 local confirmation offline, print sheet.
4. Bootstrap CIs → report point estimates + daily counts.
5. Planner optimal assignment → greedy + checker (still 0 violations required).
6. Public deploy → local `make demo` + recorded video (state this in submission).
Never cut: policy golden tests, kernel property tests, checker, offline degrader, limitations page.

## 7. Deployment and reproducibility
`make demo` must work from a clean clone with no network (cached data, built assets). Public deploy uses the same image. The README lists exact commands, Python/Node versions and expected runtime of `make eval` (< 10 min).
