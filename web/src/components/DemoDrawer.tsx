interface Props {
  busy: boolean; simulatedOffline: boolean;
  run: (label: string, fn: () => Promise<unknown>) => void;
  api: typeof import("../api/client").api;
  setSimulatedOffline: (v: boolean) => void; fastForward: (min: number) => void;
}

// S6 failure injection (demo mode only). Every button creates a new snapshot + logged event.
export function DemoDrawer({ busy, simulatedOffline, run, api, setSimulatedOffline, fastForward }: Props) {
  return (
    <section className="panel demo" aria-label="Demo controls">
      <span className="label">Demo controls — simulated failures (each is logged)</span>
      <button disabled={busy} onClick={() => run("Cooling R2 fails", () => api.inject("resource_down", "R2"))}>❄︎ Cooling R2 fails</button>
      <button disabled={busy} onClick={() => run("Shade R1 fails", () => api.inject("resource_down", "R1"))}>⛱ Shade R1 fails</button>
      <button disabled={busy} onClick={() => run("Forecast stale", () => api.inject("forecast_stale"))}>Forecast goes stale (+4 h)</button>
      <button disabled={busy} onClick={() => run("Forecast lost", () => api.inject("forecast_lost"))}>Forecast feed lost</button>
      <button disabled={busy} onClick={() => run("Meter 34.5", () => api.inject("meter_reading", "Z2", { zone: "Z2", location: "sun", wbgt: 34.5 }))}>Meter reads 34.5 °C at Z2</button>
      <button disabled={busy} aria-pressed={simulatedOffline} onClick={() => {
        if (!simulatedOffline) run("Network offline", () => api.inject("network_offline"));
        setSimulatedOffline(!simulatedOffline);
      }}>{simulatedOffline ? "Reconnect network" : "Network offline (client)"}</button>
      {simulatedOffline && <button onClick={() => fastForward(65)}>Advance offline clock +65 min</button>}
      <button disabled={busy} onClick={() => run("Restore all", () => api.inject("restore_all"))}>Restore all (repairs need confirmation)</button>
      <button disabled={busy} onClick={() => run("Confirm R2", () => api.confirm("R2"))}>Supervisor confirms R2 physically</button>
      <button disabled={busy} onClick={() => run("+15 min", () => api.inject("time_advance", undefined, { steps: 1 }))}>Advance 15 min (dwell tick)</button>
      <button disabled={busy} onClick={() => run("Reset", () => api.load())}>Reset scenario</button>
    </section>
  );
}
