import { S } from "./store";
import { HOUR, dayKey, hm, todayKey } from "../utils/time";
import { fastDur } from "../utils/domain";
import { capability, inClaude } from "./claude";

export function exportJSON() {
  return JSON.stringify({
    uygulama: "Ritim", surum: 2, disaAktarim: new Date().toISOString(),
    profil: S.meta.profile, ayarlar: S.meta.settings, gunlukPlanlar: S.meta.overrides, rozetler: S.meta.achievements,
    oruclar: S.fasts, ogunler: S.meals, su: S.water, aclik: S.hunger, uyku: S.sleep, kilo: S.weight,
  }, null, 2);
}

/** Excel (TR) ile uyumlu: noktalı virgül ayırıcı, ondalık virgül, UTF-8 BOM */
export function exportCSV() {
  const dt = (ts: number | null) => (ts ? `${dayKey(ts)} ${hm(ts)}` : "");
  const q = (v: unknown) => { const s = String(v ?? ""); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const dec = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");
  const rows: unknown[][] = [["tur", "baslangic", "bitis", "deger", "birim", "detay"]];
  S.fasts.forEach(f => rows.push(["oruc", dt(f.start), dt(f.end), f.end ? dec(fastDur(f) / HOUR) : "devam ediyor", "saat", `hedef ${f.goalH} saat`]));
  S.meals.forEach(m => rows.push(["ogun", dt(m.ts), "", "", "", [m.label, ...(m.tags || []), m.note].filter(Boolean).join(", ")]));
  S.water.forEach(w => rows.push(["su", dt(w.ts), "", w.ml, "ml", ""]));
  S.hunger.forEach(h => rows.push(["aclik", dt(h.ts), "", h.level, "/10", [h.reason, h.note].filter(Boolean).join(", ")]));
  S.sleep.forEach(s => rows.push(["uyku", dt(s.bed), dt(s.wake), dec((s.wake - s.bed) / HOUR), "saat", ""]));
  S.weight.forEach(w => rows.push(["kilo", dt(w.ts), "", dec(w.kg), "kg", w.waist ? `bel ${dec(w.waist)} cm` : ""]));
  return "\ufeff" + rows.map(r => r.map(q).join(";")).join("\r\n");
}

export type ExportResult = "saved" | "declined" | "busy" | { fallback: string };
export async function exportData(fmt: "json" | "csv"): Promise<ExportResult> {
  const data = fmt === "json" ? exportJSON() : exportCSV();
  const filename = `ritim-veriler-${todayKey()}.${fmt}`;
  if (inClaude()) {
    const dl = await capability<any>("downloads");
    if (dl) {
      try { await dl.save({ filename, data }); return "saved"; }
      catch (e: any) { if (e?.code === "declined") return "declined"; if (e?.code === "rate_limited") return "busy"; }
    }
    return { fallback: data };
  }
  try {
    const blob = new Blob([data], { type: fmt === "json" ? "application/json" : "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return "saved";
  } catch { return { fallback: data }; }
}
