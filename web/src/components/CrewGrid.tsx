import { Icon } from "../components/Icon";
import { LevelBadge } from "../components/LevelBadge";
import { actionText, crewName, levelOf, resName, taskContext, tzOffsetMin, zoneName } from "../site/derive";
import { useSite } from "../site/SiteContext";

export function CrewGrid({ onOpen }: { onOpen: (id: string) => void }) {
  const { s, override } = useSite();
  if (!s) return <div className="skeleton" aria-busy="true" />;
  const d = s.site.display;
  const tz = tzOffsetMin(s);
  const crews = [...s.crews].sort((a, b) => levelOf(b, override) - levelOf(a, override) || b.size - a.size);
  return (
      <div className="crew-grid">
        {crews.map((c) => {
          const lvl = levelOf(c, override);
          return (
            <button key={c.crew_id} className={`crew-card l${lvl}`} onClick={() => onOpen(c.crew_id)}>
              <span className="meta"><span>{zoneName(d, c.zone_id)}</span><span>{c.size} workers</span><span>id {c.crew_id}</span></span>
              <span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <h3>{crewName(d, c.crew_id)}</h3><LevelBadge level={lvl} degraded={c.degraded || lvl > c.display_level} english />
              </span>
              <span className="act">{actionText(c, d, tz)}</span>
              <span className="xs muted">{taskContext(c)}</span>
              <span className="protect">
                {c.action?.rest_resource && c.action_valid ? <span><Icon name="shade" size={14} />{resName(d, c.action.rest_resource)}</span>
                  : c.rest_edges.length === 0 ? <span className="none"><Icon name="alert" size={14} />No rest reachable</span> : null}
                {c.action?.water_resource && c.action_valid && <span><Icon name="water" size={14} />{resName(d, c.action.water_resource)}</span>}
                {c.escalated && <span className="none"><Icon name="medic" size={14} />Symptom report open</span>}
                {c.degraded && <span>Conservative: forecast degraded</span>}
              </span>
            </button>);
        })}
      </div>
  );
}
