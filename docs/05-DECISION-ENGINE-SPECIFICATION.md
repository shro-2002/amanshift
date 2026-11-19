# 05 — Decision Engine Specification

Status: FROZEN v1.0. All numeric constants come from `policy/abudhabi-heat-v1.json` (keys in `monospace`); values and citations are in doc 02 §4. Code contains no thresholds.

## 1. Inputs

| Input | Schema | Source |
|---|---|---|
| Evidence | `EnvEvidence` per zone-hour (doc 03 §5) | forecast pipeline, meter entries |
| Crews | `Crew` | site config |
| Resources, graph | `Resource`, `SiteGraph` | site config + state events |
| Context | `eval_time`, `policy_version`, `connectivity` | API |
| Plan history | last approved plan, last 2 effective levels per crew | event log |

Validation: pydantic enums; crew size 1–30; capacities 0–200; walk times 0–60 min; WBGT −10–50 °C; TWL 0–400 W/m². Invalid input → HTTP 422, no plan.

## 2. Environmental upper bound (why: make degradation monotone)

For crew c in zone z at time t, compute upper bounds `U_sun`, `U_shade` (°C):

```
def upper_bound(z, t, kind):                      # kind ∈ {sun, shade}
    cands = []
    fc = latest_forecast(z, t)                    # cached value is never deleted
    if fc is None:                                # never had a forecast
        cands.append(clim_p99[month(t)][hour(t)][kind])
    elif fresh(fc, t):                            # issued ≤ forecast_max_issue_age_h, retrieved ≤ forecast_max_retrieval_age_h
        cands.append(fc.value[kind] + delta)
    else:                                         # stale or feed lost: keep cached value AND seasonal bound
        cands += [fc.value[kind] + delta, clim_p99[month(t)][hour(t)][kind]]
    # clim_p99 = 99th percentile of FORECAST-based estimates (+delta) for month×hour, 2022–2024,
    # so the 'never had' tier is not systematically cooler than the fresh tier.
    # The forecast cache is never cleared within a scenario; a cache loss is a new scenario (new κ).
    for m in meter_readings(z, same_local_day(t), at_or_before=t):
        if m.meter_location == kind:              # sun meters bound sun; shade meters bound shade
            cands.append(m.wbgt)                  # persist for the day; can only tighten
    return max(cands)
```

Tiers are ordered fresh ⪯ stale ⪯ lost; each step adds candidates and never removes one, so the max is non-decreasing. `delta` = `forecast_margin_c` (frozen from training years, doc 06 §3). Shade bound uses diffuse radiation only (doc 02 §3).

## 3. Crew-context policy evaluation (why: crew-specific limits from NIOSH)

```
M_w   = metabolic_w[crew.workload]              # light/moderate/heavy/very_heavy
M_r   = metabolic_rest_w
CAV   = clothing_adjustment_c[crew.ppe]
acc   = crew.acclimatization == "acclimatized"   # "mixed" ⇒ False
limit(M) = REL(M) if acc else RAL(M)             # NIOSH equations, doc 02 §4
W_w   = (U_sun if crew.exposure == "direct_sun" else U_shade) + CAV

# W_rest uses the shade bound of the ASSIGNED rest resource's zone (cooled rest without a meter = shade bound).
def feasible(f, W_rest):                          # f ∈ work_fractions = [1.0, .75, .5, .333, .25]
    W_twa = f*W_w + (1-f)*(W_rest + CAV)
    M_twa = f*M_w + (1-f)*M_r
    return W_twa <= limit(M_twa)

f_max(covered) = min(twl_cap(crew, zone), max({f : feasible(f, U_shade if covered else W_w-CAV)} ∪ {0}))
```

Rules: f < 1 requires an assigned, trusted-up rest resource (`require_rest_resource_below_full_work`), so for uncovered crews only f = 1 is evaluable; if f = 1 is infeasible and the crew is uncovered, f_max = 0.

Raw level (with best available coverage; TWL caps included in f_max):
- **4** if `f_max(covered=True) == 0`, or a floor applies (§7), or the crew has no rest/water edge that would allow any work option (coverage-forced).
- **3** if `f_max(True) < 1` (includes TWL caps) and `f_max(True) ≥ 0.25`.
- **2** if `f_max = 1`, and `W_w > RAL(M_w)` or a TWL Medium light-work floor applies.
- **1** otherwise.

