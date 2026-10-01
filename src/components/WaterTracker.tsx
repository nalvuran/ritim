import { useState } from "react";
import { S, commit } from "../services/store";
import { haptic, toast } from "../services/ui";
import { settings, waterOn } from "../utils/domain";
import { clamp, dayKey, fmtL, hm, todayKey, uid } from "../utils/time";
import { useStore } from "../hooks/useApp";
import { Button } from "./Button";
import { Err } from "./Forms";
import { Icon } from "./Icons";
import { SheetHeader } from "./Modal";

export function addWater(ml: number) {
  const w = { id: uid(), ts: Date.now(), ml: Math.round(ml) };
  S.water.push(w); commit("water"); haptic();
  toast(`${w.ml} ml eklendi`, { label: "Geri al", fn: () => { S.water = S.water.filter(x => x.id !== w.id); commit("water"); } });
}

/** Su takibi: hızlı +250/+500 ve özel miktar. */
export function WaterSheet() {
  useStore();
  const k = todayKey(), total = waterOn(k), goal = settings().waterGoal;
  const [custom, setCustom] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const list = S.water.filter(w => dayKey(w.ts) === k).sort((a, b) => b.ts - a.ts);
  const addCustom = () => {
    const v = Math.round(+custom);
    if (!(v >= 10 && v <= 3000)) return setErr("10 ile 3000 ml arasında bir miktar gir.");
    setErr(null); setCustom(""); addWater(v);
  };
  return (
    <>
      <SheetHeader title="Su" />
      <p className="big-num">{fmtL(total)}<small> / {fmtL(goal)} L</small></p>
      <div className="bar blue" style={{ height: 8, borderRadius: 4 }}><i style={{ width: `${clamp((total / goal) * 100, 0, 100)}%` }} /></div>
      <div className="input-row" style={{ marginTop: 20 }}>
        <Button variant="soft" onClick={() => addWater(250)}>+250 ml</Button>
        <Button variant="soft" onClick={() => addWater(500)}>+500 ml</Button>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <input className="input" type="number" inputMode="numeric" placeholder="Özel miktar (ml)" aria-label="Özel miktar, mililitre" value={custom}
          onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustom()} />
        <Button variant="dark" small style={{ minHeight: 52 }} onClick={addCustom}>Ekle</Button>
      </div>
      <Err msg={err} />
      {list.length ? (
        <section className="sec"><div className="sec-h"><h2>Bugün</h2></div>
          <div className="list">{list.map(w => (
            <div className="li" key={w.id}><span className="t">{hm(w.ts)}</span><span className="v">{w.ml} ml</span>
              <button className="del" aria-label={`${w.ml} ml kaydını sil`} onClick={() => { S.water = S.water.filter(x => x.id !== w.id); commit("water"); toast("Kayıt silindi", { label: "Geri al", fn: () => { S.water.push(w); commit("water"); } }); }}><Icon.trash /></button>
            </div>))}
          </div>
        </section>
      ) : <p className="muted small center" style={{ marginTop: 20 }}>Bugün henüz su kaydı yok.</p>}
    </>
  );
}
