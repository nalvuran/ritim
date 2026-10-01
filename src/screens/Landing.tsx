import { S, commit } from "../services/store";
import { Button } from "../components/Button";
import { ProgressRing } from "../components/ProgressRing";

const FEATURES = [
  { t: "Akıllı oruç takibi", d: "Ne zamandır oruçta olduğunu ve ne zaman biteceğini tek bakışta gör. Planını istediğin gün esnet." },
  { t: "Kişisel içgörüler", d: "Kayıtların biriktikçe, en çok zorlandığın saatleri ve seni destekleyen alışkanlıkları gör." },
  { t: "Su ve uyku takibi", d: "Su, uyku ve son öğün saatini oruçla birlikte değerlendir." },
  { t: "Haftalık rapor", d: "Her hafta kısa bir özet ve emir değil, küçük bir öneri." },
  { t: "AI koç", d: "Kendi verilerine dayanan sorularına sakin ve temkinli yanıtlar." },
];

/** Uygulamadan bağımsız, sade tanıtım sayfası */
export function Landing() {
  const start = () => { S.meta.seenLanding = true; commit("meta"); };
  return (
    <main className="landing screen">
      <header className="landing-top"><span className="brand">Ritim</span><button className="link" onClick={start}>Uygulamaya geç</button></header>
      <section className="landing-hero">
        <div className="landing-copy">
          <h1>Orucunu değil, ritmini takip et.</h1>
          <p className="lead">Aralıklı oruç alışkanlıklarını takip et, verilerini keşfet ve kendine uygun bir ritim oluştur.</p>
          <Button onClick={start} className="landing-cta">Oruç Takibine Başla</Button>
          <p className="tiny faint" style={{ marginTop: 12 }}>Ücretsiz. Hesap gerekmez. Verilerin sende kalır.</p>
        </div>
        <div className="landing-art" aria-hidden="true">
          <ProgressRing p={0.72} ticks={16}>
            <span className="ring-label">Oruç</span>
            <div className="timer"><span className="d">1</span><span className="d">1</span><span className="c">:</span><span className="d">3</span><span className="d">2</span></div>
            <span className="ring-status">12:00'de bitecek</span>
          </ProgressRing>
        </div>
      </section>
      <section className="landing-features" aria-label="Özellikler">
        {FEATURES.map(f => <div key={f.t} className="feature"><h2>{f.t}</h2><p>{f.d}</p></div>)}
      </section>
      <footer className="landing-foot">
        <p className="small muted">Ritim bir alışkanlık takip aracıdır; tıbbi teşhis ya da tedavi aracı değildir. Gebelik, diyabet, yeme bozukluğu geçmişi gibi durumlarda başlamadan önce bir sağlık profesyoneliyle konuş.</p>
        <Button variant="dark" onClick={start} style={{ marginTop: 20 }}>Oruç Takibine Başla</Button>
      </footer>
    </main>
  );
}
