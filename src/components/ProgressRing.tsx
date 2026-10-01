import { useEffect, useState, type ReactNode } from "react";
import { clamp } from "../utils/time";

const R = 118, C = 2 * Math.PI * R;

/** Saat işaretli ilerleme halkası: her işaret bir saati temsil eder. */
export function ProgressRing({ p, ticks, muted, children, label }: { p: number; ticks: number; muted?: boolean; children?: ReactNode; label?: string }) {
  const target = clamp(p || 0, 0, 1);
  const [shown, setShown] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(target))); return () => cancelAnimationFrame(id); }, [target]);
  const n = Math.max(1, Math.round(ticks));
  return (
    <div className="ring-wrap" role="img" aria-label={label}>
      <svg viewBox="0 0 300 300" aria-hidden="true">
        <circle className="ring-track" cx="150" cy="150" r={R} fill="none" strokeWidth={12} />
        <circle className={`ring-arc${muted ? " eat" : ""}`} cx="150" cy="150" r={R} fill="none" strokeWidth={12} strokeLinecap="round"
          strokeDasharray={C.toFixed(2)} strokeDashoffset={(C * (1 - shown)).toFixed(2)} />
        <g>
          {Array.from({ length: n }, (_, i) => {
            const a = (i / n) * 2 * Math.PI;
            return <line key={i} className={`tick${muted ? " eat" : ""}${shown > 0 && shown >= i / n ? " on" : ""}`}
              x1={150 + 136 * Math.cos(a)} y1={150 + 136 * Math.sin(a)} x2={150 + 144 * Math.cos(a)} y2={150 + 144 * Math.sin(a)}
              strokeWidth={3} strokeLinecap="round" />;
          })}
        </g>
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  );
}
