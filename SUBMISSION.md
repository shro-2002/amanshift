# AmanShift — Submission package

**Future Health Digital Innovation Challenge 2026 · Challenge 07: Climate-Resilient Worker Health**

AmanShift is crew-level heat-protection decision support for outdoor workers in Abu Dhabi. It combines day-ahead weather forecasts, onsite meter readings, each crew's workload, clothing and acclimatization, and the actual availability of shade, cooled rest and water, and gives one protective action per crew in English, Arabic, Hindi, Urdu and Bengali. Its defining property is tested: **when forecasts go stale, cooling fails or the network drops, protection can only become stricter.** A separately implemented rule checker rejects plans that break the policy. No names, biometrics or locations of individuals are collected. It is decision support — not a medical device, diagnosis or work authorization. The running product contains no AI or machine-learning components.

## Why it matters

Excessive heat exposes at least 2.41 billion workers a year and is linked to an estimated 22.85 million occupational injuries and 18,970 work-related deaths annually (ILO, *Ensuring safety and health at work in a changing climate*, April 2024). In the UAE, outdoor work in direct sun is banned 12:30–15:00 from 15 June to 15 September; violations cost AED 5,000 per worker, up to AED 50,000 (MoHRE 2026 announcement). Heat plans assume that shade, cooling and water exist when a crew needs them. AmanShift plans around the protection that is actually confirmed on site, and reacts when it fails.

## Links

| Item | Link |
|---|---|
| Live demo (no login) | https://amanshift.onrender.com — Render free tier; the first load after idle can take about 30–60 s |
| Judge guide (about 2 min) | https://amanshift.onrender.com/tour |
| Supervisor command center | https://amanshift.onrender.com/app |
| Worker companion | https://amanshift.onrender.com/worker |
| Technical validation | https://amanshift.onrender.com/help/validation |
| Source code (MIT) | https://github.com/shro-2002/amanshift |
| Release tag | `v1.1-submission` (earlier tags kept: `v1.0-rc1`, `v1.0-submission`, `v1.1-redesign-a`) |
| Evaluation report | [`eval/out/report.md`](eval/out/report.md) |
| Solution deck | Official 16-slide template, uploaded through the challenge dashboard (not stored in this repository) |
| Demo video (2:42, under the 3-minute limit) | https://youtu.be/PX46sZLP68s |

## What is real, what is simulated, what is not validated

| Category | What | Status |
|---|---|---|
| Real data | Open-Meteo Previous Runs day-ahead forecasts for Abu Dhabi (CC BY 4.0); Iowa Environmental Mesonet ASOS observations, Abu Dhabi airport (OMAA) | Cached in the repo, replayed |
| Simulated | Demo Site A — crews, shade, cooling cabin, water stations, walking times | Synthetic; no real worksite or person |
| Engineering evaluation | Property tests, seeded unsafe-plan tests of the checker, planner benchmark, cost of safety | Synthetic test cases and simulated sites |
| Forecast skill | Day-ahead warnings scored against airport observations on held-out summers | Historical; airport is not a worksite |
| **Not validated** | Reduction of heat illness or injury; accuracy against onsite measured WBGT/TWL; supervisor adherence; worker comprehension of translations | Requires a field pilot (protocol in `docs/06` §14) |

## Measured results (all from `make eval` → `eval/out/report.md`)

**Forecast warning skill — clean 2026 holdout, primary profile (moderate work, acclimatized, shade), event = level ≥ 3.** Events are common: 1,180 of 1,341 work hours (88.0 %) reach level 3 in the reference, so detection alone is easy. Read detection next to false alarms, under-warning and the "always warn" baseline.

| Method | Detection (POD) | False-alarm ratio | CSI | Under-warning | Exact level agreement |
|---|---|---|---|---|---|
| AmanShift (forecast + δ 0.5 °C) | 99.0 % | 7.5 % | 91.6 % | 3.7 % | 73.6 % |
| Raw forecast, no margin | 97.4 % | 6.4 % | 91.3 % | 7.5 % | 77.8 % |
| Air-temperature rule | 94.2 % | 7.8 % | 87.2 % | 16.9 % | 45.5 % |
| Persistence | 92.0 % | 7.2 % | 85.9 % | 18.3 % | 63.6 % |
| Clock rule | 15.5 % | 1.6 % | 15.5 % | 85.5 % | 8.0 % |
| Always work/rest | 100.0 % | 12.0 % | 88.0 % | 28.9 % | 59.1 % |

