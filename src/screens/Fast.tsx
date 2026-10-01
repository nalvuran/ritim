import { useNow, useStore } from "../hooks/useApp";
import { openSheet } from "../services/ui";
import { PHASES } from "../data/constants";
import { Button } from "../components/Button";
import { FastingTimer } from "../components/FastingTimer";
import { CravingSheet } from "../components/HungerSlider";
import { EditStartSheet, FastEditSheet, FastingHistory, openEndFast, openPlanToday, startFast } from "../components/FastingHistory";
import { fastDur, liveState, planFor } from "../utils/domain";
import { HOUR, atLoc, atTime, fmtDur, hm, relDayLabel, todayKey } from "../utils/time";

function Live() {
  useNow(1000);
  const st = liveState();
  const f = st.f!;
  const max = Math.max(20, Math.ceil(f.goalH + 2));
  const marks = [0, 4, 8, 12, 16, 20, 24].filter(m => m <= max);
  const x = Math.min(1, st.el / (max * HOUR)) * 100;
  const phase = PHASES.filter(p => st.el / HOUR >= p.from).pop()!;
  const done = st.mode === "fast-done";
  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <span className="ring-label">{done ? "Hedef tamamlandı" : "Oruç devam ediyor"}</span>
        <FastingTimer ms={st.el} big />
      </section>
      <div className="facts">
        <div><div className="k">Başlangıç</div><div className="v">{relDayLabel(f.start)}{hm(f.start)} <button onClick={() => openSheet(<EditStartSheet />)} aria-label="Başlangıç saatini düzenle">Düzenle</button></div></div>
        <div><div className="k">Planlanan bitiş</div><div className="v">{relDayLabel(st.end!)}{hm(st.end!)}</div></div>
        <div><div className="k">Hedef</div><div className="v">{f.goalH} saat</div></div>
        <div><div className="k">İlerleme</div><div className="v">%{Math.floor(st.p * 100)}</div></div>
      </div>
      <section className="sec" aria-label="Oruç zaman çizelgesi">
        <div className="tl">
          <div className="tl-line">
            <div className="tl-fill" style={{ width: `${x}%` }} />
            <div className="tl-goal" style={{ left: `${(f.goalH / max) * 100}%` }} title="Hedef" />
            <div className="tl-dot" style={{ left: `${x}%` }} />
          </div>
          <div className="tl-marks">{marks.map(m => <span key={m} style={{ left: `${(m / max) * 100}%` }}>{m}s</span>)}</div>
        </div>
        <div className="phase"><div className="h">{phase.h}</div><p>{phase.p}</p></div>
        <p className="tiny faint" style={{ marginTop: 10 }}>Bu açıklamalar geneldir; vücudun tepkisi kişiden kişiye değişir ve tıbbi bilgi yerine geçmez.</p>
      </section>
      <section className="sec stack">
        {done ? <Button block onClick={openEndFast}>Orucu bitir</Button> : <Button block variant="soft" onClick={openEndFast}>Orucu boz</Button>}
        <Button block variant="ghost" onClick={() => openSheet(<CravingSheet />)}>Bir şey yemek istiyorum</Button>
        <Button block variant="ghost" onClick={openPlanToday}>Bugün planımı değiştir</Button>
      </section>
    </>
  );
}

export function FastScreen() {
  useStore();
  const st = liveState();
  const plan = planFor();
  const startTs = atTime(todayKey(), plan.startTime);
  return (
    <>
      <h1 className="title">Oruç</h1>
      {st.f ? <Live /> : (
        <section className="surface stack">
          <p style={{ fontSize: 20, fontWeight: 600 }}>{st.mode === "empty" ? "Henüz oruç yok" : "Şu an oruçta değilsin"}</p>
          <p className="muted">{st.lf ? `Son orucun ${fmtDur(fastDur(st.lf))} sürdü ve ${relDayLabel(st.lf.end!).toLowerCase()}${atLoc(hm(st.lf.end!))} bitti.` : "İlk orucunu başlattığında süre burada görünecek."}</p>
          <div className="facts" style={{ marginTop: 16 }}>
            <div><div className="k">Bugünkü plan</div><div className="v">{plan.startTime} → {hm(startTs + plan.hours * HOUR)}</div></div>
            <div><div className="k">Hedef</div><div className="v">{plan.hours} saat</div></div>
          </div>
          <Button block style={{ marginTop: 18 }} onClick={() => startFast()}>{st.mode === "empty" ? "İlk orucunu başlat" : "Yeni orucu başlat"}</Button>
          <Button block variant="ghost" onClick={openPlanToday}>Bugün planımı değiştir</Button>
        </section>
      )}
      <section className="sec">
        <div className="sec-h"><h2>Son oruçlar</h2><button className="link" onClick={() => openSheet(<FastEditSheet />)}>Kayıt ekle</button></div>
        <FastingHistory />
      </section>
    </>
  );
}
