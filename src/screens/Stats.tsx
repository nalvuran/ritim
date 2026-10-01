import { useState } from "react";
import { S } from "../services/store";
import { openSheet } from "../services/ui";
import { useStore } from "../hooks/useApp";
import { BarChart } from "../components/Chart";
import { Empty } from "../components/Card";
import { Icon } from "../components/Icons";
import { InsightCard } from "../components/InsightCard";
import { AchievementCard } from "../components/AchievementCard";
import { WeeklyReport } from "../components/WeeklyReport";
import { WeightChart, WeightSheet } from "../components/WeightChart";
import { Seg } from "../components/Forms";
import { openCoach } from "./Coach";
import { badges, behavior, computeStats, insights, streak, trackedDays } from "../utils/analytics";
import { avg as avgN, HOUR, dayKey, fmtDayShort, fmtDur, fmtL, fmtNum, keyToDate, pad, rangeDays } from "../utils/time";
import { bestFastOn, eatingWindow, fastDur, fromKg, isSuccess, settings, unitLabel, waterOn, weightsSorted } from "../utils/domain";

type ChartId = "fast" | "window" | "water" | "weight" | "hunger";
const CHARTS: { v: ChartId; t: string }[] = [
  { v: "fast", t: "Oruç" }, { v: "window", t: "Yemek penceresi" }, { v: "water", t: "Su" }, { v: "weight", t: "Kilo" }, { v: "hunger", t: "Açlık" },
];

function ChartBlock({ n, c }: { n: number; c: ChartId }) {
  const days = rangeDays(n);
  const lab = (k: string) => fmtDayShort(keyToDate(k));
  const empty = (m: React.ReactNode) => <div className="center muted" style={{ padding: "36px 8px" }}>{m}</div>;
  if (c === "fast") {
    const items = days.map(k => { const f = bestFastOn(k); return { label: lab(k), v: f ? fastDur(f) / HOUR : 0, dim: !!f && !isSuccess(f), title: f ? `${lab(k)}: ${fmtDur(fastDur(f))}` : "" }; });
    if (!items.some(i => i.v)) return empty("Bu aralıkta tamamlanmış oruç yok.");
    return <><BarChart items={items} goal={settings().fastHours} label="Günlük oruç süresi (saat)" fmt={v => fmtNum(v, 0) + "s"} /><p className="tiny faint" style={{ marginTop: 6 }}>Kesikli çizgi hedefin. Soluk çubuklar hedefin altında kalan günler.</p></>;
  }
  if (c === "window") {
    const items = days.map(k => { const w = eatingWindow(k); return { label: lab(k), v: w ? w / HOUR : 0, title: w ? `${lab(k)}: ${fmtDur(w)}` : "" }; });
    if (!items.some(i => i.v)) return empty("Yemek penceresi için bir günde en az iki öğün kaydı gerekiyor.");
    return <><BarChart items={items} goal={24 - settings().fastHours} color="var(--ink-2)" label="Günlük yemek penceresi (saat)" fmt={v => fmtNum(v, 0) + "s"} /><p className="tiny faint" style={{ marginTop: 6 }}>Kesikli çizgi planındaki pencere süresi.</p></>;
  }
  if (c === "water") {
    const items = days.map(k => { const w = waterOn(k); return { label: lab(k), v: w / 1000, title: w ? `${lab(k)}: ${fmtL(w)} L` : "" }; });
    if (!items.some(i => i.v)) return empty("Bu aralıkta su kaydı yok.");
    return <BarChart items={items} goal={settings().waterGoal / 1000} color="var(--blue)" label="Günlük su (litre)" fmt={v => fmtNum(v, 1) + "L"} />;
  }
  if (c === "weight") {
    const from = keyToDate(days[0]).getTime();
    const pts = weightsSorted().filter(w => w.ts >= from);
    if (pts.length < 2) return empty(<>Grafik için bu aralıkta en az iki kilo kaydı gerekiyor.<br /><button className="link" onClick={() => openSheet(<WeightSheet />)}>Kilo kaydı ekle</button></>);
    const diff = fromKg(pts[pts.length - 1].kg) - fromKg(pts[0].kg);
    return <><WeightChart from={from} /><p className="small muted" style={{ marginTop: 8 }}>Bu aralıkta {Math.abs(diff) < 0.05 ? "değişim yok" : `${fmtNum(Math.abs(diff), 1)} ${unitLabel()} ${diff < 0 ? "azalma" : "artış"}`}. <button className="link inline" onClick={() => openSheet(<WeightSheet />)}>Kayıt ekle</button></p></>;
  }
  const set = new Set(days);
  const logs = S.hunger.filter(h => set.has(dayKey(h.ts)));
  if (!logs.length) return empty("Bu aralıkta açlık kaydı yok. Acıktığında “Acıktım”a dokun.");
  const counts = Array.from({ length: 24 }, (_, h) => ({ label: `${pad(h)}:00`, v: logs.filter(l => new Date(l.ts).getHours() === h).length }));
  return <><BarChart items={counts} color="var(--orange)" label="Saatlere göre yemek isteği" /><p className="small muted" style={{ marginTop: 8 }}>Ortalama seviye {fmtNum(avgN(logs.map(l => l.level))!, 1)}/10.</p></>;
}

