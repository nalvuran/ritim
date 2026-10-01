import { useEffect, useRef, useState } from "react";
import { S } from "../services/store";
import { CRISIS_RX, SAFETY_RX, askCoach, coachAvailable, type Turn } from "../services/coach";
import { SheetHeader } from "../components/Modal";
import { Icon } from "../components/Icons";
import { openSheet } from "../services/ui";

interface Msg extends Turn { safety?: string; thinking?: boolean }
const SUGGEST = ["Bugün neden çok acıktım?", "16 saate nasıl alışabilirim?", "Dün kısa tuttum, bugün ne yapmalıyım?", "Son bir haftam nasıl geçti?"];
const ERR: Record<string, string> = {
  not_granted: "Koçu kullanmak için izin verilmedi.", sampling_disabled: "Koç bu hesapta kullanılamıyor.",
  rate_limited: "Şu an çok fazla istek var. Biraz sonra yeniden dene.", session_expired: "Oturumun sona ermiş. Yeniden giriş yaptıktan sonra dene.",
  refused: "Bu soruya yanıt veremiyorum. Farklı bir şekilde sormayı deneyebilirsin.", prompt_too_large: "Konuşma çok uzadı. Koçu kapatıp yeniden açarak baştan başlayabilirsin.",
  network: "Bağlantı kurulamadı. İnternet bağlantını kontrol et.", unavailable: "Koç şu an kullanılamıyor.",
};
const HARD_FAIL = ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed", "unavailable"];

// Konuşma, uygulama açık kaldığı sürece bellekte tutulur; kaydedilmez.
const memory: { msgs: Msg[] } = { msgs: [] };

export const openCoach = () => openSheet(<CoachScreen />, { full: true });

export function CoachScreen() {
  const [msgs, setMsgs] = useState<Msg[]>(memory.msgs);
  const [busy, setBusy] = useState(false);
  const [avail, setAvail] = useState<boolean | null>(null);
  const [text, setText] = useState("");
  const ctl = useRef<AbortController | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { coachAvailable().then(setAvail); return () => ctl.current?.abort(); }, []);
  useEffect(() => { memory.msgs = msgs.filter(m => !m.thinking); const b = box.current; if (b) b.scrollTop = b.scrollHeight; }, [msgs]);

  const send = async (q: string) => {
    q = q.trim();
    if (!q || busy) return;
    setText("");
    const history: Msg[] = [...msgs.filter(m => !m.thinking), { role: "user", content: q }];
    setMsgs([...history, { role: "assistant", content: "Düşünüyor…", thinking: true }]);
    setBusy(true);
    ctl.current = new AbortController();
    const update = (t: string, extra: Partial<Msg> = {}) => setMsgs([...history, { role: "assistant", content: t, ...extra }]);
    try {
      const answer = await askCoach(history.map(m => ({ role: m.role, content: m.content })), t => update(t), ctl.current.signal);
      const safety = CRISIS_RX.test(q) ? "Zor bir dönemden geçiyorsan yalnız değilsin. Acil bir durumda 112'yi arayabilir, güvendiğin biriyle ya da bir uzmanla konuşabilirsin."
        : SAFETY_RX.test(q) ? "Bu konuda kişisel bir plan için doktoruna ya da bir sağlık profesyoneline danışman önemli." : undefined;
      update(answer, { safety });
    } catch (e: any) {
      const code = e?.code || "upstream_error";
      const partial = code === "refused" ? "" : e?.text || "";
      if (code === "cancelled") { partial ? update(partial) : setMsgs(history.slice(0, -1)); }
      else {
        const m = ERR[code] || "Yanıt alınamadı. Birazdan tekrar dene.";
        setMsgs([...history, { role: "assistant", content: partial ? `${partial}\n\n${m}` : m, thinking: !partial }]);
        if (HARD_FAIL.includes(code)) setAvail(false);
      }
    } finally { setBusy(false); }
  };

  const disabled = avail === false;
  return (
    <>
      <SheetHeader title="Koç" />
      <p className="tiny faint" style={{ margin: "-8px 0 12px" }}>Koç, verilerine bakarak genel öneriler sunar; tıbbi tavsiye vermez.</p>
      <div className="msgs" ref={box} aria-live="polite">
        {!msgs.length && <div className="msg a">{avail === false
          ? "Koç bu kurulumda kullanılamıyor. Uygulamayı Claude içinde açtığında ya da koç sunucusu ayarlandığında kullanabilirsin."
          : S.meta.demo ? "Merhaba. Kayıtlarına bakarak sorularını yanıtlayabilirim. Şu an örnek verilerle çalışıyorum; kendi kayıtların biriktikçe yanıtlarım da kişiselleşir."
            : "Merhaba. Oruç, açlık, su ve uyku kayıtlarına bakarak sorularını yanıtlayabilirim. Ne merak ediyorsun?"}</div>}
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role === "user" ? "u" : "a"}${m.thinking ? " thinking" : ""}`}>
            {m.content}{m.safety && <span className="safety">{m.safety}</span>}
          </div>
        ))}
      </div>
      {!msgs.length && !disabled && <div className="chips" style={{ marginBottom: 12 }}>{SUGGEST.map(q => <button key={q} type="button" className="chip" onClick={() => send(q)}>{q}</button>)}</div>}
      <div className="composer">
        <label className="sr" htmlFor="coach-in">Koça sor</label>
        <textarea id="coach-in" className="input" rows={1} maxLength={600} disabled={disabled} value={text}
          placeholder={disabled ? "Koç bu kurulumda kullanılamıyor" : "Bir şey sor…"}
          onChange={e => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(120, e.target.scrollHeight) + "px"; }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }} />
        <button className={`icon-btn${busy ? " stop" : ""}`} disabled={disabled} aria-label={busy ? "Durdur" : "Gönder"}
          onClick={() => (busy ? ctl.current?.abort() : send(text))}>{busy ? <Icon.stop /> : <Icon.send />}</button>
      </div>
    </>
  );
}
