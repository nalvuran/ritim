import { useState } from "react";
import { S, commit, freshState, replaceState, syncName } from "../services/store";
import { closeSheet, openSheet, setTab, toast } from "../services/ui";
import { useStore } from "../hooks/useApp";
import { Button } from "../components/Button";
import { Icon } from "../components/Icons";
import { SheetHeader } from "../components/Modal";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { WeightSheet } from "../components/WeightChart";
import { Err, Field, HealthFields, PlanFields, ProfileFields, Seg, profileToDraft, validatePlan, validateProfile, type PlanDraft } from "../components/Forms";
import { HEALTH_FLAGS } from "../data/constants";
import { exportData } from "../services/export";
import { notificationSupport, permission, requestPermission } from "../services/notifications";
import { applyTheme } from "../App";
import { openClearDemo } from "./Today";
import { fmtDayShort, fmtL, minToHM, toMin } from "../utils/time";
import { kgDisplay, settings, weightsSorted } from "../utils/domain";
import type { HealthFlag, NotificationSettings, Theme, WeightUnit } from "../types";

function EditProfileSheet() {
  const p = S.meta.profile!;
  const [d, setD] = useState(profileToDraft(p));
  const [flags, setFlags] = useState<HealthFlag[]>(p.healthFlags || []);
  const [err, setErr] = useState<string | null>(null);
  const save = () => {
    const r = validateProfile(d);
    if (r.err) return setErr(r.err);
    S.meta.profile = { ...p, ...r.data!, healthFlags: flags };
    commit("meta"); closeSheet(); toast("Bilgilerin güncellendi");
  };
  return (
    <>
      <SheetHeader title="Kişisel bilgiler" />
      <ProfileFields d={d} set={setD} />
      <div className="field"><span>Sağlık durumları</span><HealthFields value={flags} onChange={setFlags} /></div>
      <Err msg={err} />
      <div className="actions"><Button onClick={save}>Kaydet</Button></div>
    </>
  );
}

function EditPlanSheet() {
  const st = settings();
  const [d, setD] = useState<PlanDraft>({ plan: st.plan, hours: String(st.fastHours), startTime: st.startTime });
  const [err, setErr] = useState<string | null>(null);
  const caution = (S.meta.profile?.healthFlags || []).some(f => f !== "none") || (S.meta.profile?.age || 99) < 18;
  const save = () => {
    const r = validatePlan(d);
    if (r.err) return setErr(r.err);
    Object.assign(S.meta.settings, r.data);
    commit("meta"); closeSheet(); toast("Planın güncellendi");
  };
  return (
    <>
      <SheetHeader title="Oruç planı" />
      <p className="muted" style={{ marginBottom: 14 }}>Yeni plan bundan sonraki oruçlara uygulanır; geçmiş kayıtların değişmez.</p>
      <PlanFields d={d} set={setD} caution={caution} />
      <Err msg={err} />
      <div className="actions"><Button onClick={save}>Kaydet</Button></div>
    </>
  );
}

function WaterGoalSheet() {
  const [v, setV] = useState(String(settings().waterGoal));
  const [err, setErr] = useState<string | null>(null);
  const save = () => {
    const n = Math.round(+v);
    if (!(n >= 500 && n <= 6000)) return setErr("500 ile 6000 ml arasında bir hedef gir.");
    S.meta.settings.waterGoal = n; commit("meta"); closeSheet(); toast("Su hedefin güncellendi");
  };
  return (
    <>
      <SheetHeader title="Su hedefi" />
      <div className="chips" role="group">{[2000, 2500, 3000].map(x => <button key={x} type="button" className="chip" aria-pressed={+v === x} onClick={() => setV(String(x))}>{fmtL(x)} L</button>)}</div>
      <Field label="Mililitre olarak"><input className="input" type="number" inputMode="numeric" min={500} max={6000} step={50} value={v} onChange={e => setV(e.target.value)} /></Field>
      <Err msg={err} />
      <div className="actions"><Button onClick={save}>Kaydet</Button></div>
    </>
  );
}

