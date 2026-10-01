import { useState } from "react";
import { S, commit } from "../services/store";
import { closeSheet, haptic, toast } from "../services/ui";
import { lastMealToSleep } from "../utils/analytics";
import { DAY, HOUR, MIN, atTime, fmtDayMonth, fmtDur, hm, keyToDate, todayKey, uid } from "../utils/time";
import { useStore } from "../hooks/useApp";
import { Button } from "./Button";
import { Err, Field } from "./Forms";
import { Icon } from "./Icons";
import { SheetHeader } from "./Modal";

function times(date: string, bedT: string, wakeT: string) {
  if (!date || !bedT || !wakeT) return null;
  let bed = atTime(date, bedT); const wake = atTime(date, wakeT);
  if (bed >= wake) bed -= DAY;
  return { date, bed, wake };
}

/** Uyku kaydı + "son öğün → uyku" süresi */
export function SleepSheet() {
  useStore();
  const sorted = S.sleep.slice().sort((a, b) => b.wake - a.wake);
  const last = sorted[0];
  const [date, setDate] = useState(todayKey());
  const [bed, setBed] = useState(last ? hm(last.bed) : "23:30");
  const [wake, setWake] = useState(last ? hm(last.wake) : "07:00");
  const [err, setErr] = useState<string | null>(null);
  const r = times(date, bed, wake);
  const gap = r ? lastMealToSleep(r.bed) : null;
  const save = () => {
    if (!r) return setErr("Tarih ve saatleri gir.");
    const h = (r.wake - r.bed) / HOUR;
    if (h < 1 || h > 16) return setErr("Uyku süresi 1 ile 16 saat arasında olmalı. Saatleri kontrol et.");
    if (r.wake > Date.now() + 5 * MIN) return setErr("Uyanış saati gelecekte olamaz.");
    S.sleep = S.sleep.filter(s => s.date !== r.date);
    S.sleep.push({ id: uid(), ...r });
    commit("sleep"); haptic(); closeSheet(); toast(`Uyku kaydedildi: ${fmtDur(r.wake - r.bed)}`);
  };
  return (
    <>
      <SheetHeader title="Uyku" />
      <Field label="Uyandığın gün" style={{ marginTop: 0 }}><input className="input" type="date" max={todayKey()} value={date} onChange={e => setDate(e.target.value)} /></Field>
      <div className="input-row">
        <Field label="Uykuya giriş"><input className="input" type="time" value={bed} onChange={e => setBed(e.target.value)} /></Field>
        <Field label="Uyanış"><input className="input" type="time" value={wake} onChange={e => setWake(e.target.value)} /></Field>
      </div>
      <div className="facts" style={{ marginTop: 16 }}>
        <div><div className="k">Uyku süresi</div><div className="v">{r ? fmtDur(r.wake - r.bed) : "—"}</div></div>
        <div><div className="k">Son öğün → uyku</div><div className="v">{gap != null ? fmtDur(gap) : "—"}</div></div>
      </div>
      <Err msg={err} />
      <div className="actions"><Button onClick={save}>Kaydet</Button></div>
      {sorted.length > 0 && (
        <section className="sec"><div className="sec-h"><h2>Son geceler</h2></div>
          <div className="list">{sorted.slice(0, 7).map(s => (
            <div className="li" key={s.id}>
              <span className="t"><span>{fmtDayMonth(keyToDate(s.date))}</span><span className="s">{hm(s.bed)} → {hm(s.wake)}</span></span>
              <span className="v">{fmtDur(s.wake - s.bed)}</span>
              <button className="del" aria-label="Uyku kaydını sil" onClick={() => { S.sleep = S.sleep.filter(x => x.id !== s.id); commit("sleep"); toast("Kayıt silindi", { label: "Geri al", fn: () => { S.sleep.push(s); commit("sleep"); } }); }}><Icon.trash /></button>
            </div>))}
          </div>
        </section>
      )}
    </>
  );
}
