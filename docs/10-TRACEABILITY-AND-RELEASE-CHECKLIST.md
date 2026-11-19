# 10 — Traceability and Release Checklist

Status: FROZEN v1.0. Update the "Evidence" column with artifact paths as they are produced.

## 1. Official outcome → requirement → component → task → test → metric → demo → artifact

| Official outcome | Req IDs | Component | Tasks | Tests | Metric | Demo step | Submission artifact |
|---|---|---|---|---|---|---|---|
| Dynamic heat-risk assessment | FR-RISK-01..08 | screening/, engine/risk.py | T1.1, T2.1 | T-REF-01..04, unit worked examples | WBGT MAE/bias vs REF; reference error | 1 | S5 trace screenshot, report §2–3 |
| Clear, graded warnings | FR-RISK-06, FR-I18N-01, FR-ESC-01 | risk.py, web S9 | T2.1, T6.3 | T-UI-02, US-06, US-07 | — | 5 | S9 screenshot (bn, ar) |
| Worker-first governance | FR-GOV-01..03 | schema, store/, footer | T4.3, T7.3 | T-SEC-01..05, schema test | — | 6 (S12) | doc 07, LIMITATIONS.md |
| Field-ready operation (fallback) | FR-KER-01..05, FR-OFF-01..03, FR-COV-04 | kernel.py, offline-degrader.ts | T3.1, T6.4 | T-KER-01..06, T-OFF-01..04 | property violations = 0; cost of safety | 2, 5 | property_tests.json, cost_of_safety.json |
| Supervisor decision support | FR-COV-01..03, FR-PLN-01..02, FR-CHK-01..03, FR-UI-01 | coverage.py, planner.py, amanshift_checker, S2/S4/S7/S8 | T2.2, T3.2, T4.1, T6.2, T6.6 | T-KER-04, T-CHK, planner bench, T-E2E-06 | priority-weighted unprotected persons, violations, kill rate | 2–4 | planner_bench.json, checker_mutation.json, S2/S8 screenshots |
| Safety & productivity measures | FR-EVAL-01..02 | eval/, store/ | T5.1, T5.2 | T-EVAL-LEAK-01, T-DQ-* | POD, FAR, CSI, under-warning, lead time; pilot metrics schema | 6 | forecast_eval.json, report.md, doc 06 §14 |

## 2. Requirement → task → test (compact)

| Req | Task | Test |
|---|---|---|
| FR-RISK-01 | T1.1 | T-REF-01, T-REF-04 |
| FR-RISK-02/03 | T2.1 | unit: meter max rule, TWL zones; T-KER-05 |
| FR-RISK-04/05/06 | T0.2, T2.1 | T-REF-02/03, worked examples doc 05 §10 |
| FR-RISK-07 | T2.1 | unit: ban window boundaries (12:29/12:30/14:59/15:00; 14 Jun/15 Jun/15 Sep/16 Sep) |
| FR-RISK-08 | T5.1 | T-EVAL-LEAK-01 |
| FR-COV-01..04 | T2.2, T3.1 | unit coverage; state-machine tests |
| FR-KER-01..05 | T3.1 | T-KER-01..06 |
| FR-PLN-01/02 | T4.1 | T-KER-04, T-KER-07, planner bench |
| FR-CHK-01..03 | T3.2, T4.2 | per-rule unit tests, T-CHK mutation, T-IND-01 |
| FR-UI-01/02 | T6.1–T6.6 | T-UI-01..04 |
| FR-OFF-01..03 | T6.4 | T-OFF-01..04 |
| FR-I18N-01 | T6.1, T6.3 | T-UI-02 |
| FR-ESC-01 | T4.2, T6.3 | US-07 E2E |
| FR-GOV-01..03 | T4.3, T7.3 | schema test, T-SEC-* |
| FR-EVAL-01/02 | T5.1, T5.2 | `make eval` clean run |
| NFR-01..08 | all | T-KER-07, timing test, T-OFF-04, axe, 320 px snapshot, lockfiles present |

## 3. Release-blocking conditions (any one blocks submission)

- RB1 Any golden reference test fails (policy values ≠ cited sources).
- RB2 Any fail-safe property violation (T-KER-01..03, T-OFF-01..03).
- RB3 Checker approves any non-equivalent mutant of rules C2, C3, C4, C6 or C10 (safety-critical rules).
- RB4 `amanshift_checker` imports `amanshift` (T-IND-01).
- RB5 Any number in UI/video/submission not traceable to `eval/out` or a citation.
- RB6 Any personal identifier, biometric or location field in schema or UI.
- RB7 Banned wording (`safe to work`, `cleared`, `authorized`, "measured" for estimates) found by grep.
- RB8 Judging moment fails on the URL given to judges.
- RB9 LIMITATIONS.md missing or incomplete (official deliverable).

## 4. Final submission checklist

- [ ] Registration confirmed on hack2skill dashboard; dashboard requirements read and added to STATUS.md
- [ ] Exact deadline hour confirmed (or submit by 2026-11-20 12:00 GST)
- [ ] `make test` green; `make eval` regenerated; `make e2e` green
- [ ] Public URL live and T-E2E-06 passed against it; local `make demo` verified from clean clone
- [ ] README judge guide; LIMITATIONS.md; data/SOURCES.md with licences; MIT LICENSE
- [ ] Screenshots 1–7 captured
- [ ] 2-minute video recorded and link tested logged-out
- [ ] Submission text from doc 09 §1/§12 with real numbers from report.md
- [ ] Repo tagged `v1.0-submission`; STATUS.md final
- [ ] Grep for banned wording and for "TODO" in UI strings
