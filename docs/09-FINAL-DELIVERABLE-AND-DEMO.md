# 09 — Final Deliverable and Demo

Status: FROZEN v1.0.

> Implementation note (2026-11-19, STATUS SC3): Demo Site A uses three water points (W1–W3) so every zone has water within 5 min; crew sizes 6–10. Selected day: 2026-07-01 (strict rule).

## 1. Final product description (submission text, ≤ 120 words)

AmanShift is a crew-level heat-protection decision-support system for outdoor workers in Abu Dhabi. It combines day-ahead forecasts, onsite WBGT/TWL readings, crew workload, clothing and acclimatization, and the real availability of shade, cooled rest and water. It produces four graded levels with one action each, in English, Arabic, Hindi, Urdu and Bengali. Its defining property is tested: when forecasts go stale, cooling fails or the network drops, recommendations can only become stricter. An independent rule checker rejects unsafe plans. It collects no personal, biometric or location data. It is decision support, not diagnosis or work authorization.

## 2. Required working features (P0)

Real-weather scenario replay; crew levels with computation trace; coverage graph; failure injection; re-plan; checker approve/reject with citations; worker cards in 5 languages; offline mode with tighten-only degradation and expiry; crew-level escalation; evidence screen fed by evaluation artifacts; methodology and limitations page.

## 3. Demo environment

- Synthetic **Demo Site A** (badge SYNTHETIC): 3 zones, 6 crews (sizes 6–12; mixed workloads; one unacclimatized crew; one crew in coveralls), resources: R1 shade (cap 20), R2 cooled rest cabin (cap 16), R3 shade (cap 12), W1/W2 water.
- Weather: a real Abu Dhabi day (see §4), forecast from Open-Meteo Previous Runs, provenance shown.
- **Judge mode:** `/command?judge=1` shows a numbered step rail (§6) with "Do step" buttons, so judges can reproduce without instructions.

## 4. Scenario-day selection rule (no cherry-picking by hand)
`eval/select_scenario.py` scans 2026 days from 1 July with complete data and picks the first day where, at 10:30 GST (before the midday break), the demo site yields at least three distinct effective levels, at least one crew at level 3 that is covered only via R2, and at least one level-1/2 crew. Output (date + levels) is committed. If no such day exists, relax to "two distinct levels" and record it in STATUS. The demo replays 06:00–18:00 GST; the judging moment is at 10:30.

## 5. Public deployment and local fallback
1. Public URL (Render/Fly) — link in README and submission.
2. `make demo` (Docker) → `http://localhost:8080`, works without internet.
3. Recorded 2-minute video (unlisted link) as last resort.

## 6. The judging moment (six reproducible steps)

| Step | Action | What judges see | Evidence |
|---|---|---|---|
| 1 | Load scenario (opens at 10:30) | Real morning; mixed levels; midday-break window 12:30–15:00 hatched ahead; plan approved | provenance chips |
| 2 | **Cooling R2 fails** | C2 and C5 flip to uncovered; red dashed edges; banner "insufficient protection capacity" | coverage graph |
| 3 | **Re-plan** | Planner reassigns what spare capacity allows; any crew that cannot be protected → STOP with `protection_insufficient`; checker ✓ 10/10 | S8 |
| 4 | **Submit unsafe plan** ("keep working as scheduled" = previous plan unchanged) | Checker ✗ rejected, citing at least C4 (assigned resource down) | S8 |
| 5 | **Network offline** | Banner "Offline — conservative levels"; cards still show in Bengali; levels never drop; countdown to STOP-HOLD | S10, S9 |
| 6 | Open **Evidence** | Property tests (N cases, 0 violations), mutant kill rate, holdout forecast skill vs baselines — all from `eval/out` | S11 |

T-E2E-06 automates these steps and asserts structure (verdicts, which crews are uncovered, monotone levels), never hard-coded numbers.

## 7. Two-minute video storyboard (revised for doc 12)

