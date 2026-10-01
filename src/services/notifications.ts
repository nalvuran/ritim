import { S } from "./store";
import { MIN, atTime, todayKey, toMin } from "../utils/time";
import { activeFast, habitScore, planFor, settings, waterOn } from "../utils/domain";

const SENT_KEY = "ritim.notif.sent";

/** Bildirimler yalnızca uygulama kendi sayfasında (çerçeve içinde değil) ve tarayıcı destekliyorsa çalışır. */
export function notificationSupport(): "ok" | "framed" | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  try { if (window.self !== window.top) return "framed"; } catch { return "framed"; }
  return "ok";
}
export const permission = () => ("Notification" in window ? Notification.permission : "denied");
export async function requestPermission(): Promise<NotificationPermission> {
  try { return await Notification.requestPermission(); } catch { return "denied"; }
}

function inQuiet(now = new Date()) {
  const n = settings().notifications;
  const m = now.getHours() * 60 + now.getMinutes(), a = toMin(n.quietStart), b = toMin(n.quietEnd);
  return a === b ? false : a < b ? m >= a && m < b : m >= a || m < b;
}
function sentMap(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(SENT_KEY) || "{}"); } catch { return {}; }
}
function markSent(key: string) {
  const m = sentMap(); m[key] = Date.now();
  const cutoff = Date.now() - 3 * 86_400_000;
  for (const k of Object.keys(m)) if (m[k] < cutoff) delete m[k];
  try { localStorage.setItem(SENT_KEY, JSON.stringify(m)); } catch { /* yok say */ }
}
async function show(key: string, title: string, body: string) {
  if (sentMap()[key]) return;
  markSent(key);
  const opts: NotificationOptions = { body, tag: key, icon: `${import.meta.env.BASE_URL}icons/icon-192.png`, badge: `${import.meta.env.BASE_URL}icons/icon-192.png` };
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) await reg.showNotification(title, opts); else new Notification(title, opts);
  } catch { /* bildirim gösterilemedi */ }
}

/** Uygulama açıkken (ya da arka planda canlıyken) periyodik olarak çağrılır. */
export function checkNotifications() {
  const n = settings().notifications;
  if (!n.enabled || !S.meta.profile || notificationSupport() !== "ok" || permission() !== "granted") return;
  const now = Date.now(), k = todayKey();
  if (inQuiet()) return;
  const af = activeFast();
  if (af) {
    const goal = af.start + af.goalH * 3_600_000;
    if (n.goalSoon && goal - now > 0 && goal - now <= 15 * MIN) show(`goal-soon-${af.id}`, "Oruç hedefin tamamlanmak üzere.", `${af.goalH} saatlik hedefine 15 dakikadan az kaldı.`);
    if (n.windowOpen && now >= goal && now - goal < 20 * MIN) show(`window-${af.id}`, "Yemek penceren açıldı.", `${af.goalH} saatlik hedefin tamamlandı. Hazır olduğunda orucu bitirebilirsin.`);
  } else if (n.fastStart) {
    const st = atTime(k, planFor().startTime);
    if (now >= st && now - st < 20 * MIN) show(`start-${k}`, "Oruç başlıyor.", "Planına göre oruç başlama saatin geldi.");
  }
  const h = new Date().getHours();
  if (n.water && [11, 14, 17].includes(h)) {
    const expected = settings().waterGoal * ((h - 8) / 12);
    if (waterOn(k) < expected * 0.7) show(`water-${k}-${h}`, "Su içmeyi unutma.", "Bir bardak su iyi gelebilir.");
  }
  if (n.dailyCheck && h === 21) {
    const tracked = habitScore(k).parts.find(p => p.k === "Takip düzenliliği")!.v / 4;
    if (tracked < 3) show(`daily-${k}`, "Bugünkü verilerini tamamlamak ister misin?", "Birkaç kayıt, haftalık raporunu daha anlamlı yapar.");
  }
}
