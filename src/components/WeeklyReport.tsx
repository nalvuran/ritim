import { useState } from "react";
import { weeklyReport } from "../utils/analytics";
import { addDays, fmtDayMonth, fmtDur, fmtL } from "../utils/time";
import { useStore } from "../hooks/useApp";
import { dayStatus } from "../utils/domain";
import { Icon } from "./Icons";
import { SheetHeader } from "./Modal";

/** "Haftan nasıl geçti?" — Pazartesi–Pazar haftalık özet */
export function WeeklyReport() {
  useStore();
  const [off, setOff] = useState(0);
  const r = weeklyReport(off);
  const total = r.days.length;
  const range = `${fmtDayMonth(r.ws)} – ${fmtDayMonth(addDays(r.ws, 6))}`;
  const has = r.st.count > 0 || r.st.avgWater || r.st.avgSleep;
  return (
    <>
      <SheetHeader title="Haftan nasıl geçti?" />
      <div className="cal-h">
        <button className="icon-btn soft-bg" onClick={() => setOff(off - 1)} aria-label="Önceki hafta"><Icon.left /></button>
        <p style={{ fontWeight: 600 }} aria-live="polite">{r.isCurrent ? "Bu hafta" : range}</p>
        <button className="icon-btn soft-bg" onClick={() => setOff(off + 1)} disabled={off >= 0} aria-label="Sonraki hafta"><Icon.right /></button>
      </div>
      {r.isCurrent && <p className="small muted center" style={{ marginTop: -4, marginBottom: 12 }}>{range}</p>}
      {!has ? <div className="surface center muted">Bu hafta için kayıt yok.</div> : (
        <>
          <div className="week-hero surface">
            <p className="big-num">{r.st.successDays}<small> / {total} gün</small></p>
            <p className="muted">hedefini tamamladın</p>
            <div className="week-dots" aria-hidden="true">{r.all.map(k => { const s = k <= r.days[r.days.length - 1] ? dayStatus(k) : "future"; return <i key={k} className={`dot ${s === "ok" ? "ok" : s === "part" ? "part" : ""}`} style={s === "future" ? { opacity: .25 } : undefined} />; })}</div>
          </div>
          <div className="facts" style={{ marginTop: 12 }}>
            <div><div className="k">Ortalama oruç</div><div className="v">{fmtDur(r.st.avgFast)}</div></div>
            <div><div className="k">En uzun</div><div className="v">{fmtDur(r.st.maxFast)}</div></div>
            <div><div className="k">Ortalama su</div><div className="v">{r.st.avgWater ? fmtL(r.st.avgWater) + " L" : "—"}</div></div>
            <div><div className="k">Ortalama uyku</div><div className="v">{fmtDur(r.st.avgSleep)}</div></div>
          </div>
          {r.hard && <p className="note" style={{ marginTop: 12 }}>En sık zorlandığın zaman: <b>{r.hard}</b></p>}
          <section className="sec">
            <div className="sec-h"><h2>Bu hafta için küçük bir hedef</h2></div>
            <div className="phase"><p style={{ marginTop: 0, color: "var(--ink)" }}>{r.goal}</p></div>
          </section>
        </>
      )}
    </>
  );
}
