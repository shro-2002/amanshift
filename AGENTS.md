# AGENTS.md — AmanShift

## Mission
Build AmanShift: crew-level heat-protection decision support for outdoor workers in Abu Dhabi. Defining property: **for an unchanged task, policy and evaluation time, degradation of trusted information or loss of protective resources must not expand the set of permitted actions.**

## Authoritative documents (in precedence order)
1. `docs/02-SCIENTIFIC-MODEL-AND-SAFETY.md` and `policy/abudhabi-heat-v1.json` — science, thresholds, invariant.
2. `docs/05-DECISION-ENGINE-SPECIFICATION.md` — algorithms, checker rules.
3. `docs/03-SYSTEM-ARCHITECTURE.md`, `docs/04-UI-UX-AND-VISUAL-DESIGN.md`.
4. `docs/06-VALIDATION-AND-TESTING.md`, `docs/07-RESPONSIBLE-DESIGN-AND-THREAT-MODEL.md`.
5. `docs/08-IMPLEMENTATION-PLAN.md` (tasks, order, scope cuts), `docs/10-TRACEABILITY-AND-RELEASE-CHECKLIST.md` (release gates).
6. `docs/11-PRE-IMPLEMENTATION-AUDIT.md` — audit; its §4 amendments are already applied to docs 00–10 and **override any remaining conflicting text**.
`STATUS.md` records facts and progress; update it at every milestone.

## Scientific and safety restrictions (hard)
- Never call ordinary weather data "measured WBGT". Forecast-derived values are "estimated WBGT".
- Never compute TWL. Accept TWL only from onsite meters.
- Never implement physiological prediction, individual risk scores or new heat formulas. Use thermofeel (Liljegren) and the NIOSH equations exactly as cited.
- Every threshold lives in the policy JSON with a citation and a golden test. No magic numbers in code.
- Missing/stale/untrusted information may only tighten. Meters may only tighten in the MVP.
- No productivity term may precede safety in any objective.
- No names, IDs, biometrics or worker locations anywhere. Crew is the smallest unit.
- `amanshift_checker` must not import from `amanshift`.
- No UI text or field may imply authorization (`safe_to_work`, `cleared`, `authorized` are banned).

## Engineering conventions
Python 3.12, uv, ruff, mypy strict on `engine/` and `amanshift_checker/`, pydantic v2, pure functions in engine (no I/O, time passed in). TypeScript strict, React function components, CSS variables from doc 04 tokens, logical CSS properties for RTL. Conventional commits. Deterministic outputs (stable sorting, fixed seeds). Files < 400 lines.

## Testing expectations
`make test` must pass before every commit: golden reference tests, unit tests per checker rule (pass and fail case), hypothesis property tests (10,000 cases for T-KER-01/02), fast-check offline tests, AST independence test. `make eval` regenerates every number shown anywhere. UI numbers come only from `eval/out/*.json` or the API.

## Scope boundaries
Build only P0 items of doc 01, then P1 in doc 08 order. Out of scope: wearables, ML, chat, maps/GPS, routing, dust, auth beyond role stubs, payroll/HR.

## Changing specifications
Specs are frozen. If implementation reveals a spec defect: (1) do not silently diverge; (2) make the smallest safe change; (3) record it in `STATUS.md` under "Spec changes" with reason; (4) update the affected doc and doc 10 traceability. Any change that could loosen a protective rule requires a citation.

## Definition of done
A task is done when its acceptance tests pass, its requirement IDs are traceable in doc 10, no banned wording appears, STATUS.md is updated, and nothing in the UI claims an unvalidated result.
