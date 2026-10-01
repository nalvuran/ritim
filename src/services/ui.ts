import type { ReactNode } from "react";
import type { Tab } from "../types";

/* Basit, bağımlılıksız UI durumu: sekme, alt sayfa (sheet) ve bildirim (toast). */
type Listener = () => void;
const ls = new Set<Listener>();
let v = 0;
const emit = () => { v++; ls.forEach(l => l()); };
export const subscribeUI = (fn: Listener) => { ls.add(fn); return () => ls.delete(fn); };
export const getUIVersion = () => v;

export interface SheetState { node: ReactNode; full: boolean; key: number; onClose?: () => void }
export interface ToastState { msg: string; action?: { label: string; fn: () => void }; key: number }

export const ui = {
  tab: "today" as Tab,
  sheet: null as SheetState | null,
  toast: null as ToastState | null,
  route: "app" as "app" | "landing",
};

let sheetKey = 0;
export function openSheet(node: ReactNode, opts: { full?: boolean; onClose?: () => void } = {}) {
  const prev = ui.sheet;
  ui.sheet = { node, full: !!opts.full, key: prev ? prev.key : ++sheetKey, onClose: opts.onClose };
  emit();
}
export function closeSheet() {
  if (!ui.sheet) return;
  try { ui.sheet.onClose?.(); } catch { /* yok say */ }
  ui.sheet = null; emit();
}
export function setTab(t: Tab) { ui.tab = t; ui.sheet = null; emit(); window.scrollTo({ top: 0 }); }
export function setRoute(r: "app" | "landing") { ui.route = r; emit(); }

let toastTimer: any;
let toastKey = 0;
export function toast(msg: string, action?: { label: string; fn: () => void }) {
  ui.toast = { msg, action, key: ++toastKey }; emit();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { ui.toast = null; emit(); }, action ? 5000 : 2800);
}
export function dismissToast() { ui.toast = null; emit(); }
export function haptic() { try { navigator.vibrate?.(8); } catch { /* yok say */ } }
