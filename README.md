# AmanShift

**Protection must never weaken when information disappears.**

Crew-level heat-protection decision support for outdoor workers in Abu Dhabi — an entry to Challenge 07 (Climate-Resilient Worker Health) of the Future Health Digital Innovation Challenge 2026.

AmanShift combines real day-ahead weather forecasts, onsite WBGT/TWL meter readings, crew workload, clothing and acclimatization, and the actual availability of shade, cooled rest and water. It produces four graded levels with one action each, in English, Arabic, Hindi, Urdu and Bengali. Its defining property is tested: when forecasts go stale, cooling fails or the network drops, recommendations can only become stricter. A separately implemented rule checker rejects unsafe plans. It collects no personal, biometric or location data. **It is decision support, not diagnosis or work authorization.**

## Quick start

Requirements: Docker — or Python 3.12 + [uv](https://docs.astral.sh/uv/) and Node 22+.

```bash
make demo
```

Then open http://localhost:8080 (works offline: data and evaluation artifacts are committed).

Without Docker:

```bash
make setup
```

```bash
make serve
```

## Product map

| Where | For | What |
|---|---|---|
| `/` | everyone | Product website: the problem, how it works, failure resilience, privacy |
| `/app` | site supervisor | Safety Command Center: overview, worksite map, crew protection, safety resources, alerts & actions, safety activity |
| `/worker` | crews | Mobile worker app: one protective action, pictograms first, five languages, offline |
| `/demo` | judges | Live failure-resilience demonstration with scenario controls |
| `/help` | judges, auditors | Method, limitations and the technical validation report (`eval/out`) |

## Judge guide (about 2 minutes)

Open **`/demo`** (the old `/command?judge=1` redirects there). Each guided step calls the real engine, planner, policy checker and offline logic.

| Step | What you do | What you should see |
|---|---|---|
| 1 | Load scenario | Real Abu Dhabi morning, 1 July 2026, 10:30 GST; crews at different levels; plan passes the policy check (10 safety rules) |
| 2 | Cooling cabin fails | "Central cooled rest cabin unavailable — 14 workers in 2 crews (Concrete Pour, Site Logistics) now have no rest area"; lost protection drawn red on the map |
| 3 | Generate plan | The planner stops what it cannot protect: "No adequate protection arrangement exists for Concrete Pour, Site Logistics"; policy check passes |
| 4 | Submit old schedule | The earlier plan, re-submitted unchanged, is rejected by the policy check with plain-language reasons and rule references |
| 5 | Go offline | Offline banner and countdown to STOP-HOLD; levels never drop. Open **Worker app**, pick বাংলা or العربية |
| 6 | Open technical validation | Property tests, checker mutation, forecast skill vs baselines, planner benchmark, cost of safety — all loaded from `eval/out/*.json` |

Select any crew for the plain-language reasoning, the full computation trace ("How this was determined") and the two-step symptom report. Select any resource on the worksite map for capacity, last on-site confirmation, dependants and the consequence of losing it. More scenario controls: forecast stale/lost, onsite meter entry, repair + physical confirmation, 15-minute dwell tick, reset.

## What is real and what is synthetic

| Item | Type |
|---|---|
| Abu Dhabi weather — Open-Meteo Previous Runs day-ahead forecasts (CC BY 4.0) | REAL (HIST-FCST) |
| Abu Dhabi airport observations — IEM ASOS OMAA | REAL (REAL-OBS) |
| Demo Site A — crews, resources, walk times | SYNTHETIC (SIM-SITE) |
| Property tests, mutants, benchmark sites | SYNTHETIC (SYNTH-TEST) |
| Health outcomes, worksite accuracy, translation comprehension | NOT VALIDATED |

## Evidence

Every number shown in the UI, the video or the submission is produced by `make eval` into [`eval/out/`](eval/out/) and summarised in [`eval/out/report.md`](eval/out/report.md). Nothing is typed by hand.

```bash
make test    # ruff, mypy (strict on engine + checker), pytest incl. hypothesis, vitest
```

```bash
make eval    # regenerates eval/out/*.json and report.md (about 5 minutes)
```

```bash
make e2e     # Playwright judging moment, axe, RTL, 320 px, offline (server must be running)
```

## Architecture in one paragraph

Python (FastAPI) is the single source of truth: `amanshift/screening` (thermofeel Liljegren + pvlib) → `engine/risk.py` (NIOSH REL/RAL, ADOSH TWL zones, midday break) → `engine/coverage.py` (only trusted-up resources create edges) → `engine/kernel.py` (permitted actions from worst-case bounds, dwell, defer) → `engine/planner.py` (deterministic greedy) → `amanshift_checker/` (separate package, no imports from `amanshift`, ten declarative rules). Every threshold lives in [`policy/abudhabi-heat-v1.json`](policy/abudhabi-heat-v1.json) with a citation and a golden test. The React PWA holds one piece of logic: an offline degrader that can only take maxima of server-computed levels. Events go to a hash-chained SQLite log.

## Documentation

| Doc | Content |
|---|---|
| [LIMITATIONS.md](LIMITATIONS.md) | Assumptions, dependencies, limitations (official deliverable) |
| [data/SOURCES.md](data/SOURCES.md) | Datasets and licences |
| [STATUS.md](STATUS.md) | Facts, results, spec changes |
| [docs/12](docs/12-PRODUCT-EXPERIENCE-REDESIGN.md) | Product experience redesign: information architecture, design system, workflows |
| [docs/00–11](docs/) | Charter, requirements, science & safety, architecture, UI, decision engine, validation, responsible design, plan, demo, traceability, audit |
| [AGENTS.md](AGENTS.md) | Binding instructions for coding agents |

## Licence

Our code: MIT ([LICENSE](LICENSE)). Third-party: thermofeel (Apache-2.0), pvlib (BSD-3), FastAPI (MIT), React (MIT), IBM Plex and Noto fonts (OFL-1.1). Data: Open-Meteo (CC BY 4.0), Iowa Environmental Mesonet. NIOSH 2016-106 is public domain.
