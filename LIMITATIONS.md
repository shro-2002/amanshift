# Assumptions, dependencies and limitations

Official deliverable (FAQ: "assumptions, dependencies, limitations"). Sources: doc 02 §8, doc 07 §10–12, STATUS uncertainties U1–U6 and spec changes. Numbers referenced here live in `eval/out/report.md`.

## What AmanShift is not

- Not a medical device, not a diagnosis, not an individual risk score, not a physiological prediction.
- Not an authorization to work. It states what protection is required; it never says "you may work".
- Not for ranking, disciplining, hiring, firing or paying workers or crews.
- Not a replacement for the employer's competent person, heat-stress programme or emergency procedures.

## Assumptions

1. Workers are healthy, hydrated and have the declared acclimatization; individual susceptibility is handled only through the crew escalation path and employer medical procedures.
2. Supervisors enter crew workload, clothing, acclimatization and exposure honestly; metabolic rates are NIOSH/ACGIH category values (208.8, 348.9, 481.4, 603.2 W; rest 105 W), not measurements. The very-heavy value is the lower bound of an open range and the rest value comes from a physiology example in NIOSH 2016-106 — both flagged for occupational-health review.
3. Resource states (shade, cooled rest, water) are reported truthfully and physically reconfirmed every 30 minutes; repairs require reconfirmation.
4. Onsite meters, if used, are calibrated and sited correctly; their readings can only tighten levels.
5. The 2026 federal midday break (12:30–15:00, 15 June–15 September) is taken from secondary sources; the MoHRE site could not be read automatically.
6. Engineering parameters (forecast margin δ, staleness limits, walking limits, offline stale/expiry times, dwell) are design choices, labelled as such in the policy file.

## Dependencies

- Data: Open-Meteo Previous Runs API (day-ahead forecasts, CC BY 4.0, free for non-commercial use) and Iowa Environmental Mesonet ASOS archive (OMAA). Cached copies are committed; no keys or secrets are required.
- Software: thermofeel 2.3.0 (Liljegren WBGT), pvlib (solar geometry), FastAPI, pydantic, numpy/pandas/scipy, React, Vite, vite-plugin-pwa, idb-keyval. Exact versions are pinned in `backend/uv.lock` and `web/package-lock.json`.
- Guidance: NIOSH 2016-106 (REL/RAL, clothing adjustments, metabolic categories); ADOSH-SF CoP 11.0 v4.0 and Technical Guideline v4.0 (TWL zones); MoHRE midday break.

## Scientific limitations

- **Estimated, not measured, WBGT.** Forecast-derived values come from a ~km grid cell, not the site. Liljegren has not been validated against measured WBGT in the Gulf. No reflected heat from concrete, steel or asphalt; no enclosed-space heat.
- **Shade model is approximate** (diffuse radiation only); real shade structures also change wind and longwave exchange. Indoor unconditioned work uses the shade estimate.
- **Evaluation reference is partly circular.** METAR has no radiation or globe temperature, so the observation-based reference reuses forecast radiation (REF-SUN partly circular; REF-SHADE shares only diffuse radiation). The airport is not a construction site.
- **Training data limited to 2024.** Open-Meteo returns no day-ahead humidity, pressure, wind or radiation for 2022–2023, so δ and the seasonal 99th-percentile bound come from one summer (≈ 31 samples per month×hour cell). 2025 is a holdout exposed to an untuned planning smoke test; 2026 is the clean holdout.
- **Events are common.** Under NIOSH limits, work/rest is required in most summer work hours, so a high probability of detection is easy; read it next to the "always work/rest" baseline, false-alarm ratio and under-warning rate.
- **NIOSH may be conservative** for self-paced Gulf workers (Bates & Schneider 2008) and is stricter than Abu Dhabi's legal TWL minimum. AmanShift accepts that conservatism and reports its cost; a TWL-primary mode is deferred pending occupational-health review.

## Safety-property limitations

- The fail-safe property and the checker establish **policy correctness** (the software applies the cited rules and never loosens them on failure). They do not establish **occupational safety**; only a field pilot can.
- The checker is a separate package with no shared code, but the same developer wrote both from the same specification and policy file: common-mode errors remain possible.
- Degraded information is costly by design: a stale or missing forecast falls back to a seasonal 99th-percentile bound, and offline devices tighten to worst case after 30–60 minutes and STOP-HOLD after 3 hours. The measured cost is in `eval/out/cost_of_safety.json`.
- Offline devices cannot see new failures; they compensate only by tightening.

## Product and governance limitations

- The demo site is synthetic; no real worksite, crew or health data exist.
- Arabic, Hindi, Urdu and Bengali strings are pending native-speaker review; worker comprehension is untested.
- Authentication is a role-stub demo (supervisor / worker / medic headers), not production identity management. Demo state is kept per browser session in memory.
- Small crews can make a crew-level escalation identifying on site; crew size is shown only to the site supervisor view.
- The planner is a deterministic greedy heuristic; the lexicographic MILP planner is a P1 item and was not built. Greedy is not optimal on every site (see `eval/out/planner_bench.json`).
- Public deployment requires a hosting account; the reproducible path is `make demo`.

## Not validated

Reduction of heat illness or injury; accuracy against onsite measured WBGT/TWL; supervisor adherence; worker comprehension of translated cards. A stepped-wedge field pilot protocol is in doc 06 §14.
