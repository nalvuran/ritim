import { useState } from "react";
import { S, commit } from "../services/store";
import { closeSheet, haptic, toast } from "../services/ui";
import { MEAL_LABELS, MEAL_TAGS } from "../data/constants";
import { activeFast, eatingWindow, fastDur, mealsOn } from "../utils/domain";
import { MIN, atTime, fmtDayMonth, fmtDur, hm, keyToDate, todayKey, uid } from "../utils/time";
import { useStore } from "../hooks/useApp";
import { Button } from "./Button";
import { Chips, Err, Field, Group } from "./Forms";
import { Icon } from "./Icons";
import { SheetHeader } from "./Modal";

const suggestLabel = (k: string) => (!mealsOn(k).length ? "İlk öğün" : new Date().getHours() >= 18 ? "Son öğün" : "Ara öğün");

/** Öğün kaydı. Kalori takibi yok; içerik etiketleri isteğe bağlı. */
export function MealSheet({ day }: { day?: string }) {
  useStore();
  const [d, setD] = useState(day || todayKey());
  const [t, setT] = useState(hm(Date.now()));
  const [label, setLabel] = useState<string | null>(suggestLabel(day || todayKey()));
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const af = activeFast();
  const [endFast, setEndFast] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const meals = mealsOn(d), win = eatingWindow(d);
  const save = () => {
    if (!d || !t) return setErr("Tarih ve saati seç.");
    const ts = atTime(d, t);
    if (ts > Date.now() + 5 * MIN) return setErr("İleri bir saat için öğün kaydedemezsin.");
    S.meals.push({ id: uid(), ts, label: label || "Öğün", tags, note: note.trim().slice(0, 140) });
    let msg = "Öğün kaydedildi";
    if (af && endFast && ts > af.start) { af.end = Math.min(ts, Date.now()); delete af.demo; msg = `Öğün kaydedildi. Orucun ${fmtDur(fastDur(af))} sürdü.`; commit("meals", "fasts"); }
    else commit("meals");
    haptic(); closeSheet(); toast(msg);
  };
  const del = (id: string) => {
    const m = S.meals.find(x => x.id === id)!;
    S.meals = S.meals.filter(x => x.id !== id); commit("meals");
    toast("Öğün silindi", { label: "Geri al", fn: () => { S.meals.push(m); commit("meals"); } });
  };
  return (
    <>
      <SheetHeader title="Öğün ekle" />
      <div className="input-row">
        <Field label="Tarih" style={{ marginTop: 0 }}><input className="input" type="date" max={todayKey()} value={d} onChange={e => setD(e.target.value)} /></Field>
        <Field label="Saat" style={{ marginTop: 0 }}><input className="input" type="time" value={t} onChange={e => setT(e.target.value)} /></Field>
      </div>
      <Group label="Öğün"><Chips options={MEAL_LABELS.map(l => ({ v: l, t: l }))} value={label} onChange={setLabel} /></Group>
      <Group label="İçerik (isteğe bağlı)"><Chips multi options={MEAL_TAGS.map(l => ({ v: l, t: l }))} value={tags} onChange={setTags} /></Group>
      <Field label="Not (isteğe bağlı)"><input className="input" maxLength={140} value={note} onChange={e => setNote(e.target.value)} /></Field>
      {af && d === todayKey() && <label className="check" style={{ marginTop: 12 }}><input type="checkbox" checked={endFast} onChange={e => setEndFast(e.target.checked)} /> Devam eden orucu bu öğünle bitir</label>}
      <Err msg={err} />
      <div className="actions"><Button onClick={save}>Kaydet</Button></div>
      {meals.length > 0 && (
        <section className="sec">
          <div className="sec-h"><h2>{d === todayKey() ? "Bugünkü öğünler" : fmtDayMonth(keyToDate(d))}</h2>{win && <span className="small muted">Toplam yemek penceresi {fmtDur(win)}</span>}</div>
          <div className="list">{meals.map(m => (
            <div className="li" key={m.id}>
              <span className="t"><span>{m.label}</span>{(m.tags.length > 0 || m.note) && <span className="s">{[...m.tags, m.note].filter(Boolean).join(", ")}</span>}</span>
              <span className="v">{hm(m.ts)}</span>
              <button className="del" onClick={() => del(m.id)} aria-label="Öğünü sil"><Icon.trash /></button>
            </div>))}
          </div>
        </section>
      )}
    </>
  );
}
