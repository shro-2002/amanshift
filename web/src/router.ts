import { useEffect, useState, type MouseEvent } from "react";

export function navigate(to: string, replace = false): void {
  if (replace) window.history.replaceState({}, "", to);
  else window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
  if (!replace) window.scrollTo(0, 0);
}

/** v1.0-rc1 routes kept working (README, video, tests) — doc 12 §3. */
export function legacyRedirect(path: string, search: URLSearchParams): string | null {
  if (path.startsWith("/command")) return search.get("judge") === "1" ? "/tour" : "/app";
  if (path.startsWith("/demo")) return "/tour";
  if (path.startsWith("/app/alerts")) return "/app/protection";
  if (path.startsWith("/app/crews")) return "/app/protection?tab=crews";
  if (path.startsWith("/app/resources")) return "/app/protection?tab=resources";
  if (path.startsWith("/cards") || path.startsWith("/offline")) return "/worker";
  if (path.startsWith("/evidence")) return "/help/validation";
  if (path.startsWith("/method")) return "/help/method";
  return null;
}

export function usePath(): { path: string; search: URLSearchParams } {
  const [loc, setLoc] = useState(() => ({ path: window.location.pathname, search: window.location.search }));
  useEffect(() => {
    const on = () => setLoc({ path: window.location.pathname, search: window.location.search });
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);
  return { path: loc.path, search: new URLSearchParams(loc.search) };
}

/** Internal link handler: keeps SPA navigation, lets modified clicks open new tabs. */
export const linkTo = (to: string) => (e: MouseEvent) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  navigate(to);
};
