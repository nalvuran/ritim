import { useState } from "react";
import { S } from "../services/store";
import { openSheet } from "../services/ui";
import { useStore } from "../hooks/useApp";
import { DayDetail } from "../components/DayDetail";
import { Empty } from "../components/Card";
import { Icon } from "../components/Icons";
import { bestFastOn, dayStatus, fastDur, mealsOn, waterOn } from "../utils/domain";
import { dayKey, fmtDayMonth, fmtDur, fmtL, fmtMonthYear, keyToDate, rangeDays, todayKey } from "../utils/time";

const WD = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

export function HistoryScreen() {
  useStore();
  const now = new Date();
  const [m, setM] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const isCur = m.getFullYear() === now.getFullYear() && m.getMonth() === now.getMonth();
  const daysIn = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const lead = (m.getDay() + 6) % 7;
  const tk = todayKey();
  let ok = 0, part = 0;
  const cells = Array.from({ length: daysIn }, (_, i) => {
    const date = new Date(m.getFullYear(), m.getMonth(), i + 1), k = dayKey(date), future = date > now;
    const s = future ? "none" : dayStatus(k);
    if (s === "ok") ok++; else if (s === "part") part++;
    return (
      <button key={k} className={k === tk ? "today" : ""} disabled={future} onClick={() => openSheet(<DayDetail k={k} />)}
        aria-label={`${fmtDayMonth(date)}: ${s === "ok" ? "hedef tamamlandı" : s === "part" ? "kısmen" : "veri yok"}`}>
        {i + 1}{future ? <span style={{ height: 8 }} /> : <span className={`dot ${s === "ok" ? "ok" : s === "part" ? "part" : ""}`} />}
      </button>
    );
  });
  const any = S.fasts.length || S.meals.length || S.water.length;
  return (
    <>
      <h1 className="title">Geçmiş</h1>
      <section className="surface">
        <div className="cal-h">
          <button className="icon-btn soft-bg" onClick={() => setM(new Date(m.getFullYear(), m.getMonth() - 1, 1))} aria-label="Önceki ay"><Icon.left /></button>
          <h2 aria-live="polite">{fmtMonthYear(m)}</h2>
          <button className="icon-btn soft-bg" disabled={isCur} onClick={() => setM(new Date(m.getFullYear(), m.getMonth() + 1, 1))} aria-label="Sonraki ay"><Icon.right /></button>
        </div>
        <div className="cal">
          {WD.map(w => <div key={w} className="wd" aria-hidden="true">{w}</div>)}
          {Array.from({ length: lead }, (_, i) => <div key={"e" + i} />)}
          {cells}
        </div>
        <div className="legend"><span><i className="dot ok" />Hedef tamamlandı</span><span><i className="dot part" />Kısmen</span><span><i className="dot" />Veri yok</span></div>
      </section>
      <section className="sec">
        {any ? <div className="metrics"><div><div className="k">Hedefe ulaşılan gün</div><div className="v">{ok}</div></div><div><div className="k">Kısmi gün</div><div className="v">{part}</div></div></div>
          : <Empty title="Henüz kayıt yok" text="İlk orucunu başlattığında günlerin burada renklenecek." />}
      </section>
      {any ? (
        <section className="sec"><div className="sec-h"><h2>Son 7 gün</h2></div>
          <div className="list">{rangeDays(7).reverse().map(k => {
            const s = dayStatus(k), f = bestFastOn(k);
            return (
              <button key={k} className="li" onClick={() => openSheet(<DayDetail k={k} />)}>
                <span className={`dot ${s === "ok" ? "ok" : s === "part" ? "part" : ""}`} aria-hidden="true" />
                <span className="t"><span>{k === tk ? "Bugün" : fmtDayMonth(keyToDate(k))}</span><span className="s">{mealsOn(k).length} öğün, {fmtL(waterOn(k))} L su</span></span>
                <span className="v">{f ? fmtDur(fastDur(f)) : "—"}</span><Icon.chev />
              </button>
            );
          })}</div>
        </section>
      ) : null}
    </>
  );
}
