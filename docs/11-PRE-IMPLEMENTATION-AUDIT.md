# 11 — Pre-Implementation Audit

Date: 2026-11-19. Method: author self-review plus an independent reviewer (separate agent, no access to the author's reasoning) reading AGENTS.md and docs 00–10 from five perspectives. 15 independent findings (7 P0) plus 2 author findings. All resolvable P0 issues are fixed in docs 00–10 (§4); the specification is frozen after these fixes.

## 1. Verdict per perspective

| Perspective | Verdict | Main concern after fixes |
|---|---|---|
| Occupational health & safety | Acceptable for a decision-support prototype | NIOSH WBGT screen is stricter than Abu Dhabi's TWL rules and may be impractical; metabolic/rest values need OH review |
| Principal software engineer | Buildable if scope cuts are taken now | ~20 h of tasks in ~22 h; UI is the schedule risk |
| Scientific validation | Credible with disclosed limits | Reference shares radiation with forecast; only 2026 is a never-inspected holdout |
| Privacy & responsible tech | Strong | Small-crew escalations can identify a person on site; no real auth |
| Skeptical first-prize judge | Competitive if the demo works and numbers are real | Novelty is a tested property + coverage view, not new science; must not overclaim |

## 2. Challenges examined

- **Scientific assumptions:** forecast ≠ measured WBGT (labelled); Liljegren unvalidated in the Gulf; shade model approximate; NIOSH limits possibly conservative for self-paced Gulf workers (Bates & Schneider 2008).
- **Regulatory interpretation:** the research reports and earlier notes cited "CoP 2.9" and a TWL "withdrawal zone". Primary sources show **ADOSH-SF CoP 11.0 v4.0 (2024)**, three TWL zones and **no TWL stop-work zone**. Specs corrected. Midday-break 2026 dates are from secondary sources only.
- **Novelty claims:** limited to "coverage-aware recommendations + tested fail-safe monotonicity + separately implemented checker in an occupational heat tool". No patent search; no claim that the property is new in safety engineering.
- **Dataset availability:** verified live (STATUS.md). No worksite or health-outcome data exist; demo site is synthetic and labelled.
- **Safety invariant:** six holes found and closed (§4 A3–A6, A12).
- **Planner/checker independence:** separate package, AST test, canonical inputs, differential fuzzing. Residual common-mode risk (same developer, same policy file, same spec) is stated.
- **Offline limits:** client can only take maxima of server-precomputed levels; cannot see new failures; expiry → STOP-HOLD.
- **UX:** P0 actions (approve, unsafe-plan submission, escalation) moved onto P0 screens; dark-mode contrast fixed.
- **Architectural complexity:** single container, SQLite, greedy planner first.
- **Implementation time:** cuts applied up front (§4 A2, A13).
- **Evaluation credibility:** primary metric on the less circular reference; lead time presented as fixed by design; holdout exposure disclosed.
- **Submission readiness:** blocked on registration confirmation and deadline hour (STATUS B1, B2).

## 3. Findings

### P0 (all fixed)
| # | Finding | Source |
|---|---|---|
| F1 | Scripted demo at 13:30 fell inside the midday break, so the advertised mixed levels and reassignment could not occur | reviewer |
| F2 | Two incompatible planner definitions (assignment solver vs MILP); assignment solver cannot express shared capacity | reviewer |
| F3 | Checker required a `clinical_escalation` action that did not exist; inconsistent action/level enums across docs | reviewer |
| F4 | Dwell could show a stricter level while permitted actions still allowed full work | reviewer |
| F5 | Offline rule inconsistent ("+1 level" vs max of precomputed levels); elapsed time resettable by reload | reviewer |
| F6 | Degradation spec could loosen: meter-removal operator, cache loss dropping cached forecast, p99 from cooler observation-based estimates, "ageing" by moving eval_time | reviewer |
| F7 | Checker inputs lacked zone ids, dwell history, day evidence; no rule for `defer`; two rules not falsifiable | reviewer |
| F8 | `defer(t*)` with a specific time violated set inclusion under degradation | author |
| F9 | Regulatory basis wrong in source reports (CoP number, withdrawal zone) | author / research |

### P1 (fixed unless marked open)
| # | Finding | Status |
|---|---|---|
| F10 | Level ignored TWL caps | Fixed: level 3 whenever capped f_max < 1 |
| F11 | Meter sun/shade semantics, multiple TWL readings, rest-zone WBGT, exposure promise | Fixed |
| F12 | Evaluation circularity, constant lead time, 2025 exposure | Fixed/disclosed; ERA5 reference radiation is P1 |
| F13 | Thin independence evidence; boundary splits from rounding | Fixed: canonical inputs, T-CHK-DIFF, hand cases; residual risk open |
| F14 | Shared public demo state | Fixed: per-session state + reset |
| F15 | Overstated wording (metabolic "confirmed", rest value, G1, "written independently", "maximum") | Fixed |
| F16 | Hash chain broken by payload purge; small-crew identifiability | Fixed (digest chain); identifiability disclosed — open |
| F17 | Scope vs time; broken cross-references; wall-clock solver fallback; fraction list; dark contrast | Fixed |
| F18 | NIOSH screen likely stricter than Abu Dhabi legal minimum → many level 3–4 afternoons | **Open**: disclosed; cost of safety measured; TWL-primary mode deferred (FR-RISK-09) |
| F19 | Metabolic category values extracted from text with a suspicious 415–520 kcal/h gap; rest value from an example | **Open**: verify against PDF at T0.2; OH review needed |
| F20 | Native-language review unavailable | **Open**: "pending native review" labels |

### Optional improvements
ERA5 reference radiation; MILP planner; bootstrap CIs; mutmut code-mutation score; audio clips; print sheet; meter/cooler heartbeat integration.

## 4. Normative amendments (applied to docs 00–10; override any leftover conflicting text)

- **A1 Demo** (doc 09 §4/§6): scenario = first 2026 day (from 1 Jul) giving ≥ 3 distinct effective levels at 10:30 GST with one level-3 crew covered only via R2; judging moment at 10:30; T-E2E-06 asserts structure, not numbers.
- **A2 Planner** (doc 03 §9, ADR-03, doc 05 §6): P0 deterministic greedy + checker; P1 lexicographic `scipy.optimize.milp` with status-based (not wall-clock) fallback. Benchmark metric = priority-weighted unprotected persons.
- **A3 Actions** (doc 05 §5): single enum `work | stop | defer` + boolean `clinical_escalation`; levels 1–4. Escalated crew: A_c = {stop(r, clinical_escalation = true)}. Midday break: stop or defer(t ≥ 15:00); no "relocate".
- **A4 Dwell** (doc 05 §3): effective level = max(raw_now, raw_prev) (raw includes coverage-forced 4); effective f cap = min(f_max_now, f_max_prev) while dwelling; A_c built from effective cap; `prev_eval` in snapshot; fixed 15-min ticks.
- **A5 Offline** (doc 03 §12, doc 06 §8): display = max(planned, worst_case) after stale_after; 4 after expiry; elapsed = max(wall − issued, persisted max elapsed); backwards clock ⇒ expired; local confirmations never change displayed levels.
- **A6 Degradation** (doc 05 §2, doc 06 §4): no evidence or meter removal; lost tier = max(cached + δ, p99); p99 from forecast-based estimates + δ; ageing only by back-dating timestamps.
- **A7 Checker** (doc 05 §8, doc 03 §5): evidence carries `zone_id` and meter location; snapshot carries `prev_eval` and `day_evidence`; rules C7, C9 retired into C2/C6; new C12 for defer; 10 active rules; both sides compute from canonical JSON.
- **A8 TWL** (doc 02 §4, doc 05 §3/§7): three ADOSH zones, caps not stop rules; lowest TWL of the day per zone; boundary values to the higher-risk zone.
- **A9 Meters** (doc 05 §2): sun meters bound sun estimates, shade meters bound shade; persist for the local day.
- **A10 Evaluation** (doc 06 §3): primary profile shaded outdoor on REF-SHADE; direct-sun profiles labelled partly circular; 2026 = clean holdout, 2025 = exposed holdout; lead time fixed by design; point estimates P0, bootstrap P1.
- **A11 Log** (doc 03 §6): chain over payload digests; payload table purgeable.
- **A12 defer** (doc 05 §5): any t ≥ t*(s) permitted; planner picks t*.
- **A13 Scope** (doc 00, 01, 04, 08): S1 text-only; S3, S7 P1; approve/unsafe-plan on S2/S8; escalation on S2 row menu and S9; per-session demo state added to T4.2.

### FR-RISK-09 (future TWL-primary mode) monotone semantics
With a fresh TWL reading for a zone-hour, the TWL regime may replace the NIOSH screen for that zone-hour (information gain). When that reading degrades, the level becomes max(NIOSH screen, TWL-regime level for the day), which is ≥ the TWL-only level, preserving the invariant. Requires occupational-health review before use.

## 5. Remaining effort
≈ 19 engineering hours (doc 08) against ≈ 22 hours to the internal submission-ready target, leaving ≈ 3 hours of buffer. Critical path unchanged.

## 6. Decision

**CONDITIONAL GO.**

Conditions:
1. Team registration confirmed and the dashboard's submission requirements read (B1). If not registered, NO-GO for submission; the work remains a portfolio project.
2. Deadline hour confirmed, or work to 2026-11-20 08:00 GST submission-ready (B2).
3. M3 gate (kernel + checker + 10,000-case property tests green) by 2026-11-19 22:00 GST; otherwise apply doc 08 §6 cuts 3–6.
4. Metabolic category values verified against the NIOSH PDF at T0.2 (F19).
5. No number enters the UI, video or submission unless `make eval` produced it.
