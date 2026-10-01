import { S, commit, COLS } from "./store";
import { MEAL_TAGS } from "../data/constants";
import { HOUR, MIN, addDays, clamp, dayKey, startOfDay, toMin, uid } from "../utils/time";
import type { FastingSession } from "../types";
import { newlyUnlocked } from "../utils/analytics";

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const roundMin = (t: number) => Math.round(t / MIN) * MIN;
function weightedPick<T>(items: [T, number][]): T {
  const t = items.reduce((s, i) => s + i[1], 0);
  let r = Math.random() * t;
  for (const [v, w] of items) if ((r -= w) <= 0) return v;
  return items[0][0];
}

/** Son 30 gün için gerçekçi örnek veriler üretir (hepsi demo:true ile işaretli). */
export function generateDemo() {
  const now = Date.now();
  const st = S.meta.settings;
  const goal = st.fastHours;
  const today = startOfDay(new Date());
  const D = { fasts: [] as any[], meals: [] as any[], water: [] as any[], hunger: [] as any[], sleep: [] as any[], weight: [] as any[] };
  const byStart: Record<string, FastingSession> = {};

  for (let d = 30; d >= 0; d--) {
    const day = addDays(today, -d);
    const weekendNight = day.getDay() === 5 || day.getDay() === 6;
    const start = day.getTime() + (toMin(st.startTime) + rnd(-25, 45) + (weekendNight ? 80 : 0)) * MIN;
    if (start > now) continue;
    const r = Math.random();
    let h = r < (weekendNight ? 0.5 : 0.74) ? goal + rnd(0, 1.7) : r < 0.9 ? goal - rnd(0.3, 1.4) : goal - rnd(1.6, 3.2);
    h = clamp(h, Math.min(11.5, goal - 1), goal + 2.4);
    const end = roundMin(start + h * HOUR);
    // Örnek veriler yalnızca tamamlanmış geçmiş oruçları içerir. Devam eden bir oruç asla
    // örnek olarak oluşturulmaz; böylece kullanıcının gerçek orucuyla karışmaz.
    if (end > now) continue;
    const f: FastingSession = { id: uid(), start: roundMin(start), end, goalH: goal, demo: true };
    D.fasts.push(f); byStart[dayKey(day)] = f;
  }

  for (let d = 30; d >= 0; d--) {
    const day = addDays(today, -d), k = dayKey(day), weekend = day.getDay() === 0 || day.getDay() === 6;
    const morning = byStart[dayKey(addDays(day, -1))], night = byStart[k];
    if (morning?.end) {
      const first = morning.end + rnd(5, 35) * MIN - (weekend ? rnd(0, 40) * MIN : 0);
      const lastLimit = night ? night.start - rnd(10, 45) * MIN : day.getTime() + (toMin(st.startTime) - 20) * MIN;
      const slots: [number, string][] = [];
      if (lastLimit - first > 90 * MIN) {
        slots.push([first, "İlk öğün"]);
        if (Math.random() < 0.55) slots.push([first + (lastLimit - first) * rnd(0.4, 0.6), "Ara öğün"]);
        slots.push([lastLimit, "Son öğün"]);
      } else slots.push([first, "İlk öğün"]);
      for (const [ts, label] of slots) {
        if (ts > now) continue;
        const tags = MEAL_TAGS.slice(0, 3).filter(() => Math.random() < 0.6);
        if (Math.random() < 0.2) tags.push("Tatlı");
        D.meals.push({ id: uid(), ts: roundMin(ts), label, tags, note: "", demo: true });
      }
    }
    const target = rnd(1200, 2900);
    let total = 0, t = day.getTime() + rnd(7.5, 9) * HOUR;
    while (total < target && t < day.getTime() + 22 * HOUR) {
      const ml = Math.random() < 0.65 ? 250 : 500;
      if (t <= now) D.water.push({ id: uid(), ts: roundMin(t), ml, demo: true });
      total += ml; t += rnd(0.8, 2.2) * HOUR;
    }
    const n = weightedPick<number>([[0, 2], [1, 4], [2, 3], [3, 1]]);
    for (let i = 0; i < n; i++) {
      const slot = weightedPick<string>([["evening", 5], ["morning", 3], ["afternoon", 2]]);
      const hr = slot === "evening" ? rnd(21, 23.6) : slot === "morning" ? rnd(9.5, 11.8) : rnd(15.5, 17.5);
      const ts = day.getTime() + hr * HOUR;
      if (ts > now) continue;
      const reason = slot === "evening"
        ? weightedPick<string>([["Tatlı isteği", 5], ["Alışkanlık", 4], ["Can sıkıntısı", 2], ["Stres", 2], ["Gerçek açlık", 1]])
        : weightedPick<string>([["Gerçek açlık", 5], ["Alışkanlık", 2], ["Stres", 1], ["Sosyal ortam", 1]]);
      // kısa uykudan sonraki günlerde açlık biraz daha yüksek olsun (gerçekçi örüntü)
      D.hunger.push({ id: uid(), ts: roundMin(ts), level: clamp(Math.round(slot === "evening" ? rnd(4, 8) : rnd(3, 7)), 1, 10), reason, note: "", demo: true });
    }
    const bed = addDays(day, -1).getTime() + (23 * 60 + rnd(-30, 100) + (weekend ? 45 : 0)) * MIN;
    const wake = day.getTime() + (6 * 60 + 40 + rnd(0, 80) + (weekend ? 60 : 0)) * MIN;
    if (wake <= now) D.sleep.push({ id: uid(), date: k, bed: roundMin(bed), wake: roundMin(wake), demo: true });
  }
  const p = S.meta.profile;
  const cur = p?.weight || 78, startW = cur + 1.9;
  for (let d = 30; d >= 0; d -= 3) {
    const kg = Math.round((startW - (startW - cur) * ((30 - d) / 30) + rnd(-0.3, 0.3)) * 10) / 10;
    const ts = addDays(today, -d).getTime() + rnd(7.2, 8.2) * HOUR;
    if (ts > now) continue;
    const waist = p?.height && d % 6 === 0 ? Math.round(p.height * 0.5 + (kg - cur) * 0.9) : null;
    D.weight.push({ id: uid(), ts: roundMin(ts), kg, waist, demo: true });
  }
  for (const c of Object.keys(D) as (keyof typeof D)[]) (S as any)[c] = (S as any)[c].filter((x: any) => !x.demo).concat(D[c]);
  S.meta.demo = true;
  newlyUnlocked(); // demo rozetlerini sessizce işaretle
  commit(...COLS);
}

export function clearDemo() {
  for (const c of COLS) if (c !== "meta") (S as any)[c] = (S as any)[c].filter((x: any) => !x.demo);
  S.meta.demo = false;
  S.meta.achievements = {};
  newlyUnlocked();
  commit(...COLS);
}