**Effective level** = max(raw_now, raw_prev) unless both raw values are lower than the previously shown level and all evidence at both ticks was fresh (dwell, §9). **Effective f cap** = min(f_max_now, f_max_prev) while dwelling. A_c (§5) is built from the effective f cap, so the shown level and the permitted actions can never disagree. `prev_eval` is part of the snapshot, so the checker sees it too.

TWL meter reading (zone, same local day) maps to ADOSH zones (`twl_zones`); `twl_caps` (doc 02 §4.4) cap f (Medium: moderate/heavy f ≤ 0.75; High: light f ≤ 0.75, moderate/heavy f ≤ 0.333), set level ≥ 2 for light work in Medium, and set level 4 for unacclimatized/mixed crews or crews of size 1 in Medium/High. No reading ⇒ `twl_cap = 1.0`. Level = max(level above, TWL minimum).

## 4. Protection Coverage Graph construction (why: recommendations must use controls that exist)

```
def edges(snapshot):
    E = {}
    for c in crews:
        for r in resources:
            if r.state != "up": continue                       # unconfirmed/unknown/down ⇒ no edge
            if age(r.last_confirmed_at) > resource_confirmation_ttl_min: continue
            if walk_min(c.zone, r.zone) > max_walk_min[r.type]: continue
            E[c].add(r)
    return E
```

Coverage of a plan: crew c is covered iff assigned a rest resource (shade or cooled_rest) and a water resource in E[c], and every resource's assigned persons ≤ capacity. Site coverage ratio = Σ size(covered) / Σ size. Complexity O(C·R).

## 5. Permitted action set and fail-safe degradation policy

Actions, ordered from most to least protective: `stop(r?)` > `defer(t*, r?)` > `work(0.25, r, w)` > `work(0.333, r, w)` > `work(0.5, r, w)` > `work(0.75, r, w)` > `work(1.0, r?, w)`.

```
if crew.escalation_active: A_c(s) = {stop(r, clinical_escalation=True) : r ∈ E_rest[c] ∪ {None}}   # nothing else
A_c(s) = {stop(r) : r ∈ E_rest[c] ∪ {None}} ∪ {defer(t, r) : t ≥ t*(s), t on today's 15-min grid, r ∈ E_rest[c] ∪ {None}}
       ∪ {work(f, r, w) : w ∈ E_water[c], r ∈ E_rest[c] ∪ ({None} if f == 1),
                          f ≤ f_cap_effective(covered = r is not None), effective_level(c) < 4}
Action enum (single source for API, planner, checker, UI): `work | stop | defer`, plus boolean `clinical_escalation`. Levels are integers 1–4.
```

`defer(t)`: t*(s) = earliest future time today (15-min grid, using the same upper bounds) where the required level ≤ 3; any t ≥ t* is permitted and the planner picks t*; shown as "move task to after HH:MM" (task timing / shift change). If none, `defer` is omitted. Because degradation can only raise future levels, t*(s′) ≥ t*(s), so the defer set also shrinks.

Properties (proved in doc 02 §6, tested T-KER-01..03): A_c is downward-closed in protectiveness; degradation shrinks A_c because U is non-decreasing (§2), feasibility is monotone in W (W_twa has non-negative coefficients), edges only disappear when resource trust drops, and floors only add.

## 6. Capacity and resource-allocation constraints, objective, infeasibility (planner)

Decision variables x[c,o] ∈ {0,1} for every option o ∈ A_c (≤ ~150 per crew).

Hard constraints:
- Σ_o x[c,o] = 1 for every crew.
- For every rest resource r: Σ size_c · x[c,o] over o using r ≤ capacity_r. Same for water resources.
- Options outside A_c do not exist (enforced by construction).

**P0 planner = greedy:** crews ordered by effective level desc, size desc, id asc; each takes the most protective-access option: nearest rest resource with remaining capacity, then nearest water, then the largest f in A_c; else stop(nearest rest with capacity or None). Deterministic.

