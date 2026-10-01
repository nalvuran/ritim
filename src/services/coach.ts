import { S } from "./store";
import { capability, inClaude } from "./claude";
import { HEALTH_FLAGS } from "../data/constants";
import { avg, dayKey, fmtDateLong, fmtDur, fmtL, fmtNum, hm, keyToDate, rangeDays, sfx } from "../utils/time";
import { bestFastOn, eatingWindow, fastDur, hardestWindow, hungerOn, liveState, mealsOn, planFor, settings, sleepOn, waterOn, weightsSorted } from "../utils/domain";
import { computeStats, insights } from "../utils/analytics";

export interface Turn { role: "user" | "assistant"; content: string }

export const COACH_RULES = `Sen "Ritim" adlı aralıklı oruç takip uygulamasının koçusun. Kurallar:
- Türkçe, sakin, sıcak, yargılamayan bir dille yaz. Kısa tut: en fazla 3 kısa paragraf ya da 5 madde. Markdown kullanma (yıldız, başlık yok); madde gerekiyorsa "•" kullan.
- Yanıtı aşağıdaki kullanıcı verilerine dayandır, veriden çıkarım yaptığında bunu belirt ("verilerine göre…"). Veri yoksa uydurma, yeterli veri olmadığını söyle.
- Bilimsel olarak temkinli ol: "şu saatte yağ yakımı/otofaji başlar" gibi kesin iddialarda bulunma.
- Tıbbi teşhis koyma. İlaç, insülin ya da doz önerme. Diyabet, insülin, ilaçlar, gebelik/emzirme, yeme bozuklukları, hipoglisemi, bayılma, çarpıntı veya ciddi sağlık sorunları söz konusuysa kişisel oruç süresi önermeden bir doktora ya da sağlık profesyoneline danışmasını öner.
- Kullanıcıyı daha uzun ya da daha sık oruç tutmaya zorlama. Açlık, halsizlik, baş dönmesi gibi durumlarda orucu bitirmenin ve yemek yemenin her zaman geçerli bir seçenek olduğunu hatırlat.
- Aşırı kısıtlama, yemek sonrası yoğun suçluluk, kusma, kendini cezalandırma gibi yeme bozukluğu işaretleri görürsen oruç önerisi verme; nazikçe bir uzmandan destek almasını öner.
- Kendine zarar verme ya da intihar düşüncesi belirtirse önce onu dinlediğini göster, yalnız olmadığını söyle, yardım almasını öner ve Türkiye'de acil durumda 112'yi arayabileceğini belirt.
- Önerilerini emir değil öneri olarak sun ("…deneyebilirsin"). Kullanıcının işaretli sağlık durumlarını dikkate al.
- 18 yaş altı kullanıcılara oruç süresi önerisi verme; ailesi ve bir sağlık profesyoneliyle konuşmasını öner.`;

export const SAFETY_RX = /diyabet|şeker hastal|insülin|insulin|ilaç|ilac|hamile|gebe|emzir|hipoglisemi|yeme bozuk|anoreksi|bulimi|kusm|bayıl|bayil|çarpıntı|carpinti|tansiyon/i;
export const CRISIS_RX = /intihar|kendime zarar|ölmek ist|olmek ist|yaşamak istem|yasamak istem/i;

