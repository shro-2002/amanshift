# 00 — Project Charter: AmanShift

Status: FROZEN v1.0 (2026-11-19). Name provisional: a basic web search on 2026-11-19 found no product named "AmanShift"; no trademark search was done.

## Vision and mission

**Tagline:** Protection must never weaken when information disappears.

**Vision:** Outdoor workers in Abu Dhabi get the heat protection their conditions require, even when forecasts go stale, cooling units fail or the network drops.

**Mission (MVP):** A crew-level heat-protection decision-support system that turns forecasts, onsite measurements, crew context and the real availability of shade, cooled rest and water into graded, multilingual actions. When information or protection is lost, its recommendations can only become stricter, and an independent checker rejects any plan that breaks the rules.

## Problem and target population

- Outdoor construction, logistics and industrial crews in Abu Dhabi during the hot season (roughly May–October).
- Supervisors usually get general thresholds and calendar rules (the federal midday break). Those do not answer two questions: *how much protection does this crew need now*, and *is that protection actually available*?
- A heat warning that recommends "rest in a cooled area" is not protective if the cooled area is broken, full or too far away. Existing tools assume the recommended control exists.

## Selected challenge and judging criteria

Challenge 07 — Climate-Resilient Worker Health (Future Health Digital Innovation Challenge 2026; official page checked 2026-11-19).

Judging criteria (official, no weights published): health impact and clinical relevance; technical depth and architecture; working solution and demonstration quality; responsible AI, safety and data governance; scalability and deployment readiness; commercial viability and path to pilot.

Required deliverable (official FAQ): "A working prototype by 20th November, with technical documentation and a clear statement of your assumptions, dependencies, and limitations." Further requirements are visible only on the registered team's dashboard.

## Value proposition

- **Supervisor:** one screen showing which crews are protected, which are not, and a checked plan to fix it.
- **Worker:** a clear card in their language with one action, and a crew-level way to report feeling unwell. No tracking.
- **Employer/HSE:** an auditable record that controls followed cited guidance, including during failures.

## Differentiation

| Existing approach | Examples (prior art) | What AmanShift adds |
|---|---|---|
| Occupational heat forecasts and work advice | HEAT-SHIELD (EU), WORKLIMATE (IT) | Checks whether the advised control exists and works for each crew (coverage graph) |
| Wearable physiological alerts | Kenzen, SlateSafety | Works with zero worker data; safe when sensors fail |
| Heat-index apps and calendar rules | OSHA-NIOSH Heat Safety Tool, midday break | Crew-specific limits (workload, clothing, acclimatization) and failure-aware tightening |

Claim we make: a **tested monotonicity property** (information or resource loss never expands permitted actions) plus an **independent rule checker** in an occupational heat tool. Claim we do not make: that this property has never existed anywhere, or that AmanShift reduces illness (unvalidated). Prior-art review was based on the research reports' citations and known systems; no patent search was performed.

## Core technical idea

Permitted actions are a function of a fixed evaluation context. Degradation enlarges the uncertainty set of each input, and the kernel acts on the worst case in that set, so degradation can only shrink the permitted set. A separate checker re-derives the rules and rejects violating plans. Defined in doc 02 §6.

## Scope (MVP)

In: Crew Risk Engine; Protection Coverage Graph; Fail-Safe Decision Kernel + planner + independent checker; offline-capable supervisor and worker interface in five languages; historical forecast evaluation for Abu Dhabi; property and mutation tests; synthetic demo site with real weather.

Non-goals: wearables, physiological prediction, TWL computation, individual risk scores, worker location tracking, ML models, chatbots, routing, dust modelling, payroll/HR integration, regulatory certification, automatic work authorization.

## Constraints and assumptions

- Solo developer; Apple M4, 24 GB; about one day of engineering left. Submission hour/time zone unpublished, so we plan to be **submission-ready by 2026-11-20 08:00 GST** and submit by 12:00 GST.
- Registration closed 10 Nov. Assumption A0: the developer's team is registered. Confirm on the dashboard before building (blocker B1).
- No organizer data. All data must be legally usable and declared: Open-Meteo (CC BY 4.0; free API for non-commercial use), IEM ASOS/METAR archive (public), thermofeel (Apache-2.0), pvlib (BSD-3).
- Crew-level screening assumes the NIOSH framework's population assumptions (healthy, hydrated workers; acclimatization status as declared).

## Measurable success criteria (for submission)

| ID | Criterion | Target |
|---|---|---|
| SC1 | Fail-safe property tests | ≥ 10,000 generated degradation cases, 0 violations |
| SC2 | Checker catches seeded plan mutants | ≥ 95 % of mutants killed; every survivor explained |
| SC3 | Reference reproduction | NIOSH limit equations match hand-calculated published values to ±0.1 °C; thermofeel matches its own published test vectors |
| SC4 | Forecast warning evaluation | Holdout (2025–2026 summers) POD, FAR, CSI and lead time reported against ≥ 3 baselines; no target, honest reporting |
| SC5 | Demo reproducibility | A judge can run the six-step judging moment from the public URL or `make demo` in ≤ 5 minutes |
| SC6 | Accessibility | 0 serious/critical axe violations on S2, S9, S10 |
| SC7 | Documentation | Assumptions, dependencies and limitations page complete (official requirement) |

## Project-level GO/NO-GO conditions

- **GO** if: registration confirmed (B1); thermofeel + Open-Meteo + IEM pipelines run (verified 2026-11-19); M3 (kernel + checker + property tests) green by 2026-11-19 22:00 GST.
- Planner is greedy-with-checker from the start (MILP is P1); S1 is text-only; S3 and S7 are P1.
- **Scope cut** if M3 slips past 22:00 GST: apply doc 08 §6 cuts 3–6.
- **NO-GO (submit documentation + partial prototype)** if no working end-to-end demo exists by 2026-11-20 06:00 GST.
