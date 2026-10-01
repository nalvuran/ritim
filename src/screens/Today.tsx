import { S } from "../services/store";
import { openSheet, setTab } from "../services/ui";
import { useNow, useStore } from "../hooks/useApp";
import { ProgressRing } from "../components/ProgressRing";
import { FastingTimer } from "../components/FastingTimer";
import { Button } from "../components/Button";
import { Icon } from "../components/Icons";
import { InsightCard } from "../components/InsightCard";
import { WaterSheet } from "../components/WaterTracker";
import { MealSheet } from "../components/MealLog";
import { SleepSheet } from "../components/SleepCard";
import { CravingSheet, HungerSheet } from "../components/HungerSlider";
import { ScoreSheet } from "../components/ScoreSheet";
import { WeeklyReport } from "../components/WeeklyReport";
import { openEndFast, openPlanToday, startFast } from "../components/FastingHistory";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { clearDemo } from "../services/demo";
import { openCoach } from "./Coach";
import { avgHunger, bestFastOn, fastDur, habitScore, liveState, mealsOn, settings, sleepOn, waterOn } from "../utils/domain";
import { insights } from "../utils/analytics";
import { HOUR, clamp, fmtDateLong, fmtDur, fmtL, fmtNum, greeting, hm, relDayLabel, sfx, todayKey } from "../utils/time";
import { toast } from "../services/ui";

export const openClearDemo = () => openSheet(<ConfirmSheet title="Örnek veriler temizlensin mi?" body="Uygulamanın gösterdiği örnek kayıtlar silinir. Senin eklediğin kayıtlar ve ayarların olduğu gibi kalır."
  confirm="Örnek verileri temizle" onConfirm={() => { clearDemo(); toast("Örnek veriler temizlendi"); }} />);

function Hero() {
  useNow(1000);
  const st = liveState();
  if (st.mode === "empty") return (
    <section className="hero" aria-label="Oruç durumu">
      <ProgressRing p={0} ticks={settings().fastHours} muted label="Henüz oruç yok">
        <span className="ring-label">Henüz oruç yok</span>
        <FastingTimer ms={0} />
        <span className="ring-status eat">Hazır olduğunda başla</span>
      </ProgressRing>
      <p className="hero-sub">Planın: <b>{settings().plan}</b>, {settings().startTime}{sfx(settings().startTime)} başlıyor</p>
      <div className="hero-actions"><Button onClick={() => startFast()}>İlk orucunu başlat</Button></div>
    </section>
  );
  if (st.mode === "eat") {
    const before = Date.now() < st.nextStart!;
    const t = hm(st.nextStart!);
    return (
      <section className="hero" aria-label="Oruç durumu">
        <ProgressRing p={st.p} ticks={st.goal / HOUR} muted label={`Yemek penceresi, ${fmtDur(st.el)}`}>
          <span className="ring-label">Yemek penceresi</span>
          <FastingTimer ms={st.el} />
          <span className="ring-status eat">Yemek penceren açık</span>
        </ProgressRing>
        <p className="hero-sub">{before ? <>Planına göre oruç <b>{t}</b>{sfx(t)} başlıyor</> : <>Oruç başlama saatin <b>{t}</b> idi</>}</p>
        <div className="hero-actions">
          <Button onClick={() => startFast()}>Yeni orucu başlat</Button>
          <button className="link" onClick={openPlanToday}>Bugün planımı değiştir</button>
        </div>
      </section>
    );
  }
  const done = st.mode === "fast-done";
  const t = hm(st.end!);
  return (
    <section className="hero" aria-label="Oruç durumu">
      <ProgressRing p={st.p} ticks={st.f!.goalH} label={`Oruç, ${fmtDur(st.el)}, hedefin yüzde ${Math.min(100, Math.floor(st.p * 100))}'i`}>
        <span className="ring-label">Oruç</span>
        <FastingTimer ms={st.el} />
        <span className="ring-status">{done ? "Oruç hedefin tamamlandı" : "Oruç devam ediyor"}</span>
      </ProgressRing>
      <p className="hero-sub">{done ? <>{st.f!.goalH} saatlik hedefin <b>{t}</b>{sfx(t)} tamamlandı</> : <><b>{relDayLabel(st.end!)}{t}</b>{sfx(t)} bitecek</>}</p>
      <div className="hero-actions">
        {done ? <Button onClick={openEndFast}>Orucu bitir</Button> : <Button variant="soft" onClick={openEndFast}>Orucu boz</Button>}
        <button className="link" onClick={openPlanToday}>Bugün planımı değiştir</button>
      </div>
    </section>
  );
}