**P1 planner = lexicographic MILP** (replaces greedy only if it passes all T-KER/T-CHK tests): solve 4 MILPs in sequence with `scipy.optimize.milp`, HiGHS; each stage adds the constraint "previous objective ≤ optimum + 1e-9"):
1. **Protection:** minimize Σ size_c · priority(level_c) · [no rest resource assigned]. Stopped crews still need shade/cooling to recover, so they count. `priority` = `coverage_priority_by_level` (level 4 > 3 > 2 > 1).
2. **Access:** minimize Σ size_c · walk_min(c, r).
3. **Stability:** minimize number of crews whose resource or action differs from the last approved plan.
4. **Work time (last tie-break among already-permitted, already-protected plans):** maximize Σ size_c · f_c.
Tie-break: add ε · lexicographic rank of (crew_id, option key) to stage 4 for determinism.

Productivity (stage 4) can never trade against stages 1–3, and no stage can choose an option outside A_c.

Infeasibility: the model is always feasible because `stop(None)` exists for every crew. A plan is reported `status = "protection_insufficient"` if any crew at required level ≥ 3 ends with no rest resource or any crew is forced to stop by capacity; the UI shows the banner and the list of crews. MILP falls back to greedy only on a non-optimal solver status (no wall-clock timeout, so output is machine-independent).

```
def plan(snapshot):
    A = {c: permitted_actions(c, snapshot) for c in crews}
    x = greedy(A, capacities)                      # P0; P1: lexicographic_milp with status-based fallback
    p = Plan(snapshot_id=snapshot.id, actions=decode(x), status=classify(x))
    p.checker = amanshift_checker.check(snapshot_json, p.json)   # separate package, JSON in/out
    return p
```

## 7. Floors (hard rules that only raise levels)

| Floor | Condition | Effect |
|---|---|---|
| Midday break | `exposure == direct_sun` and t within `midday_break` window and dates | level 4; only stop / defer(t ≥ 15:00) |
| TWL zone | onsite TWL reading in ADOSH Medium/High zone | caps and level floors per `twl_caps` (no TWL stop-work zone exists in Abu Dhabi guidance) |
| Escalation | crew `escalation_active` | level 4 + action `clinical_escalation` until medic closes |
| Offline expiry | client only, elapsed > `offline_expiry_min` | displayed level 4 (STOP-HOLD) |

## 8. Rule-checker predicates (`amanshift_checker`)

Input: snapshot JSON, plan JSON, policy JSON. The checker re-implements its own lookups (REL/RAL, CAV, metabolic table, upper bound, edges) in its own code. Output: `{verdict, violations[{rule, crew_id, message, citation}], rules_evaluated}`.

| Rule | Predicate (violation if false) | Citation |
|---|---|---|
| C1 | Every crew in snapshot appears exactly once in plan | doc 05 §6 |
| C2 | For work actions: f ≤ checker-computed f_max for that crew and assigned rest | NIOSH REL/RAL TWA, doc 02 §4 |
| C3 | No `work` for direct-sun crews inside the midday break window/dates | MoHRE midday break, doc 02 §4 |
| C4 | Every referenced resource is `up`, confirmed within TTL, within walk limit, and capacity not exceeded | doc 05 §4 |
| C5 | Work with f < 1 has a rest resource; every work action has a water resource | policy `require_*` keys, ADPHC guidance |
| C6 | Crews at checker-computed level 4 have only stop/defer/escalation | doc 05 §3, §7 |
| C7 | *Retired — folded into C2 (C2 uses RAL for unacclimatized/mixed crews)* | — |
| C8 | `plan.snapshot_id == sha256(canonical(snapshot))` and `plan.policy_version == policy.version` | doc 03 §10 |
| C9 | *Retired — folded into C2/C6 (checker computes its own upper bound, incl. stale/lost tiers)* | — |
| C10 | Escalated crews have `stop` + `clinical_escalation` | doc 07 §9 |
| C11 | Plan validates against the plan schema (action enum, fractions ∈ policy list, no extra fields) | doc 07 G3 |
| C12 | `defer(t)`: t ≥ checker-computed t*, and the crew's level at t ≤ 3 | doc 05 §5 |
| C6 note | C6 uses effective level incl. `prev_eval` dwell | doc 05 §3 |

Ten active rules (C1–C6, C8, C10–C12). Both kernel and checker compute from the **canonical snapshot JSON** (3-dp floats) so boundary cases cannot split. Approve iff no violations. Checker exceptions ⇒ `verdict = "error"` ⇒ plan not applied.

## 9. Recovery and reconfirmation