export function StatsScreen() {
  useStore();
  const [n, setN] = useState(30);
  const [c, setC] = useState<ChartId>("fast");
  const s = computeStats(rangeDays(n));
  const b = behavior(30);
  const ins = insights();
  const sk = streak();
  const bs = badges();
  const enough = trackedDays(30) >= 7;
  return (
    <>
      <h1 className="title">İstatistik</h1>
      <section className="surface streak">
        <div><p className="big-num">{sk.current}<small> gün</small></p><p className="muted small">{sk.current ? "üst üste hedefini tamamladın" : sk.best ? `Yeni bir seri bugün başlayabilir. En uzun serin ${sk.best} gün.` : "Hedefini tamamladığın ilk gün serin başlar."}</p></div>
        <div className="streak-r"><p className="big-num sm">{sk.rate30 == null ? "—" : `%${Math.round(sk.rate30 * 100)}`}</p><p className="muted small">son 30 günde hedef uyumu</p></div>
      </section>

      <div className="sec"><Seg label="Zaman aralığı" options={[7, 30, 90].map(r => ({ v: r, t: `${r} gün` }))} value={n} onChange={setN} /></div>
      <div className="two-col">
        <section className="sec">
          {s.count || s.avgWater || s.avgSleep ? (
            <div className="metrics">
              <div><div className="k">Ortalama oruç</div><div className="v">{fmtDur(s.avgFast)}</div></div>
              <div><div className="k">Başarı oranı</div><div className="v">{s.rate == null ? "—" : `%${Math.round(s.rate * 100)}`}</div></div>
              <div><div className="k">En uzun oruç</div><div className="v">{fmtDur(s.maxFast)}</div></div>
              <div><div className="k">En kısa oruç</div><div className="v">{fmtDur(s.minFast)}</div></div>
              <div><div className="k">Toplam oruç</div><div className="v">{s.count}</div></div>
              <div><div className="k">Ort. yemek penceresi</div><div className="v">{fmtDur(s.avgWin)}</div></div>
              <div><div className="k">Ortalama su</div><div className="v">{s.avgWater ? `${fmtL(s.avgWater)} L` : "—"}</div></div>
              <div><div className="k">Ortalama uyku</div><div className="v">{fmtDur(s.avgSleep)}</div></div>
            </div>
          ) : <Empty title="Henüz yeterli veri yok" text="Birkaç gün kayıt tuttuğunda ortalamaların burada görünecek." />}
        </section>
        <section className="sec">
          <div className="sec-h"><h2>Grafik</h2></div>
          <div className="quick" role="group" aria-label="Grafik seç">{CHARTS.map(x => <button key={x.v} className="chip" aria-pressed={c === x.v} onClick={() => setC(x.v)}>{x.t}</button>)}</div>
          <div className="surface"><ChartBlock n={n} c={c} /></div>
        </section>
      </div>

      <div className="two-col">
        <section className="sec">
          <div className="sec-h"><h2>Davranış analizi</h2><span className="small muted">Son 30 gün</span></div>
          {b.enough ? (
            <div className="list">
              {b.comfy && <div className="li"><span className="t"><span>En rahat oruç tuttuğun dönem</span></span><span className="v strong">{b.comfy}</span></div>}
              {b.hardestHour && <div className="li"><span className="t"><span>En sık zorlandığın saat</span></span><span className="v strong">{b.hardestHour}</span></div>}
              <div className="li"><span className="t"><span>Ortalama oruç</span></span><span className="v strong">{fmtDur(b.avgFast)}</span></div>
              <div className="li"><span className="t"><span>Hedefine uyum</span></span><span className="v strong">{b.rate == null ? "—" : `%${Math.round(b.rate * 100)}`}</span></div>
              {b.topReason && <div className="li"><span className="t"><span>En sık açlık nedeni</span></span><span className="v strong">{b.topReason}</span></div>}
            </div>
          ) : <Empty title="Henüz yeterli veri yok" text="En az 5 oruç kaydettiğinde alışkanlık örüntülerin burada görünecek." />}
        </section>
        <section className="sec">
          <div className="sec-h"><h2>Kişisel içgörüler</h2></div>
          {ins.length ? <div className="stack">{ins.map(i => <InsightCard key={i.id} insight={i} />)}</div>
            : <Empty title={enough ? "Şimdilik belirgin bir örüntü yok" : "Henüz yeterli veri yok"} text={enough ? "Kayıt tutmaya devam ettikçe burada sana özel gözlemler belirecek." : "7 gün sonra burada kişisel içgörülerini görmeye başlayacaksın."} />}
        </section>
      </div>

      <section className="sec">
        <button className="surface row wide-btn" onClick={() => openSheet(<WeeklyReport />)}>
          <span style={{ flex: 1 }}><span style={{ display: "block", fontWeight: 600 }}>Haftan nasıl geçti?</span><span className="small muted">Haftalık rapor ve küçük bir hedef önerisi</span></span><Icon.chev />
        </button>
      </section>

      <section className="sec" aria-labelledby="badges-h">
        <div className="sec-h"><h2 id="badges-h">Rozetler</h2><span className="small muted">{bs.filter(x => x.progress >= x.target).length}/{bs.length}</span></div>
        <div className="badges">{bs.map(x => <AchievementCard key={x.id} b={x} unlockedAt={S.meta.achievements[x.id]} />)}</div>
      </section>

      <section className="sec">
        <button className="surface row wide-btn" onClick={openCoach}>
          <span className="icon-btn accent"><Icon.coach /></span>
          <span style={{ flex: 1 }}><span style={{ display: "block", fontWeight: 600 }}>Koça sor</span><span className="small muted">Verilerini birlikte yorumlayalım</span></span><Icon.chev />
        </button>
      </section>
    </>
  );
}
