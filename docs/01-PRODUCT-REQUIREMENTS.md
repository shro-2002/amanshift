# 01 — Product Requirements

Status: FROZEN v1.0. Priorities: **P0** = required for submission; **P1** = build if time allows; **FUT** = commercial roadmap only.

## 1. Users and stakeholders

| Stakeholder | Interest |
|---|---|
| Outdoor workers (construction, logistics), largely South Asian migrant workers | Clear actions in their language; not being tracked or blamed |
| Site supervisor / foreman | Plan breaks, rotation, task timing; know if protection works |
| HSE manager / site medic | Escalations, compliance evidence |
| Employer / contractor | Fewer incidents and stoppages; regulator compliance |
| Regulators (ADPHC, MoHRE) | Faithful application of guidance; aggregate evidence (FUT) |

## 2. Personas

- **Rashed, site HSE supervisor (primary).** Arabic/English, tablet in a site office, patchy 4G. Today: checks the federal midday-break calendar and a wall poster. Needs: "which crews must change what, now, and is the cooled cabin actually working?"
- **Mohammad Alamgir, steel-fixer, crew C2 (secondary).** Bengali, limited reading, wears gloves. Needs: one clear instruction and a way to say a crewmate is unwell without being singled out.
- **Dr Priya, site medic (tertiary).** Needs escalations with time and crew, not dashboards.

## 3. Jobs to be done

- J1 When afternoon heat rises, I want each crew's required controls so I can plan breaks and rotation.
- J2 When a cooling unit, shade or water point fails, I want to know who lost protection and get a fix I can trust.
- J3 When data or network is lost, I want the system to stay on the safe side and tell me so.
- J4 As a worker, I want one instruction I can understand and a safe way to raise symptoms.
- J5 As a judge/buyer, I want evidence that the rules are applied correctly and that warnings arrive in time.

## 4. End-to-end journeys

1. **Morning plan (J1):** supervisor opens S2 → levels for today from the day-ahead forecast → plan proposed and approved → crew cards printed (paper fallback).
2. **Resource failure (J2):** cooled rest R2 fails → C2 uncovered → banner → Re-plan → checker approves reassignment to R3 or stop → cards update.
3. **Degradation (J3):** forecast stale → CONSERVATIVE tag, levels rise; network lost on tablet → cached pack, levels raised, expiry countdown.
4. **Worker escalation (J4):** worker taps "Someone in C2 is unwell" → two-step confirm → C2 STOP, medic alert banner, event logged.
5. **Evidence review (J5):** judge opens S11 → holdout skill, property tests, mutation kills → follows commands to reproduce.

## 5. Functional requirements

### Crew Risk Engine
| ID | Requirement | P |
|---|---|---|
| FR-RISK-01 | Compute estimated WBGT (sun, shade) hourly from forecast variables using thermofeel Liljegren; label as estimate | P0 |
| FR-RISK-02 | Accept onsite WBGT meter readings per zone; combine by max with estimate | P0 |
| FR-RISK-03 | Accept onsite TWL readings per zone; map to ADOSH-SF CoP 11.0 zones and caps (doc 02 §4.4); never compute TWL | P0 |
| FR-RISK-09 | Optional "TWL-primary" mode where a fresh TWL reading replaces the NIOSH screen for that zone-hour (monotone semantics in doc 11 §4) | FUT (needs OH review) |
| FR-RISK-04 | Apply clothing adjustment value by PPE class | P0 |
| FR-RISK-05 | Compute exposure limit from workload class (metabolic rate) and acclimatization (REL vs RAL) | P0 |
| FR-RISK-06 | Determine maximum permitted hourly work fraction from policy `work_fractions` {1, .75, .5, .333, .25} and map to levels 1–4 | P0 |
| FR-RISK-07 | Apply the federal midday-break window to direct-sun outdoor tasks as STOP | P0 |
| FR-RISK-08 | Add forecast uncertainty margin δ to forecast-based estimates | P0 |

