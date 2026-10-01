import { useState } from "react";
import { S, commit } from "../services/store";
import { closeSheet, haptic, openSheet, toast } from "../services/ui";
import { HUNGER_REASONS } from "../data/constants";
import { hardestWindow } from "../utils/domain";
import { hm, relDayLabel, uid } from "../utils/time";
import { useStore } from "../hooks/useApp";
import { Button } from "./Button";
import { Chips, Field, Group } from "./Forms";
import { Icon } from "./Icons";
import { SheetHeader } from "./Modal";

const desc = (v: number) => (v <= 3 ? "Hafif" : v <= 6 ? "Orta" : "Güçlü");

/** 1–10 açlık seviyesi kaydırıcısı */
export function HungerSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="field" style={{ marginTop: 0 }}>
      <span id="hl-lab">Açlık seviyen</span>
      <div className="slider-val"><span className="big-num">{value}</span><span className="muted">{desc(value)}</span></div>
      <input className="range" type="range" min={1} max={10} step={1} value={value} aria-labelledby="hl-lab"
        aria-valuetext={`${value}, ${desc(value).toLowerCase()}`} onChange={e => onChange(+e.target.value)} />
    </div>
  );
}

/** Açlık günlüğü: seviye + neden. Uygulamanın farklılaştırıcı özelliği. */
export function HungerSheet({ awareness }: { awareness?: string | null }) {
  useStore();
  const [level, setLevel] = useState(5);
  const [reason, setReason] = useState<string | null>(HUNGER_REASONS[0]);
  const [note, setNote] = useState("");
  const recent = S.hunger.slice().sort((a, b) => b.ts - a.ts).slice(0, 5);
  const hw = hardestWindow();
  const save = () => {
    S.hunger.push({ id: uid(), ts: Date.now(), level, reason: reason || "Diğer", note: note.trim().slice(0, 140), awareness: awareness || null });
    commit("hunger"); haptic(); closeSheet(); toast("Açlık kaydedildi");
  };
  return (
    <>
      <SheetHeader title="Açlık günlüğü" />
      <HungerSlider value={level} onChange={setLevel} />
      <Group label="Neden?"><Chips options={HUNGER_REASONS.map(r => ({ v: r, t: r }))} value={reason} onChange={setReason} /></Group>
      <Field label="Not (isteğe bağlı)"><input className="input" maxLength={140} placeholder="Ne oldu, nasıl hissettin?" value={note} onChange={e => setNote(e.target.value)} /></Field>
      <div className="actions"><Button onClick={save}>Kaydet</Button></div>
      {hw && <p className="note" style={{ marginTop: 20 }}>Son 30 günde en sık {hw} arasında yemek isteği yaşadın.</p>}
      {recent.length > 0 && (
        <section className="sec"><div className="sec-h"><h2>Son kayıtlar</h2></div>
          <div className="list">{recent.map(h => (
            <div className="li" key={h.id}>
              <span className="t"><span>{h.reason}</span><span className="s">{relDayLabel(h.ts)}{hm(h.ts)}{h.note ? ", " + h.note : ""}</span></span>
              <span className="v">{h.level}/10</span>
              <button className="del" aria-label="Kaydı sil" onClick={() => { S.hunger = S.hunger.filter(x => x.id !== h.id); commit("hunger"); toast("Kayıt silindi", { label: "Geri al", fn: () => { S.hunger.push(h); commit("hunger"); } }); }}><Icon.trash /></button>
            </div>))}
          </div>
        </section>
      )}
    </>
  );
}

/** "Açlık mı, istek mi?" farkındalık egzersizi (teşhis değil). */
export function CravingSheet() {
  const [ans, setAns] = useState<null | "evet" | "hayir">(null);
  if (!ans) return (
    <>
      <SheetHeader title="Açlık mı, istek mi?" />
      <p className="lead" style={{ fontSize: 20, color: "var(--ink)", fontWeight: 500 }}>Şu anda önünde sade bir sebze yemeği olsa yer miydin?</p>
      <div className="input-row" style={{ marginTop: 20 }}>
        <Button variant="soft" onClick={() => setAns("evet")}>Evet</Button>
        <Button variant="soft" onClick={() => setAns("hayir")}>Hayır</Button>
      </div>
      <p className="tiny faint" style={{ marginTop: 16 }}>Bu sadece bir farkındalık egzersizidir; açlık konusunda tıbbi değerlendirme değildir.</p>
      <button className="link" style={{ marginTop: 6 }} onClick={() => openSheet(<HungerSheet />)}>Doğrudan açlık kaydına geç</button>
    </>
  );
  const yes = ans === "evet";
  return (
    <>
      <SheetHeader title="Açlık mı, istek mi?" />
      <p className="lead" style={{ color: "var(--ink)" }}>{yes ? "Bu, gerçek bir açlık sinyali olabilir." : "Bu daha çok bir yeme isteği olabilir."}</p>
      <p className="muted" style={{ marginTop: 8 }}>{yes
        ? "Planını bugün esnetmek tamamen sorun değil. Kendini halsiz ya da başı dönen hissediyorsan yemek yemek en doğru seçim."
        : "İstekler çoğu zaman dalga gibi gelip geçer. Birkaç dakika bekleyip su içmek ya da kısa bir yürüyüş yapmak isteyebilirsin. Yine de yemek istersen bu da senin kararın."}</p>
      <div className="actions"><Button onClick={() => openSheet(<HungerSheet awareness={ans} />)}>Açlığını kaydet</Button><Button variant="ghost" onClick={closeSheet}>Kapat</Button></div>
    </>
  );
}
