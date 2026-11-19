import { useState } from "react";
import { MapDetail } from "../components/MapDetail";
import { WorksiteMap, type Sel } from "../components/WorksiteMap";
import { usePath } from "../router";
import { useSite } from "../site/SiteContext";
import { useCrewDrawer } from "../site/useCrewDrawer";

function parseSel(v: string | null): Sel {
  const m = v ? /^(crew|resource|zone):([\w-]+)$/.exec(v) : null;
  return m ? { kind: m[1] as NonNullable<Sel>["kind"], id: m[2] } : null;
}

export function Worksite() {
  const { s, override } = useSite();
  const { search } = usePath();
  const [sel, setSel] = useState<Sel>(() => parseSel(search.get("sel")));
  const { openCrew, drawer } = useCrewDrawer();
  if (!s) return <div className="skeleton" aria-busy="true" />;
  return (
    <div className="page">
      <div className="page-head">
        <div><span className="eyebrow">Worksite</span><h1>Protection map</h1>
          <p>Zones, protective resources and crews. Select anything to see availability, capacity, dependants and what happens if it fails.</p></div>
      </div>
      <div className="ws-layout">
        <section className="card" aria-label="Worksite map"><div className="body"><div className="map-scroll">
          <WorksiteMap s={s} override={override} sel={sel} onSelect={setSel} />
        </div></div></section>
        <aside aria-label="Selection detail"><MapDetail s={s} sel={sel} onSelect={setSel} onOpenCrew={openCrew} /></aside>
      </div>
      {drawer}
    </div>
  );
}
