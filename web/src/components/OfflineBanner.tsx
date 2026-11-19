import { useI18n } from "../i18n/i18n";
import type { OfflineView } from "../offline/useOffline";

function dur(min: number): string {
  const h = Math.floor(min / 60), m = Math.floor(min % 60);
  return h ? `${h} h ${m} m` : `${m} m`;
}

// S10 banner variants. Levels shown can only be >= cached levels (property-tested degrader).
export function OfflineBanner({ view }: { view: OfflineView }) {
  const { t } = useI18n();
  if (!view.offline) return null;
  const p = view.pack;
  const toConservative = p ? Math.max(0, Math.ceil(Math.min(p.stale_after_min, p.confirmations_expire_after_min) - view.elapsedMin)) : 0;
  const toExpiry = p ? Math.max(0, Math.ceil(p.expires_after_min - view.elapsedMin)) : 0;
  const text = view.mode === "expired" ? t("offline_expired")
    : view.mode === "conservative" ? t("offline_stale", { dur: dur(view.elapsedMin) })
    : t("offline_fresh", { min: toConservative });
  return (
    <div className="banner hatch" role={view.mode === "expired" ? "alert" : "status"} aria-live={view.mode === "expired" ? "assertive" : "polite"}>
      <strong>{view.mode === "expired" ? "⬢ STOP-HOLD" : "Offline"}</strong>
      <span>{text}</span>
      {view.mode !== "expired" && <span className="small muted">STOP-HOLD in {toExpiry} min</span>}
    </div>
  );
}
