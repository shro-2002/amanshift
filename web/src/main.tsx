import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/noto-naskh-arabic/400.css";
import "@fontsource/noto-sans-devanagari/400.css";
import "@fontsource/noto-sans-bengali/400.css";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/screens.css";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { I18nProvider } from "./i18n/i18n";

registerSW({ immediate: true });
createRoot(document.getElementById("root")!).render(
  <StrictMode><I18nProvider><App /></I18nProvider></StrictMode>,
);