function NotificationsSheet() {
  useStore();
  const n = settings().notifications;
  const sup = notificationSupport();
  const [perm, setPerm] = useState(permission());
  const set = (patch: Partial<NotificationSettings>) => { Object.assign(S.meta.settings.notifications, patch); commit("meta"); };
  const enable = async () => {
    const p = perm === "granted" ? "granted" : await requestPermission();
    setPerm(p);
    if (p === "granted") { set({ enabled: true }); toast("Bildirimler açıldı"); }
    else toast("Bildirim izni verilmedi. Tarayıcı ayarlarından açabilirsin.");
  };
  const rows: [keyof NotificationSettings, string][] = [
    ["fastStart", "Oruç başlıyor"], ["windowOpen", "Yemek penceren açıldı"], ["goalSoon", "Oruç hedefin tamamlanmak üzere"],
    ["water", "Su içmeyi unutma"], ["dailyCheck", "Bugünkü verilerini tamamla"],
  ];
  return (
    <>
      <SheetHeader title="Bildirimler" />
      {sup !== "ok" ? (
        <p className="note">{sup === "framed" ? "Bu görünümde bildirim gönderilemiyor. Uygulamayı kendi adresinden açıp ana ekrana eklediğinde bildirimleri açabilirsin." : "Bu tarayıcı bildirimleri desteklemiyor."}</p>
      ) : (
        <>
          <label className="check"><input type="checkbox" checked={n.enabled && perm === "granted"} onChange={e => (e.target.checked ? enable() : set({ enabled: false }))} /> Bildirimleri aç</label>
          {n.enabled && perm === "granted" && (
            <>
              <div className="list" style={{ marginTop: 12 }}>
                {rows.map(([k, t]) => <label key={k} className="li check"><span className="t">{t}</span><input type="checkbox" checked={!!n[k]} onChange={e => set({ [k]: e.target.checked } as any)} /></label>)}
              </div>
              <div className="input-row">
                <Field label="Sessiz saatler başlangıcı"><input className="input" type="time" value={n.quietStart} onChange={e => set({ quietStart: e.target.value })} /></Field>
                <Field label="Bitişi"><input className="input" type="time" value={n.quietEnd} onChange={e => set({ quietEnd: e.target.value })} /></Field>
              </div>
            </>
          )}
          <p className="tiny faint" style={{ marginTop: 14 }}>Bildirimler uygulama açıkken ya da arka planda çalışırken gönderilir. Telefonda en iyi sonuç için uygulamayı ana ekrana ekle. iPhone'da bu özellik iOS 16.4 ve sonrası gerektirir.</p>
        </>
      )}
    </>
  );
}

function ExportFallbackSheet({ data }: { data: string }) {
  return (
    <>
      <SheetHeader title="Verilerini kopyala" />
      <p className="muted">Bu görünümde dosya indirilemiyor. Verilerini kopyalayıp bir dosyaya yapıştırabilirsin.</p>
      <textarea className="input" readOnly value={data} style={{ marginTop: 14, minHeight: 220, fontSize: 13 }} />
      <div className="actions"><Button onClick={async () => { try { await navigator.clipboard.writeText(data); toast("Kopyalandı"); } catch { toast("Metni seçip kopyalayabilirsin."); } }}>Kopyala</Button></div>
    </>
  );
}

function InfoSheet({ k }: { k: "health" | "privacy" | "about" }) {
  const flags = (S.meta.profile?.healthFlags || []).filter(f => f !== "none").map(id => HEALTH_FLAGS.find(h => h.id === id)?.t).filter(Boolean);
  const title = { health: "Sağlık notu", privacy: "Gizlilik", about: "Hakkında" }[k];
  return (
    <>
      <SheetHeader title={title} />
      {k === "health" && <div className="prose">
        <p>Ritim bir alışkanlık ve günlük takip aracıdır; tıbbi teşhis ya da tedavi aracı değildir.</p>
        {flags.length > 0 && <p className="note warn">İşaretlediğin durumlar: {flags.join(", ")}. Bu durumlarda oruç planını bir doktor ya da diyetisyenle birlikte belirlemen önemli.</p>}
        <p className="muted">Gebelik ve emzirme döneminde, 18 yaş altında, diyabet ya da kan şekerini etkileyen ilaç kullanımında ve yeme bozukluğu geçmişinde aralıklı oruç önerilmeyebilir.</p>
        <p className="muted">Oruç sırasında baş dönmesi, bayılma hissi, çarpıntı ya da belirgin halsizlik yaşarsan orucu bitir ve gerekirse bir sağlık profesyoneline başvur. Acil durumda 112'yi arayabilirsin.</p>
        <p className="muted">Yemekle ilişkin seni zorluyorsa, bir sağlık profesyoneline ya da güvendiğin birine ulaşmak iyi bir adım olabilir.</p>
      </div>}
      {k === "privacy" && <div className="prose">
        <p>Verilerin yalnızca senin içindir ve bu cihazda saklanır. Uygulamayı Claude içinde açtığında ayrıca yalnızca senin erişebildiğin özel bir alanda eşitlenir.</p>
        <p className="muted">Koça soru sorduğunda, yanıt verebilmesi için son günlerinin özeti o soruyla birlikte gönderilir. Koç konuşmaları kaydedilmez.</p>
        <p className="muted">Verilerini bu ekrandan istediğin zaman dışa aktarabilir ya da tamamen silebilirsin.</p>
      </div>}
      {k === "about" && <div className="prose">
        <p>Ritim, aralıklı orucu bir kronometreden çok bir ritim olarak görmen için tasarlandı: oruç, yemek, su, uyku ve açlık kayıtlarını bir arada tutar ve zamanla sana kendi örüntülerini gösterir.</p>
        <p className="muted">Sürüm 2.0</p>
      </div>}
    </>
  );
}

