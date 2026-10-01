/* Tarih/saat yardımcıları — tüm biçimler Türkiye kullanıcılarına göre (tr-TR, 24 saat). */
export const MIN = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

export const pad = (n: number) => String(n).padStart(2, "0");
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
export const avg = (a: number[]): number | null => (a.length ? sum(a) / a.length : null);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const dayKey = (d: number | Date) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
export const keyToDate = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const startOfDay = (d: number | Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const addDays = (d: number | Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const todayKey = () => dayKey(new Date());
export const hm = (ts: number) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const toMin = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
export const minToHM = (m: number) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
export const atTime = (k: string, t: string) => { const d = keyToDate(k); const [h, m] = t.split(":").map(Number); d.setHours(h, m, 0, 0); return d.getTime(); };
export const minutesOfDay = (ts: number) => { const d = new Date(ts); return d.getHours() * 60 + d.getMinutes(); };
/** Monday of the week containing d */
export const weekStart = (d: number | Date) => { const x = startOfDay(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
export const rangeDays = (n: number) => { const out: string[] = []; for (let i = n - 1; i >= 0; i--) out.push(dayKey(addDays(new Date(), -i))); return out; };

export function fmtDur(ms: number | null | undefined): string {
  if (ms == null || isNaN(ms)) return "—";
  ms = Math.max(0, ms);
  const t = Math.round(ms / MIN), h = Math.floor(t / 60), m = t % 60;
  if (h === 0) return `${m}dk`;
  if (m === 0) return `${h}s`;
  return `${h}s ${m}dk`;
}
export function fmtClock(ms: number) {
  ms = Math.max(0, ms);
  const s = Math.floor(ms / 1000);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}
export const fmtL = (ml: number) => (ml / 1000).toLocaleString("tr-TR", { minimumFractionDigits: ml % 100 ? 2 : 1, maximumFractionDigits: 2 });
export const fmtNum = (n: number, d = 1) => Number(n).toLocaleString("tr-TR", { maximumFractionDigits: d, minimumFractionDigits: 0 });
export const fmtDateLong = (d: number | Date) => {
  const x = new Date(d);
  return `${new Intl.DateTimeFormat("tr-TR", { weekday: "long" }).format(x)}, ${new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(x)}`;
};
export const fmtDayMonth = (d: number | Date) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(new Date(d));
export const fmtDayShort = (d: number | Date) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(new Date(d));
export const fmtMonthYear = (d: number | Date) => new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(new Date(d));
export const fmtWeekday = (d: number | Date) => new Intl.DateTimeFormat("tr-TR", { weekday: "long" }).format(new Date(d));

export function relDayLabel(ts: number) {
  const k = dayKey(ts);
  if (k === todayKey()) return "";
  if (k === dayKey(addDays(new Date(), 1))) return "Yarın ";
  if (k === dayKey(addDays(new Date(), -1))) return "Dün ";
  return fmtDayShort(ts) + " ";
}
export function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Günaydın";
  if (h >= 12 && h < 18) return "İyi günler";
  if (h >= 18 && h < 23) return "İyi akşamlar";
  return "İyi geceler";
}

/** Saat için Türkçe bulunma eki: 20:00'de, 09:03'te, 12:30'da, 16:00'da */
export function locSfx(t: string) {
  const [h, m] = t.split(":").map(Number);
  const n = m === 0 ? h : m;
  const word = n === 0 ? "sıfır" : n % 10 ? ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"][n % 10] : ["", "on", "yirmi", "otuz", "kırk", "elli"][n / 10];
  const vs = word.match(/[aeıioöuü]/g)!;
  const v = vs[vs.length - 1];
  return ("çfhkpsşt".includes(word.slice(-1)) ? "t" : "d") + ("eiöü".includes(v) ? "e" : "a");
}
export const sfx = (t: string) => `'${locSfx(t)}`;
/** "20:00'de" */
export const atLoc = (t: string) => `${t}${sfx(t)}`;