function FastTile() {
  useNow(15000);
  const st = liveState(), best = bestFastOn(todayKey());
  return <span className="v">{st.f ? fmtDur(st.el) : best ? fmtDur(fastDur(best)) : "—"}</span>;
}

export function TodayScreen() {
  useStore();
  const k = todayKey();
  const meals = mealsOn(k), water = waterOn(k), sleep = sleepOn(k), ha = avgHunger(k);
  const sc = habitScore(k);
  const fasting = !!liveState().f;
  const ins = insights();
  const pick = ins.length ? ins[new Date().getDate() % ins.length] : null;
  const dow = new Date().getDay();
  return (
    <>
      <header className="top">
        <div><p className="date">{fmtDateLong(new Date())}</p><h1>{greeting()}</h1></div>
        <button className="icon-btn" onClick={openCoach} aria-label="Koç ile konuş"><Icon.coach /></button>
      </header>
      {S.meta.demo && <div className="banner" role="note"><span>Örnek verilerle gösteriliyor</span><span className="spacer" /><button onClick={openClearDemo}>Temizle</button></div>}
      <div className="today-grid">
        <div>
          <Hero />
          <div className="qa" role="group" aria-label="Hızlı kayıt">
            <button onClick={() => openSheet(fasting ? <CravingSheet /> : <HungerSheet />)}><Icon.hunger />Acıktım</button>
            <button onClick={() => openSheet(<WaterSheet />)}><Icon.water />Su</button>
            <button onClick={() => openSheet(<MealSheet />)}><Icon.meal />Öğün</button>
            <button onClick={() => openSheet(<SleepSheet />)}><Icon.sleep />Uyku</button>
          </div>
        </div>
        <div>
          <section className="sec" aria-labelledby="sum-h">
            <div className="sec-h"><h2 id="sum-h">Bugün özeti</h2></div>
            <div className="tiles">
              <button className="tile" onClick={() => setTab("fast")}><span className="k">Oruç</span><FastTile /></button>
              <button className="tile" onClick={() => openSheet(<MealSheet />)}><span className="k">Yemek</span><span className="v">{meals.length}<small>öğün</small></span></button>
              <button className="tile wide" onClick={() => openSheet(<WaterSheet />)}>
                <span className="k">Su</span><span className="v">{fmtL(water)}<small>/ {fmtL(settings().waterGoal)} L</small></span>
                <span className="bar blue" aria-hidden="true"><i style={{ width: `${clamp((water / settings().waterGoal) * 100, 0, 100)}%` }} /></span>
              </button>
              <button className="tile" onClick={() => openSheet(<HungerSheet />)}><span className="k">Açlık</span><span className="v">{ha == null ? "—" : <>{fmtNum(ha, 0)}<small>/10</small></>}</span></button>
              <button className="tile" onClick={() => openSheet(<SleepSheet />)}><span className="k">Uyku</span><span className="v">{sleep ? fmtDur(sleep.wake - sleep.bed) : "—"}</span></button>
            </div>
          </section>
          <section className="sec">
            <button className="surface score" onClick={() => openSheet(<ScoreSheet />)}>
              <div className="num">{sc.total}<small> / 100</small></div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>Alışkanlık skoru</div><div className="small muted">Kendi hedeflerine bugünkü uyumun</div><div className="bar"><i style={{ width: `${sc.total}%` }} /></div></div>
              <Icon.chev />
            </button>
          </section>
          {(dow === 0 || dow === 1) && (
            <section className="sec">
              <button className="surface row wide-btn" onClick={() => openSheet(<WeeklyReport />)}>
                <span style={{ flex: 1 }}><span style={{ display: "block", fontWeight: 600 }}>Haftan nasıl geçti?</span><span className="small muted">Haftalık raporun hazır</span></span><Icon.chev />
              </button>
            </section>
          )}
          {pick && <section className="sec"><InsightCard insight={pick} /></section>}
        </div>
      </div>
    </>
  );
}
