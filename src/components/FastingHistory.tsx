import { useState } from "react";
import { S, commit } from "../services/store";
import { closeSheet, haptic, openSheet, toast } from "../services/ui";
import type { FastingSession } from "../types";
import { activeFast, fastDur, isSuccess, lastFinishedFast, planFor, settings } from "../utils/domain";
import { DAY, HOUR, MIN, addDays, atLoc, atTime, dayKey, fmtDayMonth, fmtDayShort, fmtDur, hm, minToHM, toMin, todayKey, uid } from "../utils/time";
import { Button } from "./Button";
import { Err, Field, Group } from "./Forms";
import { Icon } from "./Icons";
import { SheetHeader } from "./Modal";
import { MealSheet } from "./MealLog";
import { useStore } from "../hooks/useApp";

/* ---------- Eylemler ---------- */
export function startFast(ts = Date.now()) {
  if (activeFast()) { toast("Zaten devam eden bir orucun var."); return; }
  const f: FastingSession = { id: uid(), start: Math.round(ts / 1000) * 1000, end: null, goalH: planFor().hours };
  S.fasts.push(f); commit("fasts"); haptic(); closeSheet();
  toast("Oruç başladı", { label: "Geri al", fn: () => { S.fasts = S.fasts.filter(x => x.id !== f.id); commit("fasts"); } });
}
export const openEndFast = () => openSheet(<EndFastSheet />);
export const openPlanToday = () => openSheet(<PlanTodaySheet />);

/* ---------- Orucu boz / bitir ---------- */
function EndFastSheet() {
  useStore();
  const f = activeFast();
  const [t, setT] = useState(hm(Date.now()));
  const [err, setErr] = useState<string | null>(null);
  if (!f) return <><SheetHeader title="Oruç" /><p className="muted">Devam eden bir oruç yok.</p></>;
  const el = Date.now() - f.start, done = el >= f.goalH * HOUR;
  const confirm = () => {
    if (!t) return setErr("Bitiş saatini seç.");
    let ts = atTime(todayKey(), t);
    if (ts > Date.now() + MIN) ts -= DAY;
    if (ts <= f.start) return setErr(`Bitiş, başlangıçtan (${hm(f.start)}) sonra olmalı.`);
    f.end = ts; delete f.demo; commit("fasts"); haptic();
    openSheet(<FastResultSheet f={f} />);
  };
  return (
    <>
      <SheetHeader title={done ? "Orucu bitir" : "Orucu boz"} />
      <p className="big-num">{fmtDur(el)}</p>
      <p className="lead" style={{ marginTop: 6 }}>{done ? `${f.goalH} saatlik hedefini tamamladın.` : `Hedefine ${fmtDur(f.goalH * HOUR - el)} kaldı. İstediğin zaman bitirebilirsin; kendini dinlemek her zaman doğru seçim.`}</p>
      <Field label="Bitiş saati"><input className="input" type="time" value={t} onChange={e => setT(e.target.value)} /></Field>
      <Err msg={err} />
      <div className="actions">
        <Button variant={done ? "primary" : "dark"} onClick={confirm}>Orucu bitir</Button>
        <Button variant="ghost" onClick={closeSheet}>Devam et</Button>
      </div>
    </>
  );
}
function FastResultSheet({ f }: { f: FastingSession }) {
  const d = fmtDur(fastDur(f));
  if (isSuccess(f)) return (
    <>
      <SheetHeader title="Orucun kaydedildi" />
      <p className="big-num">{d}</p>
      <p className="lead" style={{ marginTop: 6 }}>{f.goalH} saatlik hedefine ulaştın. Yemek penceren şimdi açık.</p>
      <div className="actions"><Button onClick={() => openSheet(<MealSheet />)}>Öğün ekle</Button><Button variant="ghost" onClick={closeSheet}>Tamam</Button></div>
    </>
  );
  return (
    <>
      <SheetHeader title="Orucun kaydedildi" />
      <p className="big-num">{d}</p>
      <p className="lead" style={{ marginTop: 6 }}>Bugünkü orucun {d} sürdü. Planın bozulmuş olabilir; günün tamamı bozulmuş değil.</p>
      <p className="muted" style={{ marginTop: 14 }}>Yeni bir oruç başlatmak ister misin?</p>
      <div className="actions"><Button variant="soft" onClick={() => startFast()}>Yeni oruç başlat</Button><Button variant="ghost" onClick={closeSheet}>Şimdilik değil</Button></div>
    </>
  );
}

