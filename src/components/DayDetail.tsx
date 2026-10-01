import { S, commit } from "../services/store";
import { openSheet, toast } from "../services/ui";
import { avgHunger, bestFastOn, eatingWindow, fastDur, fastsEndingOn, hungerOn, isSuccess, kgDisplay, mealsOn, sleepOn, waterOn } from "../utils/domain";
import { dayKey, fmtDayMonth, fmtDur, fmtL, fmtNum, hm, keyToDate } from "../utils/time";
import { useStore } from "../hooks/useApp";
import { Button } from "./Button";
import { FastEditSheet } from "./FastingHistory";
import { Icon } from "./Icons";
import { MealSheet } from "./MealLog";
import { SheetHeader } from "./Modal";

/** Geçmiş takviminde bir günün ayrıntısı */
export function DayDetail({ k }: { k: string }) {
  useStore();
  const fasts = fastsEndingOn(k), meals = mealsOn(k), water = waterOn(k), sl = sleepOn(k), hun = hungerOn(k), win = eatingWindow(k);
  const best = bestFastOn(k), ha = avgHunger(k);
  const w = S.weight.filter(x => dayKey(x.ts) === k).pop();
  const del = (col: "meals" | "hunger", id: string) => {
    const item = (S[col] as any[]).find(x => x.id === id);
    (S as any)[col] = (S[col] as any[]).filter(x => x.id !== id); commit(col);
    toast("Kayıt silindi", { label: "Geri al", fn: () => { (S[col] as any[]).push(item); commit(col); } });
  };
  const empty = !fasts.length && !meals.length && !water && !sl && !hun.length;
  return (
    <>
      <SheetHeader title={fmtDayMonth(keyToDate(k))} />
      <div className="facts">
        <div><div className="k">Oruç</div><div className="v">{best ? fmtDur(fastDur(best)) : "—"}</div></div>
        <div><div className="k">Yemek</div><div className="v">{meals.length ? `${meals.length} öğün` : "—"}</div></div>
        <div><div className="k">Su</div><div className="v">{water ? `${fmtL(water)} L` : "—"}</div></div>
        <div><div className="k">Uyku</div><div className="v">{sl ? fmtDur(sl.wake - sl.bed) : "—"}</div></div>
        <div><div className="k">Açlık</div><div className="v">{ha == null ? "—" : `ort. ${fmtNum(ha, 0)}/10`}</div></div>
        <div><div className="k">Yemek penceresi</div><div className="v">{win ? fmtDur(win) : "—"}</div></div>
      </div>
      {w && <p className="small muted" style={{ marginTop: 10 }}>Kilo: {kgDisplay(w.kg)}</p>}
      {fasts.length > 0 && <section className="sec"><div className="sec-h"><h2>Oruç</h2></div><div className="list">
        {fasts.map(f => <button className="li" key={f.id} onClick={() => openSheet(<FastEditSheet id={f.id} />)}>
          <span className={`dot ${isSuccess(f) ? "ok" : "part"}`} aria-hidden="true" />
          <span className="t"><span>{hm(f.start)} → {hm(f.end!)}</span><span className="s">Hedef {f.goalH} saat</span></span>
          <span className="v">{fmtDur(fastDur(f))}</span><Icon.chev /></button>)}
      </div></section>}
      {meals.length > 0 && <section className="sec"><div className="sec-h"><h2>Öğünler</h2></div><div className="list">
        {meals.map(m => <div className="li" key={m.id}><span className="t"><span>{m.label}</span>{m.tags.length > 0 && <span className="s">{m.tags.join(", ")}</span>}</span><span className="v">{hm(m.ts)}</span>
          <button className="del" aria-label="Öğünü sil" onClick={() => del("meals", m.id)}><Icon.trash /></button></div>)}
      </div></section>}
      {hun.length > 0 && <section className="sec"><div className="sec-h"><h2>Açlık kayıtları</h2></div><div className="list">
        {hun.map(h => <div className="li" key={h.id}><span className="t"><span>{h.reason}</span><span className="s">{hm(h.ts)}</span></span><span className="v">{h.level}/10</span>
          <button className="del" aria-label="Kaydı sil" onClick={() => del("hunger", h.id)}><Icon.trash /></button></div>)}
      </div></section>}
      {empty && <p className="muted center" style={{ marginTop: 20 }}>Bu gün için kayıt yok.</p>}
      <div className="actions">
        <Button variant="ghost" onClick={() => openSheet(<FastEditSheet day={k} />)}>Oruç kaydı ekle</Button>
        <Button variant="ghost" onClick={() => openSheet(<MealSheet day={k} />)}>Öğün ekle</Button>
      </div>
    </>
  );
}
