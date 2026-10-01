import type { ReactNode } from "react";
import { ACTIVITY, HEALTH_FLAGS, PLANS, SEXES } from "../data/constants";
import type { HealthFlag, Profile } from "../types";
import { fromKg, toKg, unitLabel } from "../utils/domain";
import { minToHM, toMin } from "../utils/time";

export function Field({ label, children, style }: { label: string; children: ReactNode; style?: React.CSSProperties }) {
  return <label className="field" style={style}><span>{label}</span>{children}</label>;
}
export function Group({ label, children }: { label: string; children: ReactNode }) {
  return <div className="field"><span>{label}</span>{children}</div>;
}
export const Err = ({ msg }: { msg?: string | null }) => <p className="err" role="alert">{msg || ""}</p>;

export function Chips<T extends string>({ options, value, onChange, multi, label }: {
  options: { v: T; t: string; warn?: boolean }[]; value: T | T[] | null; onChange: (v: any) => void; multi?: boolean; label?: string;
}) {
  const sel = (v: T) => (multi ? (value as T[]).includes(v) : value === v);
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map(o => (
        <button type="button" key={o.v} className={`chip${o.warn ? " warn" : ""}`} aria-pressed={sel(o.v)}
          onClick={() => {
            if (!multi) onChange(value === o.v ? null : o.v);
            else { const arr = value as T[]; onChange(arr.includes(o.v) ? arr.filter(x => x !== o.v) : [...arr, o.v]); }
          }}>{o.t}</button>
      ))}
    </div>
  );
}
export function Seg<T extends string | number>({ options, value, onChange, label }: { options: { v: T; t: string }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(o => <button type="button" key={String(o.v)} aria-pressed={value === o.v} onClick={() => onChange(o.v)}>{o.t}</button>)}
    </div>
  );
}

/* ---------- Profil ---------- */
export interface ProfileDraft { age: string; height: string; weight: string; targetWeight: string; sex: string | null; activity: string }
export const profileToDraft = (p?: Partial<Profile> | null): ProfileDraft => ({
  age: p?.age ? String(p.age) : "", height: p?.height ? String(p.height) : "",
  weight: p?.weight ? String(Math.round(fromKg(p.weight) * 10) / 10) : "",
  targetWeight: p?.targetWeight ? String(Math.round(fromKg(p.targetWeight) * 10) / 10) : "",
  sex: p?.sex ?? null, activity: p?.activity || "Orta",
});
const num = (s: string) => parseFloat(String(s).replace(",", "."));
export function validateProfile(d: ProfileDraft): { err?: string; data?: Omit<Profile, "healthFlags" | "createdAt"> } {
  const age = Math.round(num(d.age)), height = Math.round(num(d.height)), weight = toKg(num(d.weight));
  const tw = d.targetWeight ? toKg(num(d.targetWeight)) : null;
  if (!(age >= 13 && age <= 100)) return { err: "Yaşını 13 ile 100 arasında gir." };
  if (!(height >= 120 && height <= 230)) return { err: "Boyunu 120–230 cm arasında gir." };
  if (!(weight >= 30 && weight <= 300)) return { err: "Geçerli bir kilo gir." };
  if (tw != null) {
    if (!(tw >= 30 && tw <= 300)) return { err: "Geçerli bir hedef kilo gir ya da boş bırak." };
    if (tw / Math.pow(height / 100, 2) < 18.5) return { err: "Bu hedef, boyuna göre sağlıklı kabul edilen aralığın altında görünüyor. Daha yüksek bir hedef seçebilir ya da bu alanı boş bırakabilirsin." };
  }
  return { data: { age, height, weight: Math.round(weight * 10) / 10, targetWeight: tw ? Math.round(tw * 10) / 10 : null, sex: d.sex, activity: d.activity } };
}
export function ProfileFields({ d, set }: { d: ProfileDraft; set: (d: ProfileDraft) => void }) {
  const u = (k: keyof ProfileDraft) => (e: React.ChangeEvent<HTMLInputElement>) => set({ ...d, [k]: e.target.value });
  return (
    <>
      <div className="input-row">
        <Field label="Yaş"><input className="input" type="number" inputMode="numeric" value={d.age} onChange={u("age")} /></Field>
        <Field label="Boy (cm)"><input className="input" type="number" inputMode="numeric" value={d.height} onChange={u("height")} /></Field>
      </div>
      <div className="input-row">
        <Field label={`Kilo (${unitLabel()})`}><input className="input" type="number" inputMode="decimal" step="0.1" value={d.weight} onChange={u("weight")} /></Field>
        <Field label="Hedef kilo (isteğe bağlı)"><input className="input" type="number" inputMode="decimal" step="0.1" value={d.targetWeight} onChange={u("targetWeight")} /></Field>
      </div>
      <Group label="Cinsiyet (isteğe bağlı)"><Chips options={SEXES.map(s => ({ v: s, t: s }))} value={d.sex} onChange={v => set({ ...d, sex: v })} /></Group>
      <Group label="Günlük aktivite seviyesi"><Seg options={ACTIVITY.map(a => ({ v: a, t: a }))} value={d.activity} onChange={v => set({ ...d, activity: v })} /></Group>
    </>
  );
}

