# 07 — Responsible Design and Threat Model

Status: FROZEN v1.0.

## 1. Worker-first principles (binding on implementation)

- **G1 Protection before productivity.** No objective term, metric or UI element may trade a protective control for output. Work time is used only as the last tie-break among plans that are already permitted and equally protective, and is reported as the cost of safety.
- **G2 Crew, not person.** The unit of analysis is the crew. The system stores no names, employee IDs, photos, phone numbers, biometrics or worker locations.
- **G3 Decision support, not authorization.** Output says what protection is required; it never says "you may work". Wording rule: no screen or API field named `authorized`, `cleared` or `safe_to_work`.
- **G4 Restrictive by default.** Missing or untrusted information can only tighten (doc 02 §6).
- **G5 No disciplinary or employment use.** Data cannot be used to rank, score, discipline, hire, fire or pay workers or crews. Stated in the UI footer, API terms and data-sharing clauses.
- **G6 Human oversight.** Supervisors approve plans; they may make a plan *stricter* at any time; they may not override the checker to make it less strict (no such control exists).

## 2. Data minimization

| Data | Collected in MVP | Why / why not |
|---|---|---|
| Weather forecasts and observations | Yes | Core input; public data |
| Onsite WBGT/TWL meter readings | Yes, manual, per zone | Measured environmental truth |
| Crew size, workload class, PPE class, acclimatization class | Yes, per crew | Needed for limits; categorical, not personal |
| Symptom escalation | Yes, crew-level event only ("a worker in C2 is unwell") | Triggers stop + medic; no diagnosis, no identity. In crews of 1–4 the person may be identifiable to people on site; stated in S12 |
| Individual biometrics (HR, core temperature, sweat) | **No** | See §6 |
| Worker GPS / continuous tracking | **No** | Surveillance risk; zones are configured, not tracked |
| Individual medical history, age, medications | **No** | Clinical data; not needed for environmental controls |

## 3. Roles and access (RBAC)

| Role | Sees | Can do |
|---|---|---|
| Worker (shared crew screen, no login) | Own crew card | Report symptoms for the crew |
| Supervisor | Own site: crews, coverage, plans | Confirm resources, enter meter readings, approve plans, escalate |
| Site medic / HSE manager | Site + escalation log | Close escalations, export site aggregates |
| Company admin | Configuration | Configure site, crews, resources; no access to escalation payloads |
| Auditor / regulator (future) | Aggregates with small-cell suppression (n < 5 suppressed) | Read-only |

MVP implements two modes: Supervisor (default demo) and Worker card view; the role table is enforced in API middleware stubs with tests that a Worker token cannot read `/state` (T-SEC-02). Full authentication is out of MVP scope (single demo tenant) and is stated as a limitation.

## 4. Consent boundaries

- MVP processes no personal data, so no individual consent is required for operation. Crew symptom reports are voluntary and anonymous.
- Future optional wearables (not built): opt-in per worker, revocable any time without consequence, data stays on device by default, only a crew-level "elevated" flag leaves the device, worker sees everything first, no employer access to raw signals, independent ethics review before pilot. The consent design is a document stub only (doc 01 FUT-03).

## 5. Retention

- Event log: 12 months for operational events (plans, verdicts, resource states).
- Symptom escalation payload rows: deleted after 30 days; the hash chain keeps only payload digests, so integrity checks still pass; count per site-day retained.
- Demo deployment: reset on every scenario load.

## 6. Why the MVP excludes biometrics and continuous tracking

1. **Scientific:** turning wearable signals into individual heat-strain risk requires validated, device-specific models; none can be validated before 20 Nov.
2. **Safety:** a false "normal" from a sensor is false reassurance; environmental controls do not depend on it.
3. **Rights:** in employer-controlled settings, physiological and location data are prone to coercive or disciplinary use; the challenge itself warns of "intrusive surveillance".
4. **Field reality:** battery, dust, sweat, gloves and connectivity make sensor dropout common; a design that is safe without sensors is the robust base layer.

## 7. Threat model (STRIDE-lite)

| ID | Threat | Asset | Mitigation | Test |
|---|---|---|---|---|
| T1 | Supervisor tampers to loosen levels (e.g., marks dead cooler as up) | Worker safety | Recovery requires physical confirmation, logged with role and time; hash-chained log; confirmations expire after 30 min | T-SEC-04 |
| T2 | Forged meter reading lower than real | Levels | Meters can only tighten in MVP (max rule) | T-KER-05 |
| T3 | API injection / malformed payload | Integrity | pydantic validation, enum-only categorical fields, parameterized SQL | T-SEC-01 |
| T4 | XSS via crew/resource names | UI | React escaping; names restricted to `[A-Za-z0-9 _-]{1,24}` | T-SEC-03 |
| T5 | Event-log alteration | Audit trail | Append-only API, hash chain verified on read | T-SEC-04 |
| T6 | Stale offline device shows calm levels | Safety | Tighten-only degrader, expiry → STOP-HOLD | T-OFF-* |
| T7 | Checker bypass | Safety | Plans applied only via approved verdict; no override endpoint | T-SEC-06 (apply endpoint rejects unapproved plan ids) |
| T8 | Re-identification from crew data | Privacy | Crews ≥ 1 person can be small: crew size shown only to supervisor of that site; aggregates suppress n < 5 | T-SEC-05 |
| T9 | Dependency compromise | Integrity | Lockfiles committed; `pip-audit` and `npm audit` in CI; no runtime CDN scripts | CI |

## 8. Misuse cases and controls

| Misuse | Control |
|---|---|
| Use level history to rate crews' "productivity" | No per-crew productivity metric exists; exports are site-level |
| Pressure workers not to press "unwell" | Report is anonymous at crew level; escalation count is visible to HSE manager, not used in any KPI |
| Treat GREEN as "safe to work" | Wording rule G3; footer disclaimer; S12 explains limits |
| Use as compliance certificate | Every output says "decision support; follow ADPHC/OSHAD requirements and your competent person" |
| Run demo synthetic site as real | SYNTHETIC badge on every view of the demo site |

## 9. Safety controls against false reassurance

- Estimated WBGT is labelled "estimated from forecast"; never "measured".
- Shade estimate is never used for direct-sun crews.
- Exposure is set per task by the supervisor; `direct_sun` is the default for new crews, and shaded exposure is shown with its own badge so it can be challenged.
- Forecast uncertainty margin δ is added before comparison (doc 02 §5).
- Levels never drop within a dwell period after a rise (hysteresis).
- Symptom escalation always overrides: crew to STOP, medic notified, no automated "all clear".

## 10. Offline limitations (stated to users)

Offline devices show cached plans that cannot reflect new failures; they compensate only by tightening. A device offline for > 3 h shows STOP-HOLD, which may halt work unnecessarily; this cost is measured (doc 06 §7) and accepted.

## 11. Security testing (MVP)

`pip-audit`, `npm audit --omit=dev`, Semgrep default ruleset (if available), the T-SEC tests above, and a manual check that no secrets exist (none are needed).

## 12. Clinical and occupational boundaries

- No diagnosis, no individual risk score, no physiological prediction, no custom TWL formula.
- Escalation means "stop, cool, call the site medic/emergency"; first-aid content follows the employer's procedure and ADPHC materials, shown as a fixed card.
- Policy correctness (the software implements the cited rules faithfully) is distinct from occupational safety (workers are actually protected). Only the former is tested before submission; the latter requires a field pilot (doc 06 §14).
