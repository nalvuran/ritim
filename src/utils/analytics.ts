import { S } from "../services/store";
import type { Insight } from "../types";
import { HOUR, MIN, addDays, atLoc, avg, dayKey, fmtDur, fmtL, keyToDate, minToHM, minutesOfDay, rangeDays, sum, weekStart } from "./time";
import { bestFastOn, eatingWindow, fastDur, hardestWindow, isSuccess, mealsOn, settings, sleepOn, waterOn, hungerOn } from "./domain";

/* ---------------- Aralık istatistikleri ---------------- */
export function computeStats(days: string[]) {
  const set = new Set(days);
  const fasts = S.fasts.filter(f => f.end && set.has(dayKey(f.end)));
  const durs = fasts.map(fastDur);
  const wins = days.map(eatingWindow).filter((v): v is number => v != null);
  const waters = days.map(waterOn).filter(v => v > 0);
  const sleeps = days.map(sleepOn).filter(Boolean).map(s => s!.wake - s!.bed);
  return {
    days, fasts, count: fasts.length,
    avgFast: avg(durs), maxFast: durs.length ? Math.max(...durs) : null, minFast: durs.length ? Math.min(...durs) : null,
    rate: fasts.length ? fasts.filter(isSuccess).length / fasts.length : null,
    successDays: days.filter(k => S.fasts.some(f => f.end && dayKey(f.end) === k && isSuccess(f))).length,
    avgWin: avg(wins), avgWater: avg(waters), avgSleep: avg(sleeps),
  };
}
export const statsLastN = (n: number) => computeStats(rangeDays(n));

/** Kaç farklı günde kayıt var (içgörüler için veri yeterliliği) */
export function trackedDays(n = 30) {
  return rangeDays(n).filter(k => bestFastOn(k) || mealsOn(k).length || waterOn(k) || sleepOn(k)).length;
}

/* ---------------- Davranış analizi (son 30 gün) ---------------- */
export function behavior(n = 30) {
  const days = rangeDays(n), set = new Set(days);
  const ok = S.fasts.filter(f => f.end && set.has(dayKey(f.end)) && isSuccess(f));
  let comfy: string | null = null;
  if (ok.length >= 3) {
    const r30 = (ts: number) => Math.round(minutesOfDay(ts) / 30) * 30;
    const counts: Record<string, number> = {};
    ok.forEach(f => { const key = `${minToHM(r30(f.start))} → ${minToHM(r30(f.end!))}`; counts[key] = (counts[key] || 0) + 1; });
    comfy = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }
  const logs = S.hunger.filter(h => set.has(dayKey(h.ts)));
  const reasons: Record<string, number> = {};
  logs.forEach(l => (reasons[l.reason] = (reasons[l.reason] || 0) + 1));
  const topReason = logs.length >= 3 ? Object.entries(reasons).sort((a, b) => b[1] - a[1])[0][0] : null;
  let hardestHour: string | null = null;
  if (logs.length >= 5) {
    const c = Array(48).fill(0);
    logs.forEach(l => c[Math.floor(minutesOfDay(l.ts) / 30)]++);
    const i = c.indexOf(Math.max(...c));
    hardestHour = minToHM(i * 30);
  }
  const st = computeStats(days);
  return { comfy, hardestHour, topReason, avgFast: st.avgFast, rate: st.rate, enough: st.count >= 5 };
}

/* ---------------- Kişisel içgörüler ----------------
   Yalnızca gerçek kayıtlardan hesaplanır; yeterli örnek yoksa üretilmez. */
