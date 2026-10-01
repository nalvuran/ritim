import { useEffect, useRef, useState } from "react";
import { S } from "../services/store";
import { generateDemo } from "../services/demo";
import { setTab, toast } from "../services/ui";
import { Button } from "../components/Button";
import { Icon } from "../components/Icons";
import { Err, HealthFields, PlanFields, ProfileFields, profileToDraft, validatePlan, validateProfile, type PlanDraft } from "../components/Forms";
import type { HealthFlag, Profile } from "../types";

const SLIDES = [
  { h: "Aralıklı oruç, daha düzenli bir ritim.", p: "Ritim, yemek ve oruç saatlerini sakin ve sade bir şekilde takip etmene yardım eder.", v: 0.25 },
  { h: "Orucunu takip et.", p: "Ne zamandır oruçta olduğunu ve ne zaman biteceğini tek bakışta gör.", v: 0.5 },
  { h: "Vücudunun ve alışkanlıklarının ritmini keşfet.", p: "Açlık, su ve uyku kayıtların zamanla sana kendi örüntülerini gösterir.", v: 0.75 },
  { h: "Planını kendine göre oluştur.", p: "İstediğin modeli seç, istediğin gün esnet. Geçmişin değişmez.", v: 1 },
];
function Art({ p }: { p: number }) {
  const r = 70, c = 2 * Math.PI * r;
  return (
    <svg className="ob-art" viewBox="0 0 180 180" aria-hidden="true" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="90" cy="90" r={r} fill="none" stroke="var(--track)" strokeWidth={10} />
      <circle cx="90" cy="90" r={r} fill="none" stroke="var(--green)" strokeWidth={10} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: "stroke-dashoffset 1s var(--ease)" }} />
    </svg>
  );
}

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [prof, setProf] = useState(profileToDraft(null));
  const [profData, setProfData] = useState<Omit<Profile, "healthFlags" | "createdAt"> | null>(null);
  const [flags, setFlags] = useState<HealthFlag[]>([]);
  const [plan, setPlan] = useState<PlanDraft>({ plan: "16:8", hours: "16", startTime: "20:00" });
  const [err, setErr] = useState<string | null>(null);
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => { setErr(null); h1.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }, [step]);
  const total = 7;
  const minor = (profData?.age || 99) < 18;

  const finish = () => {
    const r = validatePlan(plan);
    if (r.err) return setErr(r.err);
    S.meta.profile = { ...profData!, healthFlags: flags, createdAt: Date.now() };
    Object.assign(S.meta.settings, r.data);
    S.meta.seenLanding = true;
    generateDemo();
    setTab("today");
    toast("Örnek verilerle başladın. İstediğin zaman temizleyebilirsin.");
  };

  let body: React.ReactNode, foot: React.ReactNode;
  if (step < 4) {
    const s = SLIDES[step];
    body = <div className="ob-body"><Art p={s.v} /><h1 ref={h1} tabIndex={-1}>{s.h}</h1><p className="lead">{s.p}</p></div>;
    foot = <Button block onClick={() => setStep(step + 1)}>{step === 3 ? "Başlayalım" : "Devam"}</Button>;
  } else if (step === 4) {
    body = <div className="ob-body ob-form"><h1 ref={h1} tabIndex={-1}>Seni biraz tanıyalım</h1><p className="lead small-lead">Planını ve hesaplamaları kişiselleştirmek için. Bu bilgiler sadece sende kalır.</p><ProfileFields d={prof} set={setProf} /><Err msg={err} /></div>;
    foot = <Button block onClick={() => { const r = validateProfile(prof); if (r.err) return setErr(r.err); setProfData(r.data!); setStep(5); }}>Devam</Button>;
  } else if (step === 5) {
    body = (
      <div className="ob-body ob-form"><h1 ref={h1} tabIndex={-1}>Bunlardan biri sende var mı?</h1>
        <p className="lead small-lead" style={{ marginBottom: 18 }}>Güvenli bir başlangıç için soruyoruz. Birden fazla seçebilirsin.</p>
        {minor && <p className="note warn" style={{ marginBottom: 14 }}>18 yaşından küçüksen aralıklı oruç genellikle önerilmez. Başlamadan önce ailenle ve bir sağlık profesyoneliyle konuşmanı öneririz.</p>}
        <HealthFields value={flags} onChange={setFlags} /><Err msg={err} /></div>
    );
    foot = <Button block onClick={() => { if (!flags.length) return setErr("Devam etmek için bir seçim yap. Hiçbiri yoksa “Hiçbiri”ni seç."); setStep(6); }}>Devam</Button>;
  } else {
    body = (
      <div className="ob-body ob-form"><h1 ref={h1} tabIndex={-1}>Oruç modelini seç</h1>
        <p className="lead small-lead" style={{ marginBottom: 18 }}>Daha sonra Profil'den değiştirebilirsin.</p>
        <PlanFields d={plan} set={setPlan} caution={flags.some(f => f !== "none") || minor} /><Err msg={err} /></div>
    );
    foot = <Button block onClick={finish}>Oruç takibine başla</Button>;
  }
  return (
    <main className="ob screen" aria-label="Tanıtım">
      <div className="ob-top">
        {step > 0 ? <button className="icon-btn ghost-bg" onClick={() => setStep(step - 1)} aria-label="Geri"><Icon.left /></button> : <span style={{ width: 44 }} />}
        <div className="ob-dots" aria-hidden="true">{Array.from({ length: total }, (_, i) => <i key={i} className={i === step ? "on" : ""} />)}</div>
        {step < 4 ? <button className="link muted" onClick={() => setStep(4)}>Atla</button> : <span style={{ width: 44 }} />}
      </div>
      {body}
      <div>{foot}</div>
    </main>
  );
}
