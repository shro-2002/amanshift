import { useCallback, useState } from "react";
import { MapDrawer } from "../components/MapDrawer";
import { WorksiteMap, type Layers, type Sel } from "../components/WorksiteMap";
import { usePath } from "../router";
import { useSite } from "../site/SiteContext";
import { useCrewDrawer } from "../site/useCrewDrawer";

function parseSel(v: string | null): Sel {
  const m = v ? /^(crew|resource|zone):([\w-]+)$/.exec(v) : null;
  return m ? { kind: m[1] as NonNullable<Sel>["kind"], id: m[2] } : null;
}

const LAYER_LABEL: [keyof Layers, string][] = [["crews", "Crews"], ["resources", "Resources"], ["links", "Assigned links"]];

export function Worksite() {
  const { s, override } = useSite();
  const { search } = usePath();
  const { openCrew, drawer } = useCrewDrawer();
  const initial = parseSel(search.get("sel"));
  const [sel, setSel] = useState<Sel>(initial?.kind === "crew" ? null : initial);
  const [layers, setLayers] = useState<Layers>({ crews: true, resources: true, links: false });
  const select = useCallback((next: Sel) => { if (next?.kind === "crew") openCrew(next.id); else setSel(next); }, [openCrew]);
  if (!s) return <div className="skeleton" aria-busy="true" />;
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Worksite</h1><p>Zones, shade, cooling and water, and where each crew works. Select anything for availability, dependants and what happens if it fails.</p></div>
        <div className="map-toolbar" role="group" aria-label="Map layers">
          {LAYER_LABEL.map(([k, label]) => (
            <label key={k} className="toggle"><input type="checkbox" checked={layers[k]} onChange={(e) => setLayers({ ...layers, [k]: e.target.checked })} />{label}</label>))}
        </div>
      </div>
      <section className="card map-card" aria-label="Worksite plan">
        <div className="map-scroll"><WorksiteMap s={s} override={override} sel={sel} onSelect={select} layers={layers} /></div>
      </section>
      <MapDrawer s={s} sel={sel} onSelect={setSel} onOpenCrew={openCrew} />
      {drawer}
    </div>
  );
}
