import { useEffect, useState, useSyncExternalStore } from "react";
import { getVersion, subscribe } from "../services/store";
import { getUIVersion, subscribeUI } from "../services/ui";

/** Uygulama verisi değiştiğinde yeniden çiz. */
export const useStore = () => useSyncExternalStore(subscribe, getVersion);
/** Sekme/sheet/toast değiştiğinde yeniden çiz. */
export const useUI = () => useSyncExternalStore(subscribeUI, getUIVersion);

/** Belirli aralıkla güncellenen "şimdi" (sayaç için). */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    const vis = () => document.visibilityState === "visible" && setNow(Date.now());
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, [intervalMs]);
  return now;
}

/** prefers-reduced-motion */
export function useReducedMotion() {
  const q = typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const [r, setR] = useState(!!q?.matches);
  useEffect(() => { if (!q) return; const f = () => setR(q.matches); q.addEventListener("change", f); return () => q.removeEventListener("change", f); }, [q]);
  return r;
}