| Time | Shot | Voice-over (draft) |
|---|---|---|
| 0:00–0:12 | Website hero `/` | "Every worker deserves to return home safely. Heat warnings tell supervisors to rest crews in cool areas. What if the cool area is broken?" |
| 0:12–0:30 | `/tour` chapter 1 (Overview with protection briefing) | "AmanShift turns yesterday's forecast, crew workload, clothing and acclimatization, and the shade and cooling actually available, into one action per crew — using NIOSH limits, Abu Dhabi's TWL rules and the midday break." |
| 0:30–0:50 | `/tour` chapters 2–3 → site-plan drawer | "The central cooling cabin fails. Fourteen workers in two crews now have no rest area. The map shows who is affected and why." |
| 0:50–1:05 | `/tour` chapters 4–5 | "The planner stops what it cannot protect and says so. A separately implemented policy checker rejects the old schedule and cites the rules it breaks." |
| 1:05–1:25 | `/tour` chapter 6 + worker companion in Arabic/Bengali | "The network drops. Each worker sees one instruction, in their language — and it only gets stricter." |
| 1:25–1:45 | `/help/validation` | "We test that property on thousands of generated failures and score day-ahead warnings against real airport observations from held-out summers." |
| 1:45–2:00 | Website privacy section | "No names, no tracking, no biometrics, no disciplinary use. Decision support, ready for a field pilot." |

Spoken figures must match `eval/out` and the live state on the day of recording.

## 8. Screenshots for submission
`docs/screenshots/`: 01 website; 02 overview (morning); 03 tour — cooling outage; 04 overview after outage; 05 worksite drawer; 06 protection — previous plan shown as historical; 07 tour — previous arrangement rejected; 08 protection — interventions; 09 worker companion (en/ar/bn); 10 overview on mobile; 11 technical validation. Earlier versions in `docs/screenshots/v1-rc1/` and `v1.1/`.

## 9. Required technical documentation (in repo)
README (quick start + judge guide); `docs/00–11`; `LIMITATIONS.md` (assumptions, dependencies, limitations — official requirement, generated from doc 02 §8 + doc 07 §10 + STATUS uncertainties); `data/SOURCES.md` (all datasets + licences); `eval/out/report.md`.

## 10. Evaluation report structure (`eval/out/report.md`)
1 Data and provenance · 2 Reference reproduction · 3 Forecast warning skill (holdout, baselines, CIs, limitations) · 4 Fail-safe property tests · 5 Checker mutation results · 6 Planner benchmarks · 7 Cost of safety · 8 Not validated · 9 Reproduce.

## 11. Repository requirements
Public (or shareable) GitHub repo; MIT licence for our code; third-party licences listed; no secrets; committed caches and `eval/out`; tagged `v1.0-submission`.

## 12. Submission narrative (outline)
Problem (warnings assume protection exists) → insight (coverage + fail-safe) → what it does (6 steps) → evidence (real numbers from report) → governance → pilot path → limitations (verbatim summary).

## 13. Seven-minute finalist presentation (generic hack2skill format "7 min demo + 3 min Q&A"; confirm with organizers)
0:00 problem with a real Abu Dhabi afternoon (1 min) · 1:00 live judging moment (3 min) · 4:00 evidence (1 min) · 5:00 governance + rights (45 s) · 5:45 pilot + business (45 s) · 6:30 limitations and ask (30 s).

## 14. Commercial viability and pilot roadmap
Season 1: 2–3 site pilot with meters (doc 06 §14). Season 2: telemetry integration for coolers/meters; contractor subscription. Later: regulator aggregate view; other climate hazards on the same kernel. Revenue figures are not claimed.

## 15. Anticipated judge questions

| Question | Evidence-based answer |
|---|---|
| Isn't this just a heat index app? | No: crew-specific NIOSH limits + coverage of actual controls + failure-aware tightening + checker. Show step 2–4. |
| Forecast WBGT isn't measured WBGT. | Correct; it is labelled an estimate, a margin δ is added, onsite meters override upward, and we report skill against observations, with limits. |
| Why not wearables? | Doc 07 §6: unvalidated models, false reassurance, surveillance risk, sensor dropout. A consented crew flag is a future option. |
| Is the checker really independent? | Separate package, no shared code (test), different formulation. Same developer and same policy file remain common-mode risks — stated. |
| Does it reduce heat illness? | Not shown. We measured policy correctness and warning skill; illness reduction needs the pilot. |
| Won't stricter-on-failure stop too much work? | Cost of safety is measured and shown (doc 06 §7); safety comes first by design. |
| How do you know Arabic/Bengali text is right? | Marked pending native review; fixed strings only; comprehension test in pilot. |
| Who pays? | Contractors per site; hypothesis to validate in pilot. |