export function insights(): Insight[] {
  const out: Insight[] = [];
  if (trackedDays(30) < 7) return out;
  const now = Date.now();

  // 1) Bitiş zamanı kayması (son 7 gün)
  const last7 = S.fasts.filter(f => f.end && f.end > now - 7 * 86_400_000);
  if (last7.length >= 4) {
    const diff = avg(last7.map(f => (f.end! - (f.start + f.goalH * HOUR)) / MIN))!;
    if (Math.abs(diff) >= 10) {
      const m = Math.round(Math.abs(diff));
      out.push({ id: "drift", text: `Son 7 gündür orucunu planından ortalama ${fmtDur(m * MIN)} daha ${diff < 0 ? "erken" : "geç"} bitiriyorsun.` });
    }
  }
  // 2) Başarılı günlerde son öğün saati
  const from30 = now - 30 * 86_400_000;
  const okFasts = S.fasts.filter(f => f.end && f.start > from30 && isSuccess(f));
  const lastMeals = okFasts.map(f => S.meals.filter(m => m.ts <= f.start && f.start - m.ts < 8 * HOUR).sort((a, b) => b.ts - a.ts)[0]).filter(Boolean);
  if (lastMeals.length >= 4) {
    const t = minToHM(avg(lastMeals.map(m => { const x = minutesOfDay(m!.ts); return x < 300 ? x + 1440 : x; }))!);
    out.push({ id: "lastmeal", text: `Hedefini tamamladığın günlerde son öğünün ortalama ${t}.` });
  }
  // 3) Hafta sonu vs hafta içi yemek penceresi
  const days30 = rangeDays(30);
  const we: number[] = [], wd: number[] = [];
  days30.forEach(k => { const w = eatingWindow(k); if (w == null) return; const d = keyToDate(k).getDay(); (d === 0 || d === 6 ? we : wd).push(w); });
  if (we.length >= 3 && wd.length >= 5) {
    const diff = (avg(we)! - avg(wd)!) / MIN;
    if (Math.abs(diff) >= 30) out.push({ id: "weekend", text: `Hafta sonlarında yemek penceren hafta içine göre ${fmtDur(Math.abs(diff) * MIN)} daha ${diff > 0 ? "uzun" : "kısa"}.` });
  }
  // 4) Uyku ve ertesi gün açlık
  const shortH: number[] = [], longH: number[] = [];
  days30.forEach(k => {
    const s = sleepOn(k), h = hungerOn(k);
    if (!s || !h.length) return;
    const a = avg(h.map(x => x.level))!;
    ((s.wake - s.bed) / HOUR < 7 ? shortH : longH).push(a);
  });
  if (shortH.length >= 3 && longH.length >= 3) {
    const d = avg(shortH)! - avg(longH)!;
    if (d >= 0.8) out.push({ id: "sleep", text: `7 saatten az uyuduğun günlerde açlık seviyen ortalama ${d.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} puan daha yüksek.` });
  }
  // 5) Su ve hedefe ulaşma
  const hi: boolean[] = [], lo: boolean[] = [];
  days30.forEach(k => { const f = bestFastOn(k); const w = waterOn(k); if (!f || !w) return; (w >= settings().waterGoal * 0.8 ? hi : lo).push(isSuccess(f)); });
  if (hi.length >= 4 && lo.length >= 4) {
    const r1 = hi.filter(Boolean).length / hi.length, r2 = lo.filter(Boolean).length / lo.length;
    if (r1 - r2 >= 0.15) out.push({ id: "water", text: `Su hedefine yaklaştığın günlerde orucunu tamamlama oranın %${Math.round(r1 * 100)}, diğer günlerde %${Math.round(r2 * 100)}.` });
  }
  // 6) Son öğün → uyku
  const gaps: number[] = [];
  days30.forEach(k => {
    const s = sleepOn(dayKey(addDays(keyToDate(k), 1)));
    if (!s) return;
    const lm = S.meals.filter(m => m.ts < s.bed && s.bed - m.ts < 12 * HOUR).sort((a, b) => b.ts - a.ts)[0];
    if (lm) gaps.push(s.bed - lm.ts);
  });
  if (gaps.length >= 5) out.push({ id: "gap", text: `Son öğünün ile uyku arasında ortalama ${fmtDur(avg(gaps)!)} var.` });
  return out;
}

/* ---------------- Haftalık rapor ---------------- */
export function weeklyReport(offsetWeeks = 0) {
  const ws = addDays(weekStart(new Date()), offsetWeeks * 7);
  const all = Array.from({ length: 7 }, (_, i) => dayKey(addDays(ws, i)));
  const today = dayKey(new Date());
  const days = all.filter(k => k <= today);
  const st = computeStats(days);
  const set = new Set(days);
  const logs = S.hunger.filter(h => set.has(dayKey(h.ts)));
  let hard: string | null = null;
  if (logs.length >= 3) {
    const c = Array(24).fill(0); logs.forEach(l => c[new Date(l.ts).getHours()]++);
    let b = -1, bh = 0; for (let h = 0; h < 24; h++) { const v = c[h] + c[(h + 1) % 24]; if (v > b) { b = v; bh = h; } }
    hard = `${String(bh).padStart(2, "0")}:00–${String((bh + 2) % 24).padStart(2, "0")}:00`;
  }
  const late = days.filter(k => mealsOn(k).some(m => new Date(m.ts).getHours() >= 22 || new Date(m.ts).getHours() < 4)).length;
  const lateHunger = logs.filter(l => new Date(l.ts).getHours() >= 21).length;
  // Küçük hedef önerisi — emir değil öneri
  let goal: string;
  const goalH = settings().fastHours;
  if (st.avgWater != null && st.avgWater < settings().waterGoal * 0.8) goal = `Bu hafta su hedefine (${fmtL(settings().waterGoal)} L) en az 3 gün ulaşmayı deneyebilirsin.`;
  else if (lateHunger >= 3 || late >= 2) goal = "Gece atıştırmalarını 2 gün azaltmayı deneyebilirsin; akşam için hazır bir bitki çayı yardımcı olabilir.";
  else if (st.avgSleep != null && st.avgSleep < 7 * HOUR) goal = "Bu hafta 2 gece, her zamankinden 30 dakika erken yatmayı deneyebilirsin.";
  else if (st.avgFast != null && st.avgFast < goalH * HOUR - 30 * MIN) goal = `Orucunu planına ${fmtDur(goalH * HOUR - st.avgFast)} kadar yaklaştırmak için önce 2 günde 30 dakika uzatmayı deneyebilirsin.`;
  else if (st.count >= 5) goal = "Ritmin oturmuş görünüyor. Aynı düzeni korumak bu hafta için yeterli bir hedef.";
  else goal = "Bu hafta en az 4 gün orucunu kaydetmeyi deneyebilirsin; veriler biriktikçe içgörüler de kişiselleşir.";
  return { ws, all, days, st, hard, goal, isCurrent: offsetWeeks === 0 };
}

