import { useEffect } from "react";
import { AppShell } from "./app/AppShell";
import { legacyRedirect, navigate, usePath } from "./router";
import { Activity } from "./screens/Activity";
import { Tour } from "./screens/Tour";
import { HelpIndex, HelpMethod, HelpValidation } from "./screens/Help";
import { Home } from "./screens/Home";
import { Overview } from "./screens/Overview";
import { Protection } from "./screens/Protection";
import { Worker } from "./screens/Worker";
import { Worksite } from "./screens/Worksite";
import { SiteProvider } from "./site/SiteContext";

function appScreen(path: string) {
  if (path.startsWith("/app/worksite")) return <Worksite />;
  if (path.startsWith("/app/protection")) return <Protection />;
  if (path.startsWith("/app/activity")) return <Activity />;
  if (path.startsWith("/tour")) return <Tour />;
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
