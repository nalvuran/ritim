import { fmtClock } from "../utils/time";

/** Sabit genişlikli rakamlarla, değişen rakamı yumuşakça yenileyen sayaç. */
export function FastingTimer({ ms, big }: { ms: number; big?: boolean }) {
  const s = fmtClock(ms);
  return (
    <div className={`timer${big ? " big" : ""}`} role="timer" aria-label={s}>
      {s.split("").map((c, i) => c === ":" ? <span key={i} className="c" aria-hidden="true">:</span>
        : <span key={`${i}-${c}`} className="d roll" aria-hidden="true">{c}</span>)}
    </div>
  );
}