/* ---------------- Seri ---------------- */
export function successDaySet() {
  const s = new Set<string>();
  S.fasts.forEach(f => { if (isSuccess(f)) s.add(dayKey(f.end!)); });
  return s;
}
export function streak() {
  const ok = successDaySet();
  let d = new Date();
  if (!ok.has(dayKey(d))) d = addDays(d, -1); // bugün henüz bitmediyse dünden say
  let n = 0;
  while (ok.has(dayKey(d))) { n++; d = addDays(d, -1); }
  // en uzun seri
  const keys = Array.from(ok).sort();
  let best = 0, cur = 0, prev: string | null = null;
  for (const k of keys) {
    cur = prev && dayKey(addDays(keyToDate(prev), 1)) === k ? cur + 1 : 1;
    best = Math.max(best, cur); prev = k;
  }
  const st = statsLastN(30);
  return { current: n, best, rate30: st.rate };
}

/* ---------------- Rozetler ---------------- */
export interface Badge { id: string; icon: string; t: string; d: string; progress: number; target: number }
export function badges(): Badge[] {
  const ok = successDaySet();
  const finished = S.fasts.filter(f => f.end);
  const longest = finished.length ? Math.max(...finished.map(fastDur)) : 0;
  const tracked = new Set<string>();
  [...S.fasts.filter(f => f.end).map(f => f.end!), ...S.meals.map(m => m.ts), ...S.water.map(w => w.ts), ...S.hunger.map(h => h.ts), ...S.weight.map(w => w.ts)].forEach(ts => tracked.add(dayKey(ts)));
  S.sleep.forEach(s => tracked.add(s.date));
  // gece atıştırmasız: üst üste en fazla kaç gün öğün kaydı var ve 22:00 sonrası öğün yok
  const mealDays = Array.from(new Set(S.meals.map(m => dayKey(m.ts)))).sort();
  let night = 0, nightBest = 0, prev: string | null = null;
  for (const k of mealDays) {
    const clean = !mealsOn(k).some(m => new Date(m.ts).getHours() >= 22);
    const consecutive = prev && dayKey(addDays(keyToDate(prev), 1)) === k;
    night = clean ? (consecutive ? night + 1 : 1) : 0;
    nightBest = Math.max(nightBest, night); prev = k;
  }
  const waterDays = Array.from(new Set(S.water.map(w => dayKey(w.ts)))).filter(k => waterOn(k) >= settings().waterGoal).length;
  const { best } = streak();
  return [
    { id: "first", icon: "🌱", t: "İlk Oruç", d: "İlk orucunu tamamla", progress: Math.min(1, finished.length), target: 1 },
    { id: "streak7", icon: "🔥", t: "7 Başarılı Gün", d: "Üst üste 7 gün hedefine ulaş", progress: Math.min(7, best), target: 7 },
    { id: "ten", icon: "💪", t: "10 Oruç", d: "10 oruç kaydet", progress: Math.min(10, finished.length), target: 10 },
    { id: "ok30", icon: "🏆", t: "30 Başarılı Gün", d: "Toplam 30 gün hedefine ulaş", progress: Math.min(30, ok.size), target: 30 },
    { id: "h16", icon: "⏱️", t: "16 Saat", d: "16 saatlik bir orucu tamamla", progress: Math.min(16, Math.floor(longest / HOUR)), target: 16 },
    { id: "night", icon: "🌙", t: "Gece Atıştırmasız", d: "Üst üste 7 gün 22:00'den sonra öğün yok", progress: Math.min(7, nightBest), target: 7 },
    { id: "water", icon: "💧", t: "Hidrasyon", d: "7 gün su hedefine ulaş", progress: Math.min(7, waterDays), target: 7 },
    { id: "track30", icon: "📅", t: "30 Gün Takip", d: "30 farklı günde kayıt tut", progress: Math.min(30, tracked.size), target: 30 },
  ];
}
/** Yeni açılan rozetleri meta.achievements'a ekler ve döndürür */
export function newlyUnlocked(): Badge[] {
  const fresh: Badge[] = [];
  for (const b of badges()) if (b.progress >= b.target && !S.meta.achievements[b.id]) { S.meta.achievements[b.id] = Date.now(); fresh.push(b); }
  return fresh;
}
export const lastMealToSleep = (bed: number) => {
  const lm = S.meals.filter(m => m.ts < bed && bed - m.ts < 14 * HOUR).sort((a, b) => b.ts - a.ts)[0];
  return lm ? bed - lm.ts : null;
};
export { hardestWindow, atLoc, sum };
