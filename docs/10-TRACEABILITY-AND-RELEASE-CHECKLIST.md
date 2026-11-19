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

- [x] Registration confirmed on hack2skill dashboard (user, 2026-11-19); [ ] dashboard requirements read and added to STATUS.md (human)
- [ ] Exact deadline hour confirmed (or submit by 2026-11-20 12:00 GST)
- [x] `make test` green; `make eval` regenerated; `make e2e` green
- [ ] Public URL live and T-E2E-06 passed against it (human: hosting account); [x] Docker image built and T-E2E-06 passed against it
- [x] README judge guide; LIMITATIONS.md; data/SOURCES.md with licences; MIT LICENSE
- [ ] Screenshots 1–7 captured
- [ ] 2-minute video recorded and link tested logged-out
- [ ] Submission text from doc 09 §1/§12 with real numbers from report.md
- [ ] Repo tagged `v1.0-submission`; STATUS.md final
- [x] Grep for banned wording and for "TODO" in UI strings

## 5. Evidence (implementation, 2026-11-19)

| Req | Code | Tests | Artifact |
|---|---|---|---|
| FR-RISK-01 | `backend/amanshift/screening/wbgt.py` | `tests/golden/test_reference.py` (T-REF-01, T-REF-04) | `eval/out/reference_checks.json` |
| FR-RISK-02/03 | `engine/risk.py` `upper_bound`, `twl_zone` | `tests/unit/test_boundaries.py`, T-KER-05 | `eval/out/property_tests.json` |
| FR-RISK-04/05/06 | `engine/risk.py`, `policy/abudhabi-heat-v1.json` | T-REF-02/03, `tests/unit/test_worked_examples.py` | `eval/out/reference_checks.json` |
| FR-RISK-07 | `engine/risk.py` `midday_active` | `test_boundaries.py` (12:29/12:30/14:59/15:00; 14 Jun/15 Jun/15 Sep/16 Sep) | — |
| FR-RISK-08 | `backend/eval/forecast_eval.py` | T-EVAL-LEAK-01 (`LeakageError` guard) | `eval/out/delta_frozen.json`, `forecast_eval.json` |
| FR-COV-01..04 | `engine/coverage.py`, `api/session.py` | `test_boundaries.py` (TTL), `tests/integration/test_api.py` | — |
| FR-KER-01..05 | `engine/kernel.py` | `tests/property/test_kernel_props.py` (T-KER-01..07) | `eval/out/property_tests.json` |
| FR-PLN-01/02 | `engine/planner.py` (greedy; MILP P1 not built) | T-KER-04, T-KER-07 | `eval/out/planner_bench.json` |
| FR-CHK-01..03 | `backend/amanshift_checker/` | `tests/unit/test_checker_rules.py` (per rule, T-IND-01), `tests/golden/test_checker_cases.py`, T-CHK-DIFF | `eval/out/checker_mutation.json` |
| FR-UI-01/02 | `web/src/screens/*`, `web/src/components/*` | `web/tests/e2e/judging.spec.ts` (T-UI-01, T-UI-03) | — |
| FR-OFF-01..03 | `web/src/offline/degrader.ts`, `api/offline.py` | `web/tests/unit/degrader.test.ts` (T-OFF-01..03), e2e T-OFF-04 | — |
| FR-I18N-01 | `web/src/i18n/*.json` | `degrader.test.ts` (key completeness), e2e T-UI-02 | — |
| FR-ESC-01 | `api/app.py` `/escalations`, `CrewDrawer.tsx` | `test_api.py` (two-step, medic close) | — |
| FR-GOV-01..03 | `engine/models.py`, `store/log.py`, footer | `tests/unit/test_governance.py`, `test_api.py` (T-SEC-01/02/04/06) | `LIMITATIONS.md` |
| FR-EVAL-01/02 | `backend/eval/run_all.py`, `store/log.py` event kinds | `make eval` clean run | `eval/out/report.md` |
| T-E2E-06 | judge rail in `screens/Command.tsx` | `web/tests/e2e/judging.spec.ts` | passes locally and against the Docker image |

Release-blocking status (2026-11-19): RB1 clear (golden tests pass); RB2 clear (0 property violations; T-OFF tests pass); RB3 clear (0 safety-critical surviving mutants); RB4 clear (AST test); RB5 — UI numbers load from `eval/out` or the API; README and LIMITATIONS contain only cited policy values; RB6 clear (schema test); RB7 clear (grep + tests); RB8 — passes on local URL and Docker image; public URL needs a hosting account (human step, doc 08 §6 cut 6 applies until then); RB9 clear (`LIMITATIONS.md`).