### Protection Coverage Graph
| ID | Requirement | P |
|---|---|---|
| FR-COV-01 | Model zones, walk times, resources (shade, cooled rest, water) with capacity and state | P0 |
| FR-COV-02 | Only `up` resources create edges; walk-time limits per resource type | P0 |
| FR-COV-03 | Report covered/uncovered per crew and site coverage ratio | P0 |
| FR-COV-04 | Resource states via injection, supervisor confirmation (TTL 30 min) and optional heartbeat | P0 (heartbeat P1) |

### Kernel, planner, checker
| ID | Requirement | P |
|---|---|---|
| FR-KER-01 | Represent each input's trust (measured, forecast, stale, fallback, missing) and freshness | P0 |
| FR-KER-02 | Compute permitted action set per crew from the worst case of each uncertainty set | P0 |
| FR-KER-03 | Degradation never expands the permitted set (fail-safe invariant) | P0 |
| FR-KER-04 | Relaxation only after fresh data/confirmation and a dwell period | P0 |
| FR-KER-05 | Crew symptom escalation forces STOP until closed by medic role | P0 |
| FR-PLN-01 | Propose one action and resources per crew: deterministic greedy (P0); lexicographic MILP (P1) | P0/P1 |
| FR-PLN-02 | Return explicit infeasibility (stop) when protection capacity is insufficient | P0 |
| FR-CHK-01 | Separate checker evaluates 11 rules with citations, approves/rejects | P0 |
| FR-CHK-02 | Accept arbitrary submitted plans (unsafe-plan demo) | P0 |
| FR-CHK-03 | Only approved plans can be applied | P0 |

### Interface
| ID | Requirement | P |
|---|---|---|
| FR-UI-01 | Screens per doc 04 (S2, S4, S6, S8, S9, S10, S11, S12 P0; S1, S3, S5, S7 P1-lite) | P0/P1 |
| FR-UI-02 | Provenance chip on every number | P0 |
| FR-OFF-01 | Offline pack + tighten-only degrader + expiry STOP-HOLD | P0 |
| FR-OFF-02 | Local resource confirmation offline queued in outbox (never changes displayed levels) | P1 |
| FR-OFF-03 | Printable crew sheet (paper fallback) | P1 |
| FR-I18N-01 | en, ar, hi, ur, bn fixed strings + pictograms, RTL, "pending native review" | P0 |
| FR-ESC-01 | Crew-level symptom report with two-step confirm | P0 |

### Governance and evidence
| ID | Requirement | P |
|---|---|---|
| FR-GOV-01 | No personal identifiers, biometrics or locations in schema (schema test) | P0 |
| FR-GOV-02 | Hash-chained append-only event log of plans, verdicts, overrides, escalations | P0 |
| FR-GOV-03 | Footer and API notice: no disciplinary/employment use; decision support only | P0 |
| FR-EVAL-01 | Reproducible evaluation scripts and artifacts (doc 06) | P0 |
| FR-EVAL-02 | Event schema supporting future pilot metrics (adherence, symptoms, escalations, lost time) | P0 |

## 6. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-01 | Determinism: same snapshot + policy ⇒ byte-identical plan and verdict |
| NFR-02 | Plan + check ≤ 1 s for ≤ 12 crews, ≤ 10 resources on M4 |
| NFR-03 | Offline: app shell and last pack usable with no network |
| NFR-04 | WCAG 2.2 AA on P0 screens |
| NFR-05 | Works at 320 px width; touch targets ≥ 44 px (56 px on cards) |
| NFR-06 | No secrets required; all data sources declared with licence |
| NFR-07 | Every claim in UI/docs traceable to an artifact or citation |
| NFR-08 | Exact dependency pins via lockfiles |

## 7. Edge cases and failure states

Forecast missing; forecast stale; meter higher than estimate; meter lower (ignored for relaxation); TWL in ADOSH High zone; crew of one (lone work); all resources down; capacity smaller than crew; walk time too long; crew size 0 or > capacity of every resource; mixed acclimatization (treated as unacclimatized); evaluation time inside midday window; DST not applicable (GST UTC+4 fixed); policy version mismatch; snapshot hash mismatch; checker exception; offline > 3 h; clock skew on device (use server time in pack + monotonic elapsed time).

