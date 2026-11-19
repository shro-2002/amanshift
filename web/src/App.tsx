import { useEffect } from "react";
import { AppShell } from "./app/AppShell";
import { legacyRedirect, navigate, usePath } from "./router";
import { Activity } from "./screens/Activity";
import { Alerts } from "./screens/Alerts";
import { Crews } from "./screens/Crews";
import { Demo } from "./screens/Demo";
import { HelpIndex, HelpMethod, HelpValidation } from "./screens/Help";
import { Home } from "./screens/Home";
import { Overview } from "./screens/Overview";
import { Resources } from "./screens/Resources";
import { Worker } from "./screens/Worker";
import { Worksite } from "./screens/Worksite";
import { SiteProvider } from "./site/SiteContext";

function appScreen(path: string) {
  if (path.startsWith("/app/worksite")) return <Worksite />;
  if (path.startsWith("/app/crews")) return <Crews />;
  if (path.startsWith("/app/resources")) return <Resources />;
  if (path.startsWith("/app/alerts")) return <Alerts />;
  if (path.startsWith("/app/activity")) return <Activity />;
  if (path.startsWith("/demo")) return <Demo />;
  if (path.startsWith("/help/validation")) return <HelpValidation />;
  if (path.startsWith("/help/method")) return <HelpMethod />;
  if (path.startsWith("/help")) return <HelpIndex />;
  return <Overview />;
}

export function App() {
  const { path, search } = usePath();
  const redirect = legacyRedirect(path, search);
  useEffect(() => { if (redirect) navigate(redirect, true); }, [redirect]);
  if (redirect) return null;
  if (path === "/" || path === "") return <Home />;
  if (path.startsWith("/worker")) return <Worker />;
  return (
    <SiteProvider>
      <AppShell path={path}>{appScreen(path)}</AppShell>
    </SiteProvider>
  );
}