Bootstrap 95 % CI: detection [98.3 %, 99.5 %], under-warning [2.3 %, 5.4 %]. The margin δ halves under-warning against the raw forecast (7.5 % → 3.7 %) for a 1.1-point rise in false alarms and lower exact agreement (it errs on the strict side by design). STOP hours (reference level 4) are rarer and harder: 388 of 1,341 hours, detection 90.5 %, false-alarm ratio 36.6 %. Shade WBGT estimate vs reference: MAE 0.855 °C. δ was chosen on 2024 only (2022–2023 lack day-ahead humidity, wind and radiation). Lead time is fixed by design (day-ahead, at least 13 h before the first work hour), not a skill metric.

**Fail-safe and checker (synthetic tests)**
- Property tests: 19,000 generated cases, 0 failures (single and composed degradations, meter readings, dwell/confirmation, determinism, checker verdict = kernel membership).
- Seeded unsafe plans: 11 plan-mutation operators applied to approved plans on 500 generated sites (raise a work fraction, assign a failed or out-of-reach resource, exceed capacity, drop a STOP, ignore the midday break or an escalation, remove or duplicate a crew, bind to the wrong snapshot; one operator produced no non-equivalent mutants). The checker rejected 100 % of non-equivalent unsafe plans; 0 safety-critical survivors. This measures rule coverage. The oracle is the kernel, so it shows agreement between two implementations, not that either is correct.
- Planner benchmark (600 synthetic sites): 0 checker violations for AmanShift; a "no re-plan" baseline violates the policy on 177–187 of 200 sites per tier.
- Reference reproduction: Liljegren WBGT vs thermofeel vectors max error 0.0 °C (50 vectors); NIOSH REL/RAL golden rows within 0.05 °C.

**Cost of safety (simulated Demo Site A, 2026 season, 121 days)**

| Information state | Permitted person-hours | Share of nominal 60,984 | Change vs full information |
|---|---|---|---|
| Full information | 17,332.8 | 28.4 % | — |
| Stale forecast | 1,824.9 | 3.0 % | −89.5 % |
| Forecast missing | 1,847.4 | 3.0 % | −89.3 % |
| Devices offline > 1 h | 0 | 0 % | −100 % |

