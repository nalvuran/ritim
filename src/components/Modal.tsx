import { useEffect, useRef, type ReactNode } from "react";
import { closeSheet, ui } from "../services/ui";
import { useUI } from "../hooks/useApp";
import { Icon } from "./Icons";

/** Alt sayfa (mobil) / ortalanmış diyalog (masaüstü). Odak yönetimi ve Esc ile kapatma içerir. */
export function SheetHost() {
  useUI();
  const s = ui.sheet;
  const ref = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<Element | null>(null);
  const open = !!s;

  useEffect(() => {
    const main = document.getElementById("app-main");
    if (main) (main as any).inert = open;
    if (open) {
      prevFocus.current = prevFocus.current || document.activeElement;
      setTimeout(() => {
        const el = ref.current?.querySelector<HTMLElement>("[data-autofocus]") || ref.current?.querySelector<HTMLElement>(".sheet-h h2");
        el?.focus({ preventScroll: true });
      }, 60);
    } else if (prevFocus.current) {
      (prevFocus.current as HTMLElement).focus?.({ preventScroll: true });
      prevFocus.current = null;
    }
  }, [open, s?.key]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeSheet(); return; }
      if (e.key === "Tab" && ref.current) {
        const f = Array.from(ref.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select, [tabindex='0']")).filter(x => x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={`sheet-root${open ? " open" : ""}`} aria-hidden={!open}>
      <div className="scrim" onClick={closeSheet} />
      <div ref={ref} className={`sheet${s?.full ? " full" : ""}`} role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="grab" aria-hidden="true" />
        {s && <div className="sb">{s.node}</div>}
      </div>
    </div>
  );
}

export function SheetHeader({ title }: { title: ReactNode }) {
  return (
    <div className="sheet-h">
      <h2 id="sheet-title" tabIndex={-1}>{title}</h2>
      <button className="icon-btn" onClick={closeSheet} aria-label="Kapat"><Icon.close /></button>
    </div>
  );
}
