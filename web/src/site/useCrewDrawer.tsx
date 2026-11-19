import { useCallback, useState } from "react";
import { api } from "../api/client";
import { CrewDetail } from "../components/CrewDetail";
import { levelOf } from "./derive";
import { useSite } from "./SiteContext";

/** Shared crew drawer: any screen can open crew detail (with the symptom-report flow). */
export function useCrewDrawer() {
  const { s, override, run } = useSite();
  const [open, setOpen] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const crew = s?.crews.find((c) => c.crew_id === open);
  const drawer = s && crew ? (
    <CrewDetail crew={crew} level={levelOf(crew, override)} s={s} onClose={close}
      onEscalate={(id) => { setOpen(null); run("Symptom report", () => api.escalate(id)); }} />
  ) : null;
  return { openCrew: setOpen, drawer };
}
