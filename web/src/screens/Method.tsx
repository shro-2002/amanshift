// S12 Methodology & limitations — plain language, ≤ 1,200 words (doc 04 §6).
export function Method() {
  return (
    <main className="prose">
      <h1 style={{ fontSize: "var(--t-24)" }}>Methodology &amp; limitations</h1>
      <h2>What AmanShift is — and is not</h2>
      <p>AmanShift is crew-level decision support for supervisors of outdoor work in Abu Dhabi. It says what protection a crew needs now. It does not diagnose anyone, does not authorize work, and does not replace the employer's competent person or emergency procedures. Data may not be used to rank, discipline, hire, fire or pay workers.</p>
      <h2>Estimated versus measured WBGT</h2>
      <p>Weather forecasts give air temperature, humidity, wind and sunshine on a grid cell, not at the worksite. AmanShift turns them into an <b>estimated</b> wet-bulb globe temperature (WBGT) with the Liljegren method (thermofeel 2.3.0) and solar geometry from pvlib. Shade is modelled by removing the direct sunbeam. Estimates are never called "measured". A forecast margin δ (0.5 °C, chosen on 2024 data only) is added. Onsite meter readings can only raise the value used, never lower it.</p>
      <h2>Thermal Work Limit (TWL)</h2>
      <p>Abu Dhabi's Code of Practice ADOSH-SF CoP 11.0 (v4.0, 2024) uses TWL with three zones: low risk above 140, medium 115–140, high below 115 W/m². AmanShift never computes TWL; it only maps readings typed in from an onsite meter, using the lowest reading of the day per zone. Boundary values go to the higher-risk zone. The guidance has no TWL stop-work zone; AmanShift applies its caps and its rules against unacclimatized and lone work.</p>
      <h2>NIOSH limits and levels</h2>
      <p>For each crew, the effective WBGT (estimate + δ + clothing adjustment from NIOSH Table 3-2) is compared with the NIOSH Recommended Exposure Limit (acclimatized) or Recommended Alert Limit (unacclimatized or mixed crews), REL = 56.7 − 11.5·log₁₀M and RAL = 59.9 − 14.1·log₁₀M, as one-hour time-weighted averages including rest. The largest permitted work fraction (60, 45, 30, 20 or 15 minutes per hour) sets the level: 1 STANDARD, 2 INCREASED CARE, 3 WORK / REST, 4 STOP. The federal midday break (12:30–15:00, 15 June–15 September, direct sun) is always STOP. The NIOSH screen is often stricter than Abu Dhabi's legal minimum, and some studies of self-paced Gulf workers suggest it may be conservative; we accept that and report its cost.</p>
      <h2>Protection coverage</h2>
      <p>A work/rest cycle only helps if the rest area exists. Shade, cooled rest and water are graph nodes with capacity. A crew can use a resource only if it is confirmed up within the last 30 minutes and within walking limits (shade 5, cooled rest 10, water 5 minutes). Work below a full hour needs an assigned rest resource; all work needs water.</p>
      <h2>The fail-safe property</h2>
      <p>For the same task, policy and evaluation time, losing information or protective resources must never enlarge the set of permitted actions: if s′ is a degradation of s, then A<sub>c</sub>(s′) ⊆ A<sub>c</sub>(s) for every crew. Stale or lost forecasts keep their cached value <i>and</i> add a seasonal 99th-percentile bound; lost resources remove edges; floors only add. Relaxation needs fresh data, physical reconfirmation of repaired resources, and two 15-minute ticks of the lower level. Offline devices never re-plan: they only show the maximum of server-computed planned and worst-case levels, and STOP-HOLD after 3 hours. This is tested on thousands of generated degradations (see Evidence).</p>
      <h2>Independent checker — and its limit</h2>
      <p>Every plan is checked by a separate package with no shared code that re-derives limits, bounds and coverage from the policy file and evaluates ten declarative rules with citations. Only approved plans can be applied; no override exists. Residual common-mode risk remains: same developer, same policy file, same specification.</p>
      <h2>What is synthetic, what is real</h2>
      <ul><li><b>Real:</b> Abu Dhabi weather — archived day-ahead forecasts (Open-Meteo Previous Runs, CC BY 4.0) and airport observations (IEM ASOS, OMAA).</li>
        <li><b>Synthetic:</b> Demo Site A — crews, resources, walk times. No real worksite or health data is used.</li>
        <li><b>Engineering parameters:</b> δ, staleness limits, walking limits, offline expiry, dwell — design choices, shown as such in the policy file.</li></ul>
      <h2>Not validated</h2>
      <p>Policy correctness (the software applies the cited rules and never loosens them on failure) is tested. Occupational safety — whether workers are actually protected — is not shown and needs a field pilot with onsite meters. Liljegren has not been validated against Gulf measurements; the airport is not a construction site; there is no reflected heat from concrete or steel; metabolic rates are category assumptions; translations are pending native review; the midday-break 2026 dates come from secondary sources.</p>
      <h2>Governance</h2>
      <p>No names, employee IDs, phone numbers, photos, biometrics or locations exist in the system. The crew is the smallest unit. Plans, verdicts, overrides and escalations go to a hash-chained, append-only log; escalation payloads are purgeable without breaking the chain. Supervisors can make plans stricter, never looser than the checker allows.</p>
    </main>
  );
}
