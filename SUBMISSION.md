# AmanShift — Submission package

**Future Health Digital Innovation Challenge 2026 · Challenge 07: Climate-Resilient Worker Health**

AmanShift is climate-resilient workforce decision intelligence: crew-level heat-protection decision support for outdoor workers in Abu Dhabi. It combines day-ahead weather forecasts, onsite meter readings, each crew's workload, clothing and acclimatization, and the actual availability of shade, cooled rest and water, and gives one protective action per crew in English, Arabic, Hindi, Urdu and Bengali. Its defining property is tested: **when forecasts go stale, cooling fails or the network drops, protection can only become stricter.** A separately implemented rule checker rejects plans that break the policy. No names, biometrics or locations of individuals are collected. It is decision support — not a medical device, diagnosis or work authorization.

## Links

| Item | Link |
|---|---|
| Live demo | https://amanshift.onrender.com (Render free tier; the first load after idle can take ~1 minute) |
| Judge guide (2 min) | https://amanshift.onrender.com/tour |
| Supervisor command center | https://amanshift.onrender.com/app |
| Worker companion | https://amanshift.onrender.com/worker |
| Technical validation | https://amanshift.onrender.com/help/validation |
| Source code (MIT) | https://github.com/shro-2002/amanshift |
| Release tag | `v1.0-submission` |
| Solution deck | `submission/AmanShift_Submission_Deck.pptx` (official 16-slide template; uploaded via the dashboard) |
| Demo video | [VIDEO LINK — to be added after recording] |
| Login | None required — every feature is available without an account |

## What is real, what is simulated, what is not validated

| Category | What | Status |
|---|---|---|
| Real data | Open-Meteo Previous Runs day-ahead forecasts for Abu Dhabi (CC BY 4.0); Iowa Environmental Mesonet ASOS observations, Abu Dhabi airport (OMAA) | Cached in the repo, replayed |
| Simulated | Demo Site A — crews, shade, cooling cabin, water stations, walking times | Synthetic; no real worksite or person |
| Engineering evaluation | Property tests, checker mutation testing, planner benchmark, cost of safety | Synthetic test cases and simulated sites |
| Forecast skill | Day-ahead warnings scored against airport observations on held-out summers | Historical; airport is not a worksite |
| **Not validated** | Reduction of heat illness or injury; accuracy against onsite measured WBGT/TWL; supervisor adherence; worker comprehension of translations | Requires a field pilot (protocol in `docs/06` §14) |

## Measured results (all from `make eval` → `eval/out/report.md`)

**Forecast warning skill — clean 2026 holdout, primary profile (moderate work, acclimatized, shade), event = level ≥ 3, 1,341 work hours**

| Method | POD | FAR | CSI | Under-warning |
|---|---|---|---|---|
| AmanShift (forecast + δ 0.5 °C) | 99.0 % | 7.5 % | 91.6 % | 3.7 % |
| Raw forecast, no margin | 97.4 % | 6.4 % | 91.3 % | 7.5 % |
| Air-temperature rule | 94.2 % | 7.8 % | 87.2 % | 16.9 % |
| Persistence | 92.0 % | 7.2 % | 85.9 % | 18.3 % |
| Clock rule | 15.5 % | 1.6 % | 15.5 % | 85.5 % |
| Always work/rest | 100.0 % | 12.0 % | 88.0 % | 28.9 % |

Bootstrap 95 % CI: POD [98.3 %, 99.5 %], under-warning [2.3 %, 5.4 %]. Shade WBGT estimate vs reference: MAE 0.855 °C. δ was chosen on 2024 only (2022–2023 lack day-ahead humidity, wind and radiation). Events cover most summer work hours, so read POD next to the baselines.

**Fail-safe and checker (synthetic tests)**
- Property tests: 19,000 generated cases, 0 failures (single and composed degradations, meter readings, dwell/confirmation, determinism, checker = kernel).
- Checker mutation testing: 100 % of non-equivalent mutants killed; 0 safety-critical survivors.
- Planner benchmark (600 synthetic sites): 0 checker violations for AmanShift; a "no re-plan" baseline violates the policy on 177–187 of 200 sites per tier.
- Reference reproduction: Liljegren WBGT vs thermofeel vectors max error 0.0 °C (50 vectors); NIOSH REL/RAL golden rows within 0.05 °C.

**Cost of safety (simulated site, 2026 season)** — permitted work person-hours fall by 89.5 % with a stale forecast and 100 % when devices are offline for more than an hour. This is the deliberate price of never relaxing protection when information disappears.

## Verification of this release

| Check | Result |
|---|---|
| Backend tests (golden, unit, integration, property profile) | 98 passed |
| Frontend unit tests (degrader, derivations, worker cards, hydration guidance golden test) | 21 passed |
| Playwright on the live Render deploy (tour judging moment, stale-plan regression, legacy routes, worker RTL, axe on 8 pages, 320 px, offline) | 6/6 passed |
| Playwright on the Docker image | 6/6 passed |
| Fresh clone from GitHub → `make setup`, `make test`, `make eval` | all pass; every measured result identical to the committed `eval/out` (only wall-clock timings differ) |
| Secrets scan (gitleaks, full history + tree) | no leaks |
| Personal data | none in repository; demo worker data synthetic (`data/scenarios/demo-site-a.json`) |
| Licences | our code MIT; dependencies permissive (MIT / BSD / Apache-2.0 / OFL-1.1); photos Pexels License (`web/public/img/ATTRIBUTION.md`) |

## Reproduce

```bash
git clone https://github.com/shro-2002/amanshift && cd amanshift
make demo          # Docker → http://localhost:8080
make setup && make test && make eval   # without Docker: Python 3.12 + uv, Node 22+
```

## Limitations (summary — full list in `LIMITATIONS.md`)
- Weather values are **estimates** from a forecast grid cell, not measured at the site; no reflected heat from surfaces.
- The evaluation reference is an airport, not a worksite, and the sun-exposed reference is partly circular.
- Training data for the forecast margin is one summer (2024).
- NIOSH limits may be conservative for self-paced Gulf workers and are stricter than Abu Dhabi's legal TWL minimum; the cost is measured and disclosed.
- Translations are pending native-speaker review; worker comprehension is untested.
- Authentication is a role stub for the demo; demo state is per browser session in memory.
- The emergency number shown (998, UAE ambulance) must be replaced by the site's emergency-plan number before any pilot.
- The checker is separate code but shares the policy file and developer with the planner, so common-mode errors remain possible.

## Team and declarations
- Team name: [TEAM NAME]
- Team members: [Name — Country — Role — Organization — Age 18+ confirmed]
- Conflict of interest: [Declare any relationship with organizers, partners or judges, or state "None"]
- Development note: the software was built with the help of an AI coding assistant (Claude); the running product contains no AI or machine-learning components.

## Documents
`README.md` · `LIMITATIONS.md` · `data/SOURCES.md` · `eval/out/report.md` · `docs/DEMO-SCRIPT.md` · `docs/00–13` (charter, requirements, science & safety, architecture, UI, decision engine, validation, responsible design, plan, demo, traceability, audit, product redesign, visual system).
