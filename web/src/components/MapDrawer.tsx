import { useEffect, useRef } from "react";
import type { SiteState } from "../api/client";
import { Icon } from "./Icon";
import { MapDetail } from "./MapDetail";
import type { Sel } from "./WorksiteMap";

interface Props { s: SiteState; sel: Sel; onSelect: (s: Sel) => void; onOpenCrew: (id: string) => void }

/** Selection drawer for the worksite plan (resource or zone). Crews use the crew drawer. */
export function MapDrawer({ s, sel, onSelect, onOpenCrew }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sel) return;
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onSelect(null); };
    window.addEventListener("keydown", k);
    return () => { window.removeEventListener("keydown", k); opener?.focus?.(); };
  }, [sel, onSelect]);
  if (!sel) return null;
  return (
    <>
      <div className="scrim" onClick={() => onSelect(null)} />
      <div className="drawer" role="dialog" aria-modal="true" aria-label="Selection detail" ref={ref} tabIndex={-1}>
        <header><span className="eyebrow">Worksite detail</span><button className="btn-ghost" onClick={() => onSelect(null)} aria-label="Close"><Icon name="close" /></button></header>
        <MapDetail s={s} sel={sel} onSelect={onSelect} onOpenCrew={(id) => { onSelect(null); onOpenCrew(id); }} />
      </div>
    </>
  );
}