/* ---------- Sağlık durumları ---------- */
export function HealthFields({ value, onChange }: { value: HealthFlag[]; onChange: (v: HealthFlag[]) => void }) {
  const any = value.some(f => f !== "none");
  return (
    <>
      <div className="chips" role="group" aria-label="Sağlık durumları">
        {[...HEALTH_FLAGS, { id: "none" as HealthFlag, t: "Hiçbiri" }].map(f => (
          <button type="button" key={f.id} className="chip" aria-pressed={value.includes(f.id)} onClick={() => {
            const on = !value.includes(f.id);
            if (f.id === "none") onChange(on ? ["none"] : []);
            else onChange(on ? [...value.filter(x => x !== "none"), f.id] : value.filter(x => x !== f.id));
          }}>{f.t}</button>
        ))}
      </div>
      {any && <p className="note warn" style={{ marginTop: 16 }}>Seçtiğin durumlarda oruç planının bir doktor ya da sağlık profesyoneliyle birlikte belirlenmesi önemli. Uygulamayı takip için kullanabilirsin; koç bu konularda kişisel öneri vermez.</p>}
    </>
  );
}

/* ---------- Oruç planı ---------- */
export interface PlanDraft { plan: string; hours: string; startTime: string }
export function validatePlan(d: PlanDraft) {
  const p = PLANS.find(x => x.id === d.plan)!;
  const h = p.h || Math.round(+d.hours);
  if (!(h >= 10 && h <= 23)) return { err: "Oruç süresi 10 ile 23 saat arasında olmalı." };
  if (!d.startTime) return { err: "Başlangıç saatini seç." };
  return { data: { plan: d.plan, fastHours: h, startTime: d.startTime } };
}
export function PlanFields({ d, set, caution }: { d: PlanDraft; set: (d: PlanDraft) => void; caution: boolean }) {
  const p = PLANS.find(x => x.id === d.plan)!;
  const h = p.h || +d.hours || 16;
  return (
    <>
      <div className="list" role="radiogroup" aria-label="Oruç modeli">
        {PLANS.map(x => (
          <button type="button" key={x.id} className="li" role="radio" aria-checked={d.plan === x.id} onClick={() => set({ ...d, plan: x.id })}>
            <span className="t"><span style={{ fontWeight: 600 }}>{x.id}</span><span className="s">{x.d}</span></span>
            <span className={`dot${d.plan === x.id ? " ok" : ""}`} aria-hidden="true" />
          </button>
        ))}
      </div>
      {p.intense && caution && <p className="note warn" style={{ marginTop: 12 }}>Bu yoğun bir plan. Belirttiğin durumlar nedeniyle bu planı bir sağlık profesyoneliyle konuşarak seçmeni öneririz.</p>}
      {d.plan === "Özel" && <Field label="Oruç süresi (saat)"><input className="input" type="number" inputMode="numeric" min={10} max={23} value={d.hours} onChange={e => set({ ...d, hours: e.target.value })} /></Field>}
      <Field label="Oruç başlangıç saati"><input className="input" type="time" value={d.startTime} onChange={e => set({ ...d, startTime: e.target.value })} /></Field>
      {d.startTime && <p className="note" style={{ marginTop: 12 }}>Oruç {d.startTime} → {minToHM(toMin(d.startTime) + h * 60)}, yemek penceresi {24 - h} saat</p>}
    </>
  );
}