## 8. User stories with acceptance criteria

- **US-01 (J1)** As a supervisor I see each crew's level and instruction. *AC:* given scenario S-AUH-1 at 14:00, S2 lists all crews with level, instruction and provenance; values equal `/state`.
- **US-02 (J2)** When R2 fails, affected crews show uncovered within one refresh and a re-plan is offered. *AC:* inject R2 down → C2 coverage ✗ → `/plans` returns feasible reassignment or stop; checker approved.
- **US-03 (J2)** I can see why a plan was rejected. *AC:* submitting "keep working" plan returns `rejected` with ≥ 1 violation citing C4 or C2.
- **US-04 (J3)** Stale forecast raises levels and is labelled. *AC:* inject stale → every forecast-based level ≥ previous level; CONSERVATIVE tag on affected rows.
- **US-05 (J3)** Offline tablet never shows a calmer level. *AC:* property test T-OFF-01 passes; manual network-off shows banner ≤ 5 s.
- **US-06 (J4)** Worker card in Bengali with pictograms. *AC:* `/cards?lang=bn` renders level shape+number+word, ≤ 8-word instruction, "pending native review".
- **US-07 (J4)** Crew-level escalation. *AC:* two-step confirm → crew STOP; event logged with crew id only; medic banner.
- **US-08 (J5)** Evidence is reproducible. *AC:* `make eval` regenerates every number on S11; S11 reads only `eval/out/*.json`.
- **US-09** Recovery requires confirmation. *AC:* repair R2 → state `unconfirmed`, no edges until confirm; levels do not drop before dwell period.

## 9. Mapping to official desired outcomes

| Official outcome | Requirements | Honest coverage |
|---|---|---|
| Dynamic heat-risk assessment | FR-RISK-01..08, FR-KER-01..02 | Crew-level, environmental + workload + PPE + acclimatization. Optional consented worker signals: design stub only (FUT-03) |
| Clear, graded warnings | FR-RISK-06, FR-I18N-01, FR-UI-01, FR-ESC-01 | 4 levels, 5 languages pending native review; actions: hydration, rest, cooling, intensity reduction, shift/timing, clinical escalation |
| Worker-first governance | FR-GOV-01..03, doc 07 | No personal data; no disciplinary use; RBAC stubs |
| Field-ready operation | FR-OFF-01..03, FR-KER-03, FR-COV-04 | Connectivity and sensor/resource failure handled and tested; heat via real weather; battery/dust/PPE: PPE via clothing adjustment, battery via paper fallback, dust not modelled |
| Supervisor decision support | S2, S4, S7, FR-PLN-01..02 | Crew/site views without individual clinical detail |
| Safety and productivity measures | FR-EVAL-01..02, doc 06 | Lead time and false-alarm rate measured on historical data; adherence, symptoms, escalations, compliance and lost time: logged schema + pilot protocol, not measured |

## 10. Competitive differentiation (summary)
See doc 00. Core: coverage-aware recommendations, fail-safe monotonicity, independent checker, zero worker data.

## 11. Commercial deployment and pilot pathway

- **Buyer:** contractors and facility operators with outdoor crews; channel via HSE consultancies.
- **Model (hypothesis, unvalidated):** per-site monthly subscription during hot season; free tier for small contractors.
- **Pilot (FUT-01):** 2–3 Abu Dhabi sites, one season, onsite WBGT meters, paper + tablet; protocol in doc 06 §14; aligned with ADPHC Safety in Heat programme requirements.
- **FUT-02:** meter/cooler telemetry integration (heartbeat). **FUT-03:** opt-in wearable crew flag with independent ethics review. **FUT-04:** regulator aggregate view with small-cell suppression. **FUT-05:** other hazards (dust storms, air quality) using the same fail-safe kernel.
