import { habitScore } from "../utils/domain";
import { SheetHeader } from "./Modal";

export function ScoreSheet() {
  const sc = habitScore();
  return (
    <>
      <SheetHeader title="Alışkanlık skoru" />
      <p className="big-num">{sc.total}<small> / 100</small></p>
      <p className="muted" style={{ marginTop: 6 }}>Bu puan sağlık değerlendirmesi değildir; yalnızca uygulamada belirlediğin hedeflere bugünkü uyumunu gösterir.</p>
      <div className="list" style={{ marginTop: 18 }}>
        {sc.parts.map(p => (
          <div className="li" key={p.k} style={{ flexWrap: "wrap" }}>
            <span className="t"><span>{p.k}</span><span className="s">{p.d}</span></span>
            <span className="v" style={{ color: "var(--ink)", fontWeight: 600 }}>{p.v}<span className="faint" style={{ fontWeight: 400 }}> / {p.max}</span></span>
            <span className="bar" style={{ width: "100%", marginTop: 4 }}><i style={{ width: `${(p.v / p.max) * 100}%` }} /></span>
          </div>
        ))}
      </div>
    </>
  );
}
