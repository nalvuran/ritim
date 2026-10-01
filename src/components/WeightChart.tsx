import { useState } from "react";
import { S, commit } from "../services/store";
import { haptic, toast } from "../services/ui";
import { fromKg, kgDisplay, settings, toKg, unitLabel, weightsSorted } from "../utils/domain";
import { atTime, fmtDayMonth, fmtNum, todayKey, uid } from "../utils/time";
import { useStore } from "../hooks/useApp";
import { Button } from "./Button";
import { LineChart } from "./Chart";
import { Err, Field } from "./Forms";
import { Icon } from "./Icons";
import { SheetHeader } from "./Modal";

/** Kilo eğilimi grafiği */
export function WeightChart({ from }: { from?: number }) {
  useStore();
  const pts = weightsSorted().filter(w => !from || w.ts >= from).map(w => ({ ts: w.ts, v: fromKg(w.kg) }));
  if (pts.length < 2) return null;
  return <LineChart pts={pts} label="Kilo eğilimi" />;
}

/** Kilo ve bel çevresi kaydı. Ana ekranda baskın değil; Profil ve İstatistik'ten erişilir. */
export function WeightSheet() {
  useStore();
  const list = weightsSorted();
  const last = list[list.length - 1];
  const [kg, setKg] = useState(last ? String(Math.round(fromKg(last.kg) * 10) / 10) : "");
  const [waist, setWaist] = useState("");
  const [date, setDate] = useState(todayKey());
  const [err, setErr] = useState<string | null>(null);
  const save = () => {
    const v = toKg(parseFloat(kg.replace(",", ".")));
    if (!(v >= 30 && v <= 300)) return setErr(`Geçerli bir kilo gir (${settings().unit === "lb" ? "66–660 lb" : "30–300 kg"}).`);
    const w = waist ? parseFloat(waist.replace(",", ".")) : null;
    if (w != null && !(w >= 40 && w <= 250)) return setErr("Bel çevresi 40–250 cm arasında olmalı.");
    S.weight.push({ id: uid(), ts: date === todayKey() ? Date.now() : atTime(date, "08:00"), kg: Math.round(v * 10) / 10, waist: w });
    commit("weight"); haptic(); setErr(null); setWaist(""); toast("Kilo kaydedildi");
  };
  return (
    <>
      <SheetHeader title="Kilo takibi" />
      <div className="input-row">
        <Field label={`Kilo (${unitLabel()})`} style={{ marginTop: 0 }}><input className="input" type="number" inputMode="decimal" step="0.1" value={kg} onChange={e => setKg(e.target.value)} /></Field>
        <Field label="Bel çevresi (cm, isteğe bağlı)" style={{ marginTop: 0 }}><input className="input" type="number" inputMode="decimal" step="0.5" value={waist} onChange={e => setWaist(e.target.value)} /></Field>
      </div>
      <Field label="Tarih"><input className="input" type="date" max={todayKey()} value={date} onChange={e => setDate(e.target.value)} /></Field>
      <Err msg={err} />
      <div className="actions"><Button onClick={save}>Kaydet</Button></div>
      {list.length >= 2 && <div className="sec surface"><WeightChart /></div>}
      {list.length > 0 && (
        <section className="sec"><div className="sec-h"><h2>Kayıtlar</h2></div>
          <div className="list">{list.slice().reverse().slice(0, 8).map(w => (
            <div className="li" key={w.id}>
              <span className="t"><span>{fmtDayMonth(w.ts)}</span>{w.waist && <span className="s">Bel {fmtNum(w.waist, 1)} cm</span>}</span>
              <span className="v">{kgDisplay(w.kg)}</span>
              <button className="del" aria-label="Kilo kaydını sil" onClick={() => { S.weight = S.weight.filter(x => x.id !== w.id); commit("weight"); toast("Kayıt silindi", { label: "Geri al", fn: () => { S.weight.push(w); commit("weight"); } }); }}><Icon.trash /></button>
            </div>))}
          </div>
        </section>
      )}
      <p className="tiny faint" style={{ marginTop: 16 }}>Kilo günden güne su ve sindirime bağlı olarak dalgalanır; eğilime bakmak tek bir günden daha anlamlıdır.</p>
    </>
  );
}