Nominal = every worker at every hourly tick 06:30–17:30 GST. Even with full information the policy permits 28.4 % of nominal person-hours on this site in summer; the midday break alone removes 11.0 %. The rest comes from NIOSH REL/RAL limits (stricter than Abu Dhabi's legal TWL minimum, and possibly conservative for self-paced Gulf workers — Bates & Schneider 2008), required work/rest cycles and resource limits on one synthetic site. When information is missing the policy falls back to a seasonal 99th-percentile bound, which permits almost no work. This is the deliberate price of never relaxing protection; AmanShift does not trade it away. Lowering it is a policy decision for an occupational-health professional (for example a TWL-primary mode, deferred), not a software tweak.

## How the challenge requirements are covered

| Challenge 07 asks for | AmanShift | Gap, stated plainly |
|---|---|---|
| 1 Dynamic heat-risk assessment | Forecast + meter WBGT, workload, clothing, acclimatization, exposure, time of day; crew level | No individual or physiological signals (by design for this version) |
| 2 Clear, graded multilingual warnings | Four levels, one action each (work, work/rest with water, defer, stop, clinical escalation), five languages, pictograms first | Translations pending native-speaker review; comprehension untested |
| 3 Worker-first governance | No personal data at all; crew is the smallest unit; no ranking or productivity score; escalation payloads purgeable | Role headers are a demo stub, not production identity |
| 4 Field-ready operation | Tested: stale/lost forecast, resource failure, network loss (tighten-only, STOP-HOLD after 3 h); PPE via NIOSH clothing adjustment; nothing worn, so no battery risk | Dust not modelled; behaviour shown in simulation, not in the field |
| 5 Supervisor decision support | Site plan, who depends on which resource, checked plans, audit trail | — |
| 6 Safety and productivity measures | Reported now: false-alarm ratio, under-warning, permitted work time (simulated), escalations logged; lead time fixed day-ahead | Adherence, symptoms, incidents, compliance need the pilot |

**Personalisation is crew-level, not individual.** Each crew gets its own level from its own workload, clothing, acclimatization and exposure. Roadmap toward voluntary individual personalisation, only after occupational-health and ethics review: (1) a worker can privately mark themselves as not yet acclimatized or unwell on their own phone; (2) the device only ever tightens that worker's crew guidance and sends nothing identifying; (3) opt-in wearable signals (FUT-03) would follow the same rule — tighten only, never rank, never reach HR.

## Commercial case (proposal — no customers, pilots or revenue yet)

- **Buyers:** construction contractors and industrial employers in the Gulf, through their HSE managers and site supervisors.
- **Existing alternatives:** handheld or fixed WBGT/TWL meters with work/rest tables; heat-index apps (NIOSH/OSHA, AIHA); commercial platforms such as Perry Weather (vendor-stated: onsite WBGT sensors, task-based work/rest, forecasts, grouping by crew or location); wearable physiological monitors.
- **What AmanShift adds:** plans around the shade, cooling and water actually confirmed on site (capacity, walking distance); detects which crews lose protection when a resource fails and invalidates the old plan; a separately implemented checker blocks plans that break the policy; one action per crew in five languages, offline, tighten-only. It can take readings from existing meters rather than replace them.
- **Buyer value (to be tested):** an auditable record that controls followed cited guidance (NIOSH, ADOSH CoP 11.0, midday break) including during failures; fewer stale instructions after equipment failure.
- **Pricing hypothesis:** per active site per hot season; price set from pilot willingness to pay. No revenue figures are claimed. Open-Meteo's API is free only for non-commercial use, so a data licence is budgeted.
- **Proposed pilot:** one Gulf construction or industrial site, one hot season. Partners needed: a contractor's HSE team, an occupational physician, worker representatives, an ethics board, native-speaker reviewers, a calibrated WBGT/TWL meter. Milestones: (M0) occupational-health review of the policy file and translation review; (M1) two weeks in shadow mode — recommendations logged, not issued, compared with the site's own heat plan and meter; (M2) live use with supervisor acknowledgement; (M3) end-of-season report. Success metrics: rest-period adherence, crew-level symptom reports per 1,000 worker-hours, escalations and heat-illness incidents, false alarms against the onsite meter, lost work time vs schedule, translation comprehension ≥ 90 % correct action (20 workers per language).

## Verification of this release

| Check | Result |
|---|---|
| Backend tests (golden, unit, integration incl. input-hardening regressions, property profile) | see `STATUS.md` for the count at this tag; all pass |
| Frontend unit tests (degrader, derivations, worker cards, hydration guidance golden test) | 21 passed |
| Playwright on the live Render deploy | 6/6 passed |
| `make eval` from a fresh clone | every measured result identical to the committed `eval/out` (only wall-clock timings differ) |
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

## Declarations
- Team: Team AmanShift — individual participant: Shroddha Ghosh (India), SDE1 software engineer; built every part of the submission. Team lead is over 18.
- Conflict of interest: none — no employment, contract, funding, advisory or personal relationship with the organizers, co-creators, partners or judges.
- Development note: the software was built with the help of an AI coding assistant (Claude); the demo narration and music were generated with ElevenLabs under a plan that permits this use. The running product contains no AI or machine-learning components.

## Documents
`README.md` · `LIMITATIONS.md` · `data/SOURCES.md` · `eval/out/report.md` · `docs/DEMO-SCRIPT.md` · `docs/00–13` (charter, requirements, science & safety, architecture, UI, decision engine, validation, responsible design, plan, demo, traceability, audit, product redesign, visual system).

## Sources cited here
ILO (2024) *Ensuring safety and health at work in a changing climate*; MoHRE midday break 2026 (Khaleej Times, Gulf News reports of the announcement); NIOSH 2016-106; ADOSH-SF CoP 11.0 v4.0 and Technical Guideline (ADPHC); Tustin et al., MMWR 67(26), 2018; Bates & Schneider 2008; Liljegren et al. 2008; Perry Weather product pages (vendor-stated).
