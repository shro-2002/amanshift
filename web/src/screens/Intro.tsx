import { navigate } from "../router";

// S1 (text only, per amendment A13).
export function Intro() {
  return (
    <main>
      <section className="intro">
        <div>
          <h1>Protection must never weaken when information disappears.</h1>
          <ol className="claims">
            <li><b>Crew screening</b> — NIOSH limits on estimated WBGT from real Abu Dhabi day-ahead forecasts, ADOSH TWL zones from onsite meters, and the midday break.</li>
            <li><b>Coverage graph</b> — recommendations use only shade, cooled rest and water that actually exist, are confirmed and have capacity.</li>
            <li><b>Fail-safe kernel + independent checker</b> — stale forecasts, failed cooling or a dropped network can only make advice stricter; a separate checker rejects unsafe plans.</li>
          </ol>
          <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={() => navigate("/command?judge=1")}>Open demo site</button>
            <button onClick={() => navigate("/evidence")}>See the evidence</button>
          </p>
        </div>
        <div className="panel prose small">
          <h2>Judging moment (6 steps, ~2 minutes)</h2>
          <ol><li>Load the real 1 July 2026 morning at 10:30 GST — mixed levels, plan approved.</li>
            <li>Cooling cabin R2 fails — two crews lose their only rest area.</li>
            <li>Re-plan — the planner stops what it cannot protect; checker approves.</li>
            <li>Submit the old plan unchanged — the checker rejects it and cites the rules.</li>
            <li>Go offline — cards stay, in five languages, and only get stricter.</li>
            <li>Open the evidence — every number comes from <span className="mono">make eval</span>.</li></ol>
        </div>
      </section>
    </main>
  );
}
