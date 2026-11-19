# AmanShift

**Protection must never weaken when information disappears.**

Crew-level heat-protection decision support for outdoor workers in Abu Dhabi — an entry to Challenge 07 (Climate-Resilient Worker Health) of the Future Health Digital Innovation Challenge 2026.

AmanShift combines real day-ahead weather forecasts, onsite WBGT/TWL meter readings, crew workload, clothing and acclimatization, and the actual availability of shade, cooled rest and water. It produces four graded levels with one action each, in English, Arabic, Hindi, Urdu and Bengali. Its defining property is tested: when forecasts go stale, cooling fails or the network drops, recommendations can only become stricter. A separately implemented rule checker rejects unsafe plans. It collects no personal, biometric or location data. **It is decision support, not diagnosis or work authorization.**

**Try it now (no login):** [Live demo](https://amanshift.onrender.com) · [Judge tour, about 2 min](https://amanshift.onrender.com/tour) · [Technical validation](https://amanshift.onrender.com/help/validation) · Demo video (2:42): VIDEO LINK PENDING UPLOAD · [Submission summary](SUBMISSION.md) · [Evaluation report](eval/out/report.md) · [Limitations](LIMITATIONS.md)

The free Render instance sleeps when idle; the first load can take 30–60 s.

## Key results

| Result | Value | Type |
|---|---|---|
| Day-ahead warning skill, clean 2026 holdout (event = level ≥ 3; prevalence 88.0 % of 1,341 work hours) | detection 99.0 %, false-alarm ratio 7.5 %, under-warning 3.7 % (air-temperature rule 16.9 %, always-warn 28.9 %) | historical forecasts vs airport observations |
| Fail-safe property tests | 19,000 generated cases, 0 failures | synthetic |
| Seeded unsafe plans rejected by the checker | 100 % of non-equivalent mutants, 0 safety-critical survivors | synthetic |
| Permitted work, simulated site, 2026 summer | 28.4 % of nominal person-hours with full information; 3.0 % with a stale forecast; 0 % offline > 1 h | simulated cost of safety |
| Health outcomes | not measured — needs a field pilot | not validated |

Personalisation is crew-level (workload, clothing, acclimatization, exposure), not individual. Full context in [SUBMISSION.md](SUBMISSION.md).

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
| `/` | everyone | Product website |
| `/app` | site supervisor | Safety Command Center — **Overview** (protection briefing, 3 metrics, site plan, priority actions), **Worksite** (interactive site plan), **Protection** (interventions, current vs proposed plan, resources, crews), **Activity** (audit timeline) |
| `/worker` | crews | Worker companion: one protective action, pictograms first, five languages, offline |
| `/tour` | judges | Product tour: a live scenario, one chapter at a time, plus scenario controls |
| `/help` | judges, auditors | Method, limitations and the technical validation report (`eval/out`) |

## Judge guide (about 2 minutes)

Open **`/tour`** (`/demo` and `/command?judge=1` redirect there). The bar at the bottom runs one chapter at a time against the real engine, planner, policy check and offline logic.

| Chapter | What you should see |
|---|---|
| 1 Morning protection outlook | 1 July 2026, 10:30 GST; crews at different levels; plan passes the policy check (10 safety rules) |
| 2 Cooling facility outage | Briefing: "Central cooled rest cabin unavailable — 14 workers need alternative protection" (Concrete Pour, Site Logistics); the old plan is shown as *previous, not in effect* |
| 3 Affected crews identified | Site-plan drawer for the cabin: impact now, crews that lost it |
| 4 Revised protective action | "No adequate protection arrangement exists for Concrete Pour, Site Logistics"; policy check passes |
| 5 Unsafe previous arrangement rejected | The earlier plan, re-submitted unchanged, is rejected with plain-language reasons and rule references |
| 6 Connectivity failure | Offline banner and countdown to STOP-HOLD; levels never drop. Open **Worker companion**, pick বাংলা or العربية |

Then **Open technical validation**. Select any crew for reasoning, the full trace and the two-step symptom report; select any resource for capacity, confirmation, dependants and impact. **Scenario controls** add forecast stale/lost, onsite meter, repair + on-site confirmation, 15-minute tick and reset.

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
| [docs/12](docs/12-PRODUCT-EXPERIENCE-REDESIGN.md) | Product experience redesign: audiences, workflows |
| [docs/13](docs/13-VISUAL-SYSTEM-V3.md) | Visual system v3, four-destination navigation, stale-plan safety fixes |
| [docs/00–11](docs/) | Charter, requirements, science & safety, architecture, UI, decision engine, validation, responsible design, plan, demo, traceability, audit |
| [AGENTS.md](AGENTS.md) | Binding instructions for coding agents |

## Licence

Our code: MIT ([LICENSE](LICENSE)). Third-party: thermofeel (Apache-2.0), pvlib (BSD-3), FastAPI (MIT), React (MIT), IBM Plex and Noto fonts (OFL-1.1). Data: Open-Meteo (CC BY 4.0), Iowa Environmental Mesonet. NIOSH 2016-106 is public domain.