/* ---------- Bugünkü planı değiştir ---------- */
function PlanTodaySheet() {
  const k = todayKey(), p = planFor(k), af = activeFast();
  const [start, setStart] = useState(p.startTime);
  const [hours, setHours] = useState(String(p.hours));
  const [err, setErr] = useState<string | null>(null);
  const h = Math.round(+hours);
  const save = () => {
    if (!start) return setErr("Başlangıç saatini seç.");
    if (!(h >= 10 && h <= 23)) return setErr("Süre 10 ile 23 saat arasında olmalı.");
    S.meta.overrides[k] = { startTime: start, hours: h };
    const cutoff = dayKey(addDays(new Date(), -60));
    for (const key of Object.keys(S.meta.overrides)) if (key < cutoff) delete S.meta.overrides[key];
    if (af) af.goalH = h;
    commit("meta", "fasts"); closeSheet(); toast("Bugünkü planın güncellendi");
  };
  const reset = () => { delete S.meta.overrides[k]; if (af) af.goalH = settings().fastHours; commit("meta", "fasts"); closeSheet(); toast("Genel planına dönüldü"); };
  return (
    <>
      <SheetHeader title="Bugünkü plan" />
      <p className="muted">Sadece bugünü etkiler; genel planın ve geçmiş kayıtların değişmez.</p>
      <Field label="Oruç başlangıcı"><input className="input" type="time" value={start} onChange={e => setStart(e.target.value)} /></Field>
      <Group label="Oruç süresi">
        <div className="chips" role="group">{[12, 14, 16, 18].map(x => <button type="button" key={x} className="chip" aria-pressed={h === x} onClick={() => setHours(String(x))}>{x} saat</button>)}</div>
      </Group>
      <Field label="ya da saat olarak gir"><input className="input" type="number" inputMode="numeric" min={10} max={23} value={hours} onChange={e => setHours(e.target.value)} /></Field>
      {start && h > 0 && <p className="note" style={{ marginTop: 16 }}>Bugün: {start} → {minToHM(toMin(start) + h * 60)}, yemek penceresi {24 - h} saat</p>}
      {af && <p className="small muted" style={{ marginTop: 8 }}>Devam eden orucunun hedefi de bu süreye göre güncellenecek.</p>}
      <Err msg={err} />
      <div className="actions"><Button onClick={save}>Bugün için kaydet</Button>{p.override && <Button variant="ghost" onClick={reset}>Genel plana dön</Button>}</div>
    </>
  );
}

/* ---------- Başlangıcı düzenle ---------- */
export function EditStartSheet() {
  const f = activeFast();
  const [d, setD] = useState(f ? dayKey(f.start) : todayKey());
  const [t, setT] = useState(f ? hm(f.start) : "20:00");
  const [err, setErr] = useState<string | null>(null);
  if (!f) return <><SheetHeader title="Başlangıç" /><p className="muted">Devam eden bir oruç yok.</p></>;
  const save = () => {
    if (!d || !t) return setErr("Gün ve saati seç.");
    const ts = atTime(d, t);
    if (ts > Date.now()) return setErr("Başlangıç gelecekte olamaz.");
    if (Date.now() - ts > 72 * HOUR) return setErr("Başlangıç en fazla 72 saat önce olabilir.");
    const lf = lastFinishedFast();
    if (lf && ts < lf.end!) return setErr(`Önceki orucun ${atLoc(hm(lf.end!))} bitti; başlangıç bundan sonra olmalı.`);
    f.start = ts; delete f.demo; commit("fasts"); closeSheet(); toast("Başlangıç güncellendi");
  };
  return (
    <>
      <SheetHeader title="Başlangıcı düzenle" />
      <p className="muted">Başlatmayı unuttuysan gerçek başlangıç saatini seçebilirsin.</p>
      <div className="input-row">
        <Field label="Gün"><input className="input" type="date" max={todayKey()} value={d} onChange={e => setD(e.target.value)} /></Field>
        <Field label="Saat"><input className="input" type="time" value={t} onChange={e => setT(e.target.value)} /></Field>
      </div>
      <Err msg={err} />
      <div className="actions"><Button onClick={save}>Kaydet</Button><Button variant="ghost" style={{ color: "var(--red)" }} onClick={() => deleteFast(f.id)}>Bu orucu sil</Button></div>
    </>
  );
}
function deleteFast(id: string) {
  const f = S.fasts.find(x => x.id === id);
  S.fasts = S.fasts.filter(x => x.id !== id); commit("fasts"); closeSheet();
  toast("Oruç kaydı silindi", { label: "Geri al", fn: () => { if (f) { S.fasts.push(f); commit("fasts"); } } });
}

