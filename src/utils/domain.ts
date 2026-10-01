import { S } from "../services/store";
import type { FastingSession, LiveState } from "../types";
import { HOUR, MIN, atTime, avg, clamp, dayKey, fmtDur, fmtL, sum, todayKey } from "./time";

export const settings = () => S.meta.settings;
export function planFor(k = todayKey()) {
  const o = S.meta.overrides[k];
  return { startTime: o?.startTime || settings().startTime, hours: o?.hours || settings().fastHours, override: !!o };
}
export const activeFast = () => S.fasts.find(f => !f.end) || null;
export const fastDur = (f: FastingSession) => (f.end || Date.now()) - f.start;
export const isSuccess = (f: FastingSession) => !!f.end && f.end - f.start >= f.goalH * HOUR - 5 * MIN;
const byTs = (a: { ts: number }, b: { ts: number }) => a.ts - b.ts;
export const lastFinishedFast = () => S.fasts.filter(f => f.end).sort((a, b) => b.end! - a.end!)[0] || null;
export const fastsEndingOn = (k: string) => S.fasts.filter(f => f.end && dayKey(f.end) === k);
export const mealsOn = (k: string) => S.meals.filter(m => dayKey(m.ts) === k).sort(byTs);
export const waterOn = (k: string) => sum(S.water.filter(w => dayKey(w.ts) === k).map(w => w.ml));
export const hungerOn = (k: string) => S.hunger.filter(h => dayKey(h.ts) === k).sort(byTs);
export const sleepOn = (k: string) => S.sleep.find(s => s.date === k) || null;
export const weightsSorted = () => S.weight.slice().sort(byTs);
export function eatingWindow(k: string) {
  const m = mealsOn(k);
  return m.length < 2 ? null : m[m.length - 1].ts - m[0].ts;
}
export function bestFastOn(k: string) {
  const f = fastsEndingOn(k);
  return f.length ? f.sort((a, b) => fastDur(b) - fastDur(a))[0] : null;
}
export type DayStatus = "ok" | "part" | "none";
export function dayStatus(k: string): DayStatus {
  const f = fastsEndingOn(k);
  if (f.some(isSuccess)) return "ok";
  const any = f.length || mealsOn(k).length || waterOn(k) || hungerOn(k).length || sleepOn(k) || S.weight.some(w => dayKey(w.ts) === k);
  return any ? "part" : "none";
}

export const unitLabel = () => (settings().unit === "lb" ? "lb" : "kg");
export const toKg = (v: number) => (settings().unit === "lb" ? v / 2.20462 : v);
export const fromKg = (v: number) => (settings().unit === "lb" ? v * 2.20462 : v);
export const kgDisplay = (kg?: number | null) =>
  kg == null ? "—" : `${(settings().unit === "lb" ? kg * 2.20462 : kg).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} ${unitLabel()}`;

export function liveState(): LiveState {
  const now = Date.now();
  const af = activeFast();
  if (af) {
    const el = now - af.start, goal = af.goalH * HOUR;
    return { mode: el >= goal ? "fast-done" : "fast", f: af, el, goal, p: el / goal, end: af.start + goal };
  }
  const lf = lastFinishedFast();
  const plan = planFor();
  if (!lf && !S.fasts.length) return { mode: "empty", el: 0, goal: 16 * HOUR, p: 0 };
  const win = (24 - plan.hours) * HOUR;
  const since = lf ? now - lf.end! : 0;
  return { mode: "eat", lf, el: since, goal: win, p: since / win, nextStart: atTime(todayKey(), plan.startTime) };
}

/* -------- Günlük alışkanlık skoru (açıklanabilir, 0–100) --------
   Sağlık puanı değildir; yalnızca uygulamadaki hedeflere uyumu gösterir. */
export function habitScore(k = todayKey()) {
  const isToday = k === todayKey();
  const plan = planFor(k);
  const parts: { k: string; max: number; v: number; d: string }[] = [];
  const fasts = fastsEndingOn(k).slice();
  const af = activeFast();
  if (isToday && af) fasts.push(af);
  let fr = 0;
  for (const f of fasts) fr = Math.max(fr, fastDur(f) / (f.goalH * HOUR));
  fr = clamp(fr, 0, 1);
  parts.push({ k: "Oruç planına uyum", max: 40, v: Math.round(fr * 40), d: fasts.length ? `Hedefinin %${Math.round(fr * 100)}'i` : "Bu gün oruç kaydı yok" });
  const win = eatingWindow(k), planned = (24 - plan.hours) * HOUR;
  let wv = 0, wd = "En az iki öğün kaydı gerekiyor";
  if (win != null) {
    const excess = Math.max(0, win - planned - 30 * MIN) / HOUR;
    wv = Math.round(clamp(20 - excess * 8, 0, 20));
    wd = `Pencere ${fmtDur(win)}, plan ${fmtDur(planned)}`;
  } else if (mealsOn(k).length === 1) { wv = 14; wd = "Tek öğün kaydedildi"; }
  parts.push({ k: "Yemek penceresi", max: 20, v: wv, d: wd });
  const w = waterOn(k);
  parts.push({ k: "Su", max: 10, v: Math.round(clamp(w / settings().waterGoal, 0, 1) * 10), d: `${fmtL(w)} / ${fmtL(settings().waterGoal)} L` });
  const sl = sleepOn(k);
  let sv = 0, sd = "Uyku kaydı yok";
  if (sl) { const h = (sl.wake - sl.bed) / HOUR; sv = h >= 7 && h <= 9 ? 10 : h >= 6 && h <= 10 ? 6 : 3; sd = fmtDur(sl.wake - sl.bed); }
  parts.push({ k: "Uyku", max: 10, v: sv, d: sd });
  const tracked = [fasts.length > 0, mealsOn(k).length > 0, w > 0, !!sl, hungerOn(k).length > 0].filter(Boolean).length;
  parts.push({ k: "Takip düzenliliği", max: 20, v: tracked * 4, d: `${tracked}/5 alan kaydedildi` });
  return { total: sum(parts.map(p => p.v)), parts };
}

export function hardestWindow(days = 30, minLogs = 5) {
  const from = Date.now() - days * 86_400_000;
  const logs = S.hunger.filter(h => h.ts >= from);
  if (logs.length < minLogs) return null;
  const c = Array(24).fill(0);
  logs.forEach(l => c[new Date(l.ts).getHours()]++);
  let best = -1, bh = 0;
  for (let h = 0; h < 24; h++) { const v = c[h] + c[(h + 1) % 24]; if (v > best) { best = v; bh = h; } }
  const p = (n: number) => String(n).padStart(2, "0");
  return best >= 3 ? `${p(bh)}:00–${p((bh + 2) % 24)}:00` : null;
}
export const avgHunger = (k: string) => avg(hungerOn(k).map(h => h.level));
