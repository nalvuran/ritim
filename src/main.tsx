import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App, applyTheme } from "./App";
import { loadLocal } from "./services/store";
import "./styles/global.css";

loadLocal();
applyTheme();
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

// PWA: service worker yalnızca kendi alan adında barındırılan sürümde kaydedilir.
const framed = (() => { try { return window.self !== window.top; } catch { return true; } })();
if (!__SINGLE__ && !framed && "serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => { navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(e => console.warn("Service worker kaydedilemedi", e)); });
}