export function coachContext() {
  const p = S.meta.profile!, st = settings(), ls = liveState();
  const flags = (p.healthFlags || []).filter(f => f !== "none").map(id => HEALTH_FLAGS.find(h => h.id === id)?.t).filter(Boolean);
  const wd = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  const lines = rangeDays(14).map(k => {
    const d = keyToDate(k), f = bestFastOn(k), m = mealsOn(k), w = waterOn(k), s = sleepOn(k), h = hungerOn(k), win = eatingWindow(k);
    const reasons: Record<string, number> = {};
    h.forEach(x => (reasons[x.reason] = (reasons[x.reason] || 0) + 1));
    return `${k} ${wd[d.getDay()]}: oruç ${f ? `${fmtDur(fastDur(f))} (${hm(f.start)}→${hm(f.end!)}, hedef ${f.goalH}s)` : "yok"}; öğün ${m.length}${m.length ? ` (${m.map(x => hm(x.ts)).join(", ")})` : ""}${win ? `, pencere ${fmtDur(win)}` : ""}; su ${fmtL(w)} L; uyku ${s ? `${fmtDur(s.wake - s.bed)} (${hm(s.bed)}→${hm(s.wake)})` : "yok"}; açlık ${h.length ? `${h.length} kayıt, ort ${fmtNum(avg(h.map(x => x.level))!, 1)}/10 [${Object.entries(reasons).map(([r, n]) => `${r}×${n}`).join(", ")}] saatler ${h.map(x => hm(x.ts)).join(", ")}` : "yok"}`;
  });
  const s30 = computeStats(rangeDays(30)), s7 = computeStats(rangeDays(7));
  const ws = weightsSorted();
  const status = ls.f ? `Şu an oruçta: ${fmtDur(ls.el)} geçti, hedef ${ls.f.goalH} saat, planlanan bitiş ${hm(ls.end!)}.`
    : ls.mode === "eat" ? `Şu an yemek penceresinde; son oruç ${ls.lf ? `${fmtDur(fastDur(ls.lf))} sürdü ve ${hm(ls.lf.end!)}${sfx(hm(ls.lf.end!))} bitti` : "bilinmiyor"}.` : "Henüz oruç kaydı yok.";
  const ins = insights();
  return `KULLANICI VERİLERİ (Ritim uygulamasından)
Şimdi: ${fmtDateLong(new Date())}, saat ${hm(Date.now())}.
Profil: ${p.age} yaş${p.sex ? ", " + p.sex : ""}, boy ${p.height} cm, kilo ${fmtNum(p.weight, 1)} kg${p.targetWeight ? `, hedef ${fmtNum(p.targetWeight, 1)} kg` : ""}, aktivite ${p.activity}.
İşaretli sağlık durumları: ${flags.length ? flags.join(", ") : "yok"}.
Plan: ${st.plan}, ${st.fastHours} saat oruç, başlangıç ${st.startTime}. Bugünkü plan: ${planFor().startTime} başlangıç, ${planFor().hours} saat. Su hedefi ${fmtL(st.waterGoal)} L.
Durum: ${status}
Son 7 gün: ${s7.count} oruç, ortalama ${fmtDur(s7.avgFast)}, hedefe ulaşma ${s7.rate == null ? "—" : "%" + Math.round(s7.rate * 100)}, ort. pencere ${fmtDur(s7.avgWin)}, ort. su ${s7.avgWater ? fmtL(s7.avgWater) + " L" : "—"}, ort. uyku ${fmtDur(s7.avgSleep)}.
Son 30 gün: ${s30.count} oruç, ortalama ${fmtDur(s30.avgFast)}, en uzun ${fmtDur(s30.maxFast)}, en kısa ${fmtDur(s30.minFast)}, hedefe ulaşma ${s30.rate == null ? "—" : "%" + Math.round(s30.rate * 100)}. En sık yemek isteği aralığı: ${hardestWindow() || "yeterli veri yok"}.
Uygulamanın hesapladığı içgörüler: ${ins.length ? ins.map(i => i.text).join(" ") : "henüz yok"}
Kilo: ${ws.length >= 2 ? `${fmtNum(ws[0].kg, 1)} kg (${dayKey(ws[0].ts)}) → ${fmtNum(ws[ws.length - 1].kg, 1)} kg (${dayKey(ws[ws.length - 1].ts)})` : "yeterli kayıt yok"}.
${S.meta.demo ? "Not: Bu verilerin bir kısmı uygulamanın örnek (demo) verileridir.\n" : ""}Günlük kayıtlar (son 14 gün):
${lines.join("\n")}`;
}

export type CoachError = { code: string; text?: string };

/** Claude içinde: artifact `sample` yeteneği. Kendi sunucunda: VITE_COACH_ENDPOINT (bkz. api/coach.js). */
export async function coachAvailable(): Promise<boolean> {
  if (inClaude()) return !!(await capability("sample"));
  return !!import.meta.env.VITE_COACH_ENDPOINT;
}

export async function askCoach(turns: Turn[], onText: (t: string) => void, signal: AbortSignal): Promise<string> {
  const history = turns.slice(-12);
  while (history.length && history[0].role !== "user") history.shift();
  const input: Turn[] = [{ role: "user", content: COACH_RULES + "\n\n" + coachContext() }, ...history];
  if (inClaude()) {
    const sample = await capability<any>("sample");
    if (!sample) throw { code: "unavailable" } as CoachError;
    const res = await sample(input, { cache: false, signal, onText: ({ text }: { text: string }) => onText(text) });
    return res.text;
  }
  const endpoint = import.meta.env.VITE_COACH_ENDPOINT;
  if (!endpoint) throw { code: "unavailable" } as CoachError;
  const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: input }), signal })
    .catch(e => { throw { code: signal.aborted ? "cancelled" : "network", text: "" , e } as any; });
  if (r.status === 429) throw { code: "rate_limited" } as CoachError;
  if (!r.ok) throw { code: "upstream_error" } as CoachError;
  const data = await r.json();
  const text = String(data.text || "");
  onText(text);
  return text;
}
