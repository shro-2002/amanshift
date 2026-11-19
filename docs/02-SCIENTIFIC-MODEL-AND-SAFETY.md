# 02 — Scientific Model and Safety

Status: FROZEN v1.0 (2026-11-19). Every value in §4 must appear in `policy/abudhabi-heat-v1.json` with the same citation and a golden test.

## 1. Fundamentals and the three things we must not confuse

| Quantity | What it is | How AmanShift gets it | Label in UI |
|---|---|---|---|
| **Environmental forecast** | Model-predicted air temperature, humidity, wind, radiation on a ~km grid | Open-Meteo | "forecast" |
| **Estimated WBGT** | WBGT *modelled* from forecast (or observed) weather with the Liljegren method | thermofeel | "estimated WBGT" — never "measured" |
| **Measured WBGT / TWL** | Instrument readings onsite (globe, natural wet bulb, dry bulb, wind) | Manual entry from a meter | "measured" |
| **Physiological heat strain** | Core temperature, heart rate, dehydration in a person | **Not collected** | — |

Heat stress (environment + work + clothing) is screened. Heat strain (the body's response) is not predicted. Screening assumes healthy workers, hydrated, with the declared acclimatization; individual susceptibility is handled only by the escalation path and employer medical procedures.

## 2. Data sources and provenance

| Source | Use | Coverage verified 2026-11-19 | Licence / terms | Limits |
|---|---|---|---|---|
| Open-Meteo Previous Runs API (`*_previous_day1`) | Day-ahead forecast archive for evaluation and replay | Abu Dhabi grid point, 2022–2026 summers return complete hourly data; 2025 Jun–Sep: 2,928 hours, 0 nulls in T, RH, pressure, wind, instant shortwave and direct radiation | CC BY 4.0 data; free API for non-commercial use | Grid cell, not site; model mix chosen by Open-Meteo |
| Open-Meteo Forecast API | Live forecast (demo "today") | — | same | same |
| IEM ASOS archive, station OMAA | Observed T, dewpoint, RH, wind (evaluation reference) | 2025 Jun–Sep: 3,035 rows; on-the-hour reports pair with 2,927 forecast hours | Public; cite IEM | Airport surface; no radiation or globe; rate-limits rapid requests |
| thermofeel 2.3.0 | `calculate_wbgt_liljegren` | Installs, runs | Apache-2.0 | Model of WBGT |
| pvlib | Solar zenith angle | — | BSD-3 | — |
| Onsite meters | Measured WBGT/TWL (pilot) | none in MVP demo | — | Calibration, siting |

Every value carries `Provenance` (doc 03 §5).

## 3. Forecast-based screening method

1. Hourly forecast: T2m, RH2m, surface pressure, 10 m wind (m/s), instantaneous shortwave (SSRD) and direct radiation.
2. Solar geometry: cos(zenith) from pvlib at the hour's timestamp (instantaneous radiation variables).
3. **Sun WBGT estimate:** `calculate_wbgt_liljegren(t2_k, rh, pressure, va, ssrd, fdir = direct/ssrd, cossza)`.
4. **Shade WBGT estimate:** same call with `ssrd = ssrd − direct` (diffuse only) and `fdir = 0`. Shade blocks the direct beam, not diffuse sky radiation. This is a modelling assumption; real shade structures also change wind and longwave exchange.
5. Wind floor 0.5 m/s before the call (Liljegren is unstable at calm; documented engineering choice).
6. Add forecast margin δ (`forecast_margin_c`), selected on the train years with complete inputs — 2024 only, see STATUS.md SC1 (doc 06 §3).

Published accuracy: Liljegren et al. 2008 report agreement better than 1 °C against measured WBGT at US sites; no validation against measured WBGT in the Gulf was found, so ±1 °C is treated as optimistic. Kong & Huber 2022 show simplified WBGT approximations underestimate extreme heat in subtropical dry regions, which is why `calculate_wbgt_simple` is banned.

Feasibility smoke test (2025, in-sample, no tuning, not a result): day-ahead air temperature MAE ≈ 1.0 °C; the forecast-based sun estimate ran warmer than the observation-based estimate by ≈ 1.3 °C on average in daytime hours. The real evaluation is doc 06 §3.

## 4. Applicable guidance and exact rules

### 4.1 Abu Dhabi — ADOSH-SF Code of Practice CoP 11.0 "Safety in the Heat", v4.0 (15 Jul 2024), and ADOSH-SF Technical Guideline "Safety in the Heat" v4.0, published by ADPHC

Confirmed from the primary PDFs (ADPHC website). v4.0 renamed OSHAD-SF to ADOSH-SF "without changing requirements". Index: **Thermal Work Limit (TWL)**, described in the guideline as validated for Gulf conditions. A heat stress programme is required where ≥ 35 °C is reasonably foreseeable (CoP 11.0 §3.1.1(e)).

| TWL zone (guideline Table 1) | Values | Requirements used by AmanShift |
|---|---|---|
| Low risk / unrestricted | TWL 140–220+ | No TWL-based limit on self-paced work for educated, hydrated workers; light work water 0.6–1 L/h |
| Medium risk / cautionary | TWL 115–140 | No unacclimatized person to work; avoid working alone; heavy work 45 min work / 15 min rest; light work continuous self-paced, water 1–1.2 L/h; heavy work > 1.2 L/h |
| High risk | TWL < 115 | Strict work/rest cycling; no lone work; no unacclimatized workers; high-risk induction and permit; light work 45/15, heavy work 20/40; water > 1.2 L/h; 2 L personal bottle |

Other ADOSH requirements surfaced (not computed): acclimatization 5–7 days; unacclimatized = new or > 14 days off work; at least 2 L water every 2–3 h, programmed drinking every hour, personal ≥ 1 L container; shaded, cooled or air-conditioned rest areas; immediate access to medical attention; supervisors trained to recognise symptoms and call help; heat-stroke first aid (call emergency number, notify supervisor, move to shade, cool with water and fanning); incidents reported. Note: the guideline has **no TWL stop-work zone**; urine specific-gravity removal (≥ 1.030) is an individual medical procedure outside AmanShift's scope.

Boundary handling (design decision, conservative): TWL exactly 140 → Medium; exactly 115 → High. AmanShift never computes TWL; it only maps meter readings.

### 4.2 UAE federal midday break (MoHRE)
12:30–15:00, 15 June – 15 September 2026, outdoor work under direct sun. Confirmed only via secondary sources (MoHRE site refused automated access). Stored as policy `midday_break` with status "secondary-source"; verification is an open item.

### 4.3 NIOSH Criteria for a Recommended Standard: Occupational Exposure to Heat and Hot Environments (DHHS/NIOSH Pub. 2016-106) — public domain; text saved in `docs/sources/niosh-2016-106.txt`

Confirmed verbatim:
- "RAL [°C-WBGT] = 59.9 − 14.1 log10 M [W]" and "REL [°C-WBGT] = 56.7 − 11.5 log10 M [W]", "where M represents the metabolic rate in Watts (W)". REL applies to acclimatized healthy workers; RAL to unacclimatized workers.
- Metabolic rate "for a 1-hour TWA task basis that includes all activities … and all scheduled and nonscheduled rest periods (1 kcal·h⁻¹ = 1.16 W)"; "Hourly TWA WBGTs should be calculated for the combination of jobs (tasks), including all scheduled and unscheduled rest periods."
- Workload categories (as described in the document): light < 180 kcal/h; moderate 180–300; heavy 300–415; very heavy > 520 kcal/h.
- Clothing adjustment factors, Table 3-2 ("2006" column, adapted from Bernard/ACGIH): work clothing 0; cloth coveralls 0; double-layer cloth 3; SMS coveralls 0.5; polyolefin coveralls 1; limited-use vapour-barrier coveralls 11 (°C-WBGT).
- Worked example in the document: moderate task ≈ 300 kcal/h = 348.9 W. (The document reads 27.8 °C off Figure 8-2; the equation gives 27.46 °C. AmanShift uses the equation; the golden test documents this difference.)

### 4.4 Policy values (`policy/abudhabi-heat-v1.json`)

| Key | Value | Source / status |
|---|---|---|
| `niosh.rel` | 56.7 − 11.5·log10(M) | NIOSH 2016-106, confirmed |
| `niosh.ral` | 59.9 − 14.1·log10(M) | NIOSH 2016-106, confirmed |
| `metabolic_w.light` | 208.8 (180 kcal/h, top of light range) | Category bounds as quoted in NIOSH 2016-106 from ACGIH guidance (text extraction; verify the 415–520 kcal/h gap against the PDF at T0.2); conservative choice |
| `metabolic_w.moderate` | 348.9 (300 kcal/h) | NIOSH example value, confirmed |
| `metabolic_w.heavy` | 481.4 (415 kcal/h) | same source as light; verify |
| `metabolic_w.very_heavy` | 603.2 (520 kcal/h, lower bound of open range) | NIOSH category bound; *not* conservative — flagged |
| `metabolic_rest_w` | 105 | Physiology example in NIOSH 2016-106 Ch. 3 ("at rest, if M = 105 W"), not a policy table value; flagged for OH review |
| `clothing_adjustment_c` | standard 0, cloth coveralls 0, double layer 3, SMS 0.5, polyolefin 1, vapour barrier 11 | NIOSH Table 3-2, confirmed |
| `work_fractions` | 1.0, 0.75, 0.5, 0.333, 0.25 | NIOSH 60/45/30/15 min-per-hour schedules + ADOSH 20/40 |
| `twl_zones` | low > 140; medium 115 < TWL ≤ 140; high ≤ 115 | ADOSH Tech. Guideline Table 1, confirmed; boundary rule conservative |
| `twl_caps` | medium: light→level ≥ 2, heavy/moderate→f ≤ 0.75, unacclimatized/mixed→level 4, crew size 1→level 4; high: light→f ≤ 0.75, heavy/moderate→f ≤ 0.333, unacclimatized/mixed→4, size 1→4 | ADOSH Table 1; mapping of "moderate" to ADOSH "heavy" is a conservative design decision |
| `midday_break` | 12:30–15:00, 06-15 to 09-15, direct-sun outdoor | MoHRE via secondary sources |
| `forecast_margin_c` (δ) | chosen from {0, 0.5, 1.0, 1.5, 2.0} on 2024 (SC1) | AmanShift engineering parameter |
| `clim_p99` | 99th percentile (≈ 31 samples per cell after SC1) of forecast-based estimates + δ, month × hour × {sun, shade}, 2024 | AmanShift derived; called "seasonal 99th percentile" in UI, not "maximum" |
| `forecast_max_retrieval_age_h` / `forecast_max_issue_age_h` | 3 / 30 | engineering parameters |
| `resource_confirmation_ttl_min` | 30 | engineering parameter |
| `max_walk_min` | shade 5, cooled_rest 10, water 5 | engineering parameters, configurable per site |
| `offline_stale_after_min` / `offline_expiry_min` | 60 / 180 | engineering parameters |
| `level_dwell_steps` | 2 (× 15 min) | engineering parameter |
| `coverage_priority_by_level` | {1:1, 2:2, 3:5, 4:10} | engineering parameter (ordering only matters) |

"Engineering parameter" = AmanShift design choice, not a scientific or regulatory value; each is shown as such in S12.

### 4.5 Why two regimes and how they combine
Abu Dhabi's legal index is TWL, which needs onsite instruments; no validated open TWL implementation exists, so AmanShift does not compute it. For day-ahead planning without instruments, AmanShift uses the NIOSH WBGT framework on estimated WBGT. **Combination in the MVP: required level = max(NIOSH-based level, TWL-zone level if a reading exists).** This can be stricter than the Abu Dhabi legal minimum. Bates & Schneider (2008) found self-paced UAE construction workers without physiological strain at conditions where WBGT limits would restrict work, and argued WBGT is too conservative for the Gulf. We accept that conservatism in the MVP, report its cost (doc 06 §7), and list "TWL-primary mode when a fresh meter reading exists" as a future option requiring occupational-health review (doc 11).

## 5. Workload, PPE, acclimatization categories
Workload: light, moderate, heavy, very heavy (NIOSH categories), selected by the supervisor per task. PPE: six NIOSH clothing classes. Acclimatization: acclimatized, unacclimatized (new or > 14 days off, ADOSH), mixed (treated as unacclimatized). Exposure: direct sun, shaded outdoor, indoor unconditioned (indoor uses the shade estimate; flagged as approximate).

## 6. Fail-safe invariant (formal)

**State.** s = (E, C, R, N, t, π) with evidence E (each item: value, kind ∈ {measured, forecast, fallback}, trust tier τ ∈ {fresh ≺ stale ≺ lost}), crew context C, resource states R (each ρ ∈ {up ≻ unconfirmed ≻ unknown ≻ down} with confirmation time), connectivity N ∈ {online ≻ degraded ≻ offline}, evaluation time t, policy π.

**Fixed evaluation context.** κ = (C, t, π, task assignment). The invariant compares states with equal κ.

**Degradation.** s′ ⊑ s (s′ is a degradation of s) iff κ(s′) = κ(s) and s′ is obtained by any finite sequence of: lowering an evidence item's trust tier (value retained as cached), lowering a resource state, ageing a confirmation, lowering connectivity. Meter readings are never removed (append-only).

**Uncertainty set.** For each zone-hour, U(s) ⊂ ℝ is the set of WBGT values consistent with the evidence; the kernel uses ū(s) = max U(s) computed as in doc 05 §2. Lowering trust adds candidates (e.g., the seasonal p99 bound) and removes none, so U(s) ⊆ U(s′) ⇒ ū(s) ≤ ū(s′).

**Permitted actions.** A(s) = ∏_c A_c(s) with A_c from doc 05 §5, determined by ū, edges E(s) = {(c,r) : ρ_r = up, confirmation fresh, walk ≤ limit}, and floors.

**Invariant.** ∀ s, s′: s′ ⊑ s ⇒ A_c(s′) ⊆ A_c(s) for every crew c (equivalently, effective level non-decreasing).

**Proof sketch.** (i) ū is non-decreasing under ⊑. (ii) feasibility `f·W_w + (1−f)·W_r ≤ limit(f·M_w + (1−f)·M_r)` has a left side non-decreasing in (W_w, W_r) and a right side independent of W, so the feasible f-set shrinks. (iii) Lowering ρ or ageing confirmation removes edges, never adds. (iv) Floors depend on t, κ and append-only events, which ⊑ leaves unchanged or adds to. (v) A_c is built monotonically from (ii)–(iv). ∎ Multi-failure scenarios are sequences of degradations; ⊑ is transitive, so they are covered. Property tests (doc 06 §4) check this executable claim, including composition.

**Recovery (relaxation).** Relaxation is information gain (s ⊒ s′) and is allowed only when (a) the evidence is fresh, (b) resources are physically reconfirmed (`down → unconfirmed → up`), (c) the lower level persists for `level_dwell_steps`, and (d) no active escalation exists.

**Offline client.** The pack contains, per crew and 15-min step, the planned level and the server-computed worst-case level (stale forecast tier + all resources unconfirmed). The client displays `max(planned, worst_case if elapsed ≥ offline_stale_after_min or confirmations expired)`, and 4 after `offline_expiry_min`. This is the same kernel evaluated in advance; the client only takes maxima.

### Policy correctness vs occupational safety
The invariant and the checker establish **policy correctness**: the software applies the cited rules and never loosens them on failure. They do not establish **occupational safety**: whether workers are protected depends on the rules being adequate, inputs being honest, and controls being followed. Only a field pilot can address the latter.

## 7. Missing, stale and contradictory data

| Situation | Treatment |
|---|---|
| Forecast fresh | ū = estimate + δ |
| Forecast stale or feed lost | ū = max(cached estimate + δ, clim_p99) |
| Never any forecast | ū = clim_p99 (forecast-based + δ, so not cooler than the fresh tier on average) |
| Meter WBGT reading | Added as candidate for the zone and its location type (sun or shade) for the rest of the local day (can only tighten) |
| Several TWL readings | Lowest TWL of the local day per zone applies |
| Meter lower than forecast (contradiction) | Max rule keeps the higher value; UI flags "meter lower than estimate — check meter siting" |
| TWL reading | Zone floor per §4.4 for the rest of the local day |
| Resource heartbeat missing / unconfirmed | No edge |
| Device offline | Offline client rule (§6) |
| Policy version mismatch | Checker rejects (C8) |

## 8. Limitations of weather-based screening
Grid cell ≠ site microclimate; no reflected heat from concrete, steel or asphalt; no enclosed-space heat; shade model approximate; forecast humidity errors dominate WBGT error; airport reference is not a worksite; Liljegren not validated against Gulf measurements; NIOSH limits may be conservative for self-paced Gulf workers; metabolic rates are category assumptions, not measurements.

## 9. Alert severity definitions

| Level | Condition (doc 05 §3) | Worker action (card) | Supervisor action |
|---|---|---|---|
| 1 STANDARD | f = 1 feasible and W ≤ RAL | Drink water every hour | Standard programme (ADOSH) |
| 2 INCREASED CARE | f = 1 feasible, W > RAL (acclimatized only), or TWL Medium + light work | Drink water every hour; rest in shade if unwell | Check water, buddy system, no lone work |
| 3 WORK / REST | only f ≤ 0.75 feasible, with covered rest | Work X min, rest Y min in shade/cool room | Enforce cycle; confirm rest area |
| 4 STOP | no feasible work option, or floor | Stop work; go to shade/cool room; drink; tell supervisor | Stop or reschedule task (defer); check crew |
| Escalation overlay | crew symptom report | Stop; cool; call medic/emergency number | Medic response; incident report |

## 10. Human oversight and escalation boundaries
Supervisors approve every plan and may tighten at any time. No human or automated path can approve a plan the checker rejects. Escalations require medic closure. AmanShift never diagnoses, never clears a worker to return, and never replaces the employer's competent person or emergency procedures.

## 11. Scientific validation methodology (summary)
Reference reproduction (golden tests), historical day-ahead skill against OMAA-derived references with chronological holdout and baselines, property tests of the invariant, checker mutation tests, planner benchmarks, cost of safety. Clinical outcomes are not validated (doc 06 §14). Full plan: doc 06.

## 12. References
- ADPHC. ADOSH-SF CoP 11.0 Safety in the Heat, v4.0, 15 Jul 2024; ADOSH-SF Technical Guideline Safety in the Heat, v4.0. adphc.gov.ae (PDFs).
- NIOSH. Criteria for a Recommended Standard: Occupational Exposure to Heat and Hot Environments. DHHS (NIOSH) Pub. No. 2016-106.
- Liljegren JC et al. J Occup Environ Hyg 2008;5:645–655. doi:10.1080/15459620802310770.
- Brimicombe C et al. GeoHealth 2023;7:e2022GH000701. doi:10.1029/2022GH000701.
- Kong Q, Huber M. Earth's Future 2022;10:e2021EF002334. doi:10.1029/2021EF002334.
- Brake DJ, Bates GP. Appl Occup Environ Hyg 2002. doi:10.1080/104732202753438261.
- Miller VS, Bates GP. Ann Occup Hyg 2007;51(6):553–561. doi:10.1093/annhyg/mem035.
- Bates GP, Schneider J. J Occup Med Toxicol 2008;3:21. doi:10.1186/1745-6673-3-21.
- Joubert D et al. Am J Public Health 2011. doi:10.2105/AJPH.2009.189563.
- Tustin AW et al. MMWR 2018;67(26):733–737 (NIOSH limits 100% sensitive for 14 fatal outdoor cases).
- MoHRE midday break 2026: secondary sources (WhatsOn 14 Jun 2026; Dubai Media Office).