const wipe = () => openSheet(<ConfirmSheet title="Tüm verilerin silinsin mi?" danger confirm="Verilerimi sil"
  body="Oruç, yemek, su, açlık, uyku ve kilo kayıtların ile profilin ve ayarların kalıcı olarak silinir. Bu işlem geri alınamaz. İstersen önce verilerini dışa aktarabilirsin."
  onConfirm={() => { const f = freshState(); f.meta.seenLanding = true; replaceState(f); setTab("today"); toast("Tüm verilerin silindi"); }} />);

async function doExport(fmt: "json" | "csv") {
  const r = await exportData(fmt);
  if (r === "saved") toast("Dosya kaydedildi");
  else if (r === "busy") toast("Bir indirme penceresi zaten açık.");
  else if (typeof r === "object") openSheet(<ExportFallbackSheet data={r.fallback} />);
}

export function ProfileScreen() {
  useStore();
  const p = S.meta.profile!, st = settings();
  const lastW = weightsSorted().pop();
  const flags = (p.healthFlags || []).filter(f => f !== "none");
  const n = st.notifications;
  const Row = ({ t, s, onClick, danger }: { t: string; s?: string; onClick: () => void; danger?: boolean }) => (
    <button className="li" onClick={onClick}><span className="t"><span style={danger ? { color: "var(--red)" } : undefined}>{t}</span>{s && <span className="s">{s}</span>}</span><Icon.chev /></button>
  );
  return (
    <>
      <h1 className="title">Profil</h1>
      <div className="two-col">
        <div>
          <section><div className="list">
            <Row t="Kişisel bilgiler" s={`${p.age} yaş, ${p.height} cm${p.sex ? ", " + p.sex : ""}`} onClick={() => openSheet(<EditProfileSheet />)} />
            <Row t="Kilo takibi" s={lastW ? `Son kayıt ${kgDisplay(lastW.kg)}, ${fmtDayShort(lastW.ts)}` : "Henüz kayıt yok"} onClick={() => openSheet(<WeightSheet />)} />
          </div></section>
          <section className="sec"><div className="sec-h"><h2>Oruç planı</h2></div><div className="list">
            <Row t="Plan" s={`${st.plan}, ${st.fastHours} saat oruç`} onClick={() => openSheet(<EditPlanSheet />)} />
            <Row t="Başlangıç → bitiş" s={`${st.startTime} → ${minToHM(toMin(st.startTime) + st.fastHours * 60)}`} onClick={() => openSheet(<EditPlanSheet />)} />
            <Row t="Su hedefi" s={`${fmtL(st.waterGoal)} L`} onClick={() => openSheet(<WaterGoalSheet />)} />
            <Row t="Bildirimler" s={n.enabled && permission() === "granted" ? `Açık, sessiz saatler ${n.quietStart}–${n.quietEnd}` : "Kapalı"} onClick={() => openSheet(<NotificationsSheet />)} />
          </div></section>
          <section className="sec"><div className="sec-h"><h2>Görünüm</h2></div><div className="surface stack">
            <div><p className="small muted" style={{ marginBottom: 8 }}>Tema</p>
              <Seg<Theme> label="Tema" options={[{ v: "system", t: "Sistem" }, { v: "light", t: "Açık" }, { v: "dark", t: "Koyu" }]} value={st.theme} onChange={v => { S.meta.settings.theme = v; commit("meta"); applyTheme(); }} /></div>
            <div><p className="small muted" style={{ marginBottom: 8 }}>Kilo birimi</p>
              <Seg<WeightUnit> label="Kilo birimi" options={[{ v: "kg", t: "kg" }, { v: "lb", t: "lb" }]} value={st.unit} onChange={v => { S.meta.settings.unit = v; commit("meta"); }} /></div>
            <div className="row" style={{ justifyContent: "space-between" }}><span>Dil</span><span className="muted">Türkçe</span></div>
          </div></section>
        </div>
        <div>
          <section className="sec"><div className="sec-h"><h2>Verilerin</h2></div><div className="list">
            <Row t="JSON olarak dışa aktar" onClick={() => doExport("json")} />
            <Row t="CSV olarak dışa aktar" onClick={() => doExport("csv")} />
            {S.meta.demo && <Row t="Örnek verileri temizle" onClick={openClearDemo} />}
            <Row t="Verilerimi sil" danger onClick={wipe} />
          </div><p className="tiny faint" style={{ marginTop: 8 }}>{syncName() ? "Verilerin hesabına özel olarak eşitleniyor ve bu cihazda da tutuluyor." : "Verilerin bu cihazda saklanıyor."}</p></section>
          <section className="sec"><div className="sec-h"><h2>Diğer</h2></div><div className="list">
            <Row t="Sağlık notu" s={flags.length ? `${flags.length} durum işaretli` : undefined} onClick={() => openSheet(<InfoSheet k="health" />)} />
            <Row t="Gizlilik" onClick={() => openSheet(<InfoSheet k="privacy" />)} />
            <Row t="Hakkında" onClick={() => openSheet(<InfoSheet k="about" />)} />
          </div></section>
        </div>
      </div>
    </>
  );
}
