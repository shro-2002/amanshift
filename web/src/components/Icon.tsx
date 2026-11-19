// One icon set (doc 12 §4.4): 24 px grid, stroke icons, currentColor. Also used as worker pictograms.
export type IconName =
  | "shade" | "cabin" | "water" | "crew" | "clock" | "alert" | "stop" | "phone" | "medic" | "forecast"
  | "meter" | "offline" | "online" | "check" | "chevron" | "map" | "overview" | "activity" | "help"
  | "play" | "shield" | "sun" | "close" | "menu" | "arrow" | "lock" | "x" | "refresh";

const P: Record<IconName, string> = {
  shade: "M3 10c3-4 15-4 18 0H3Zm9-4V4m0 6v10m-4 0h8",
  cabin: "M4 20V9l8-5 8 5v11H4Zm4 0v-6h8v6M9 9.5h6",
  water: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z",
  crew: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3.3 2.7-6 6-6s6 2.7 6 6m0-6.2A6 6 0 0 1 22 20",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 2",
  alert: "M12 3 2 20h20L12 3Zm0 6v5m0 3v.5",
  stop: "M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2L8.2 3ZM9 15l6-6m0 6L9 9",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z",
  medic: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z",
  forecast: "M7 18a4 4 0 0 1-.6-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9H7Z",
  meter: "M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0-2 4-4M4 18a9 9 0 1 1 16 0",
  offline: "M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7m4 0A10 10 0 0 1 19 13M2 9.5a15 15 0 0 1 4-2.6m5.5-1.4A15 15 0 0 1 22 9.5M12 20h.01",
  online: "M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 14 0M2 9.5a15 15 0 0 1 20 0M12 20h.01",
  check: "M4 12.5 9.5 18 20 6",
  chevron: "M9 6l6 6-6 6",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14",
  overview: "M4 4h7v7H4V4Zm9 0h7v4h-7V4Zm0 6h7v10h-7V10ZM4 13h7v7H4v-7Z",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.5-11.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14m0 3v.5",
  play: "M7 4.5v15L19 12 7 4.5Z",
  shield: "M12 3 4 6v6c0 5 3.4 8.4 8 9.5 4.6-1.1 8-4.5 8-9.5V6l-8-3Zm-3.5 9 2.5 2.5 4.5-5",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-14v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  close: "M6 6l12 12M18 6 6 18",
  menu: "M4 7h16M4 12h16M4 17h16",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  lock: "M6 11h12v10H6V11Zm2 0V8a4 4 0 1 1 8 0v3",
  x: "M6 6l12 12M18 6 6 18",
  refresh: "M20 11a8 8 0 0 0-14.5-4.5L4 8m0-4v4h4m-4 5a8 8 0 0 0 14.5 4.5L20 16m0 4v-4h-4",
};

export const ICON_PATHS = P;

interface Props { name: IconName; size?: number; stroke?: number; title?: string; className?: string }

export function Icon({ name, size = 20, stroke = 2, title, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" className={className}
      role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      <path d={P[name]} />
    </svg>
  );
}