- Resource repair: `down → unconfirmed`; edges return only after supervisor confirmation (`up`, timestamp). Confirmation expires after `resource_confirmation_ttl_min`.
- Forecast recovery: fresh data restores the fresh tier.
- **Dwell:** see §3 (effective level and effective f cap). Evaluations occur on fixed 15-minute ticks.
- Escalation closes only by the medic role; then dwell applies.
- Relaxation is information *gain*, so the invariant does not constrain it; dwell and confirmation limit how fast it happens.

## 10. Worked examples (policy values from doc 02 §4.4: moderate 348.9 W, light 208.8 W, rest 105 W, CAV standard clothes 0; δ = 1.0 °C placeholder until frozen)

**E1 Covered moderate crew, acclimatized, direct sun.** Forecast fresh: W_sun 32.0, W_shade 29.0. U_sun = 33.0, U_shade = 30.0. f = 1: W_twa 33.0 > REL(348.9) = 27.46 ✗. f = 0.5: M_twa 227.0 → REL 29.61; W_twa 31.5 ✗. f = 0.333: M_twa 186.2 → REL 30.60; W_twa 31.0 ✗. f = 0.25: M_twa 166.0 → REL 31.17; W_twa 30.75 ✓. Level 3, action work(0.25) with shade → "15 min work / 45 min rest in shade".

**E2 Same crew, its shade fails, no other rest within walk limit.** Uncovered: f = 1 infeasible, no f < 1 allowed → A = {stop(None)} (+ defer if later hours drop). Effective level 4, plan status `protection_insufficient`.

**E3 Forecast goes stale (E1 inputs), clim_p99(Aug, 14h, sun) = 35.0 (illustrative).** U_sun = max(33.0, 35.0) = 35.0; U_shade = max(30.0, p99_shade) ≥ 30.0. f = 0.25: W_twa ≥ 0.25·35 + 0.75·30 = 31.25 > 31.17 ✗ → level 4. Level never below E1.

**E4 Unacclimatized light crew, shaded outdoor, morning.** U_shade = 26.5, M 208.8 W. RAL(208.8) = 59.9 − 14.1·log10 208.8 = 27.19 → f = 1 feasible; W ≤ RAL → level 1. (At U_shade = 27.5 the same crew would need work/rest.)

**E5 Meter at 13:00 reads 34.0 in zone Z2; forecast U_sun 33.0.** U_sun = 34.0 for Z2 for the rest of the day (tighten only).

All examples become unit tests (`tests/unit/test_worked_examples.py`) using the real policy file; expected values are recomputed by the test from the equations, and these hand values must agree to ±0.1 °C.

## 11. Boundary conditions
W exactly equal to limit ⇒ feasible (≤). Midday window inclusive start, exclusive end. Resource confirmation at exactly TTL ⇒ still valid; TTL + 1 s ⇒ expired. Capacity exactly equal ⇒ allowed. Crew size larger than every capacity ⇒ only stop(None)/defer(None). Empty crews ⇒ empty plan, approved. No water resource in reach ⇒ no work option ⇒ stop.

## 12. Complexity
Upper bounds O(Z·H); f_max O(|F|) per crew per rest option; edges O(C·R); options O(C·R_rest·R_water·|F|) ≤ ~1,500 binaries; four HiGHS solves ≪ 1 s for C ≤ 12, R ≤ 10 (benchmarked, doc 06 §6). Checker O(C·R).

## 13. Determinism and reproducibility
Canonical JSON (sorted keys, fixed float formatting to 3 dp) for snapshot hashing; crews and resources sorted by id; no randomness at runtime; solver time limit 2 s with deterministic fallback; policy version in every output.

## 14. How each algorithm is tested
| Algorithm | Tests |
|---|---|
| Upper bound | unit per tier; T-KER-01/02 |
| Crew policy | T-REF-02, worked examples, boundary tests |
| Coverage | unit edges/TTL/walk; state machine |
| Permitted set | downward-closure test; T-KER-01..03 |
| Planner | T-KER-04, T-KER-07, planner bench |
| Checker | per-rule pass/fail unit tests, plan-mutation kill rate, differential fuzzing vs kernel A_c (T-CHK-DIFF), 10 hand-computed adversarial cases, T-IND-01 |
| Recovery | T-KER-06 |