/* ---------- Oruç kaydı ekle / düzenle ---------- */
export function FastEditSheet({ id, day }: { id?: string; day?: string }) {
  const f = id ? S.fasts.find(x => x.id === id) : null;
  const endDefault = f?.end || atTime(day || todayKey(), "12:00");
  const start0 = f ? f.start : endDefault - settings().fastHours * HOUR;
  const [v, setV] = useState({ sd: dayKey(start0), st: hm(start0), ed: dayKey(endDefault), et: hm(endDefault), goal: String(f ? f.goalH : settings().fastHours) });
  const [err, setErr] = useState<string | null>(null);
  const u = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const save = () => {
    if (!v.sd || !v.st || !v.ed || !v.et) return setErr("Tüm tarih ve saatleri doldur.");
    const start = atTime(v.sd, v.st), end = atTime(v.ed, v.et), goal = Math.round(+v.goal);
    if (end <= start) return setErr("Bitiş, başlangıçtan sonra olmalı.");
    if (end - start > 72 * HOUR) return setErr("Bir oruç kaydı en fazla 72 saat olabilir.");
    if (end > Date.now() + MIN) return setErr("Bitiş gelecekte olamaz.");
    if (!(goal >= 10 && goal <= 23)) return setErr("Hedef 10 ile 23 saat arasında olmalı.");
    const clash = S.fasts.find(x => x.id !== id && x.start < end && (x.end || Date.now()) > start);
    if (clash) return setErr(`Bu aralık başka bir oruçla çakışıyor (${fmtDayShort(clash.start)} ${hm(clash.start)}).`);
    if (f) { Object.assign(f, { start, end, goalH: goal }); delete f.demo; }
    else S.fasts.push({ id: uid(), start, end, goalH: goal });
    commit("fasts"); closeSheet(); toast(f ? "Oruç güncellendi" : "Oruç kaydı eklendi");
  };
  return (
    <>
      <SheetHeader title={f ? "Orucu düzenle" : "Oruç kaydı ekle"} />
      <div className="input-row">
        <Field label="Başlangıç günü" style={{ marginTop: 0 }}><input className="input" type="date" max={todayKey()} value={v.sd} onChange={u("sd")} /></Field>
        <Field label="Saat" style={{ marginTop: 0 }}><input className="input" type="time" value={v.st} onChange={u("st")} /></Field>
      </div>
      <div className="input-row">
        <Field label="Bitiş günü"><input className="input" type="date" max={todayKey()} value={v.ed} onChange={u("ed")} /></Field>
        <Field label="Saat"><input className="input" type="time" value={v.et} onChange={u("et")} /></Field>
      </div>
      <Field label="Hedef (saat)"><input className="input" type="number" inputMode="numeric" min={10} max={23} value={v.goal} onChange={u("goal")} /></Field>
      <Err msg={err} />
      <div className="actions"><Button onClick={save}>Kaydet</Button>{f && <Button variant="ghost" style={{ color: "var(--red)" }} onClick={() => deleteFast(f.id)}>Kaydı sil</Button>}</div>
    </>
  );
}

/** Son tamamlanan oruçlar listesi */
export function FastingHistory({ limit = 6 }: { limit?: number }) {
  useStore();
  const recent = S.fasts.filter(f => f.end).sort((a, b) => b.end! - a.end!).slice(0, limit);
  if (!recent.length) return <div className="surface center muted">Tamamlanan oruçların burada listelenecek.</div>;
  return (
    <div className="list">
      {recent.map(f => (
        <button key={f.id} className="li" onClick={() => openSheet(<FastEditSheet id={f.id} />)}>
          <span className={`dot ${isSuccess(f) ? "ok" : "part"}`} aria-hidden="true" />
          <span className="t"><span>{fmtDayMonth(f.end!)}</span><span className="s">{hm(f.start)} → {hm(f.end!)}, hedef {f.goalH}s</span></span>
          <span className="v">{fmtDur(fastDur(f))}</span><Icon.chev />
        </button>
      ))}
    </div>
  );
}
