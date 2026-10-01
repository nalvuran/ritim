import { fmtDayShort, fmtNum } from "../utils/time";

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
export interface BarItem { label: string; v: number; dim?: boolean; title?: string }

/** Minimal çubuk grafik. `goal` kesikli hedef çizgisi çizer. */
export function BarChart({ items, goal, color = "var(--green)", fmt = v => fmtNum(v, 0), label }: { items: BarItem[]; goal?: number | null; color?: string; fmt?: (v: number) => string; label: string }) {
  const W = 340, H = 180, L = 30, B = 22, T = 10, R = 4;
  const vmax = niceMax(Math.max(goal || 0, ...items.map(i => i.v || 0)) * 1.05);
  const iw = W - L - R, ih = H - B - T, bw = iw / items.length;
  const y = (v: number) => T + ih - (v / vmax) * ih;
  const idx = items.length > 2 ? [0, Math.floor((items.length - 1) / 2), items.length - 1] : items.map((_, i) => i);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {[0, 1, 2].map(i => { const v = (vmax * i) / 2; return <g key={i}><line className="gl" x1={L} x2={W - R} y1={y(v)} y2={y(v)} /><text x={L - 6} y={y(v) + 4} textAnchor="end">{fmt(v)}</text></g>; })}
      {items.map((it, i) => {
        if (!it.v) return null;
        const h = Math.max(2, (it.v / vmax) * ih), x = L + i * bw + bw * 0.18, w = Math.max(1.5, bw * 0.64);
        return <rect key={i} x={x} y={T + ih - h} width={w} height={h} rx={Math.min(4, w / 2)} fill={color} opacity={it.dim ? 0.42 : 1}><title>{it.title}</title></rect>;
      })}
      {goal ? <line className="goal" x1={L} x2={W - R} y1={y(goal)} y2={y(goal)} /> : null}
      {idx.map(i => <text key={i} x={L + i * bw + bw / 2} y={H - 6} textAnchor={i === 0 ? "start" : i === items.length - 1 ? "end" : "middle"}>{items[i].label}</text>)}
    </svg>
  );
}

/** Minimal çizgi grafik (kilo gibi sürekli veriler). */
export function LineChart({ pts, label, fmt = v => fmtNum(v, 1) }: { pts: { ts: number; v: number }[]; label: string; fmt?: (v: number) => string }) {
  const W = 340, H = 180, L = 36, B = 22, T = 12, R = 8;
  const vs = pts.map(p => p.v);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (hi - lo < 2) { const m = (hi + lo) / 2; lo = m - 1; hi = m + 1; }
  lo = Math.floor(lo); hi = Math.ceil(hi);
  const t0 = pts[0].ts, t1 = pts[pts.length - 1].ts;
  const x = (ts: number) => L + ((ts - t0) / Math.max(1, t1 - t0)) * (W - L - R);
  const y = (v: number) => T + (H - B - T) - ((v - lo) / (hi - lo)) * (H - B - T);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p.ts).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {[0, 1, 2].map(i => { const v = lo + ((hi - lo) * i) / 2; return <g key={i}><line className="gl" x1={L} x2={W - R} y1={y(v)} y2={y(v)} /><text x={L - 6} y={y(v) + 4} textAnchor="end">{fmt(v)}</text></g>; })}
      <path d={d} fill="none" stroke="var(--green)" strokeWidth={2.2} strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={x(p.ts)} cy={y(p.v)} r={3} fill="var(--surface)" stroke="var(--green)" strokeWidth={2}><title>{`${fmtDayShort(p.ts)}: ${fmt(p.v)}`}</title></circle>)}
      <text x={L} y={H - 6}>{fmtDayShort(t0)}</text>
      <text x={W - R} y={H - 6} textAnchor="end">{fmtDayShort(t1)}</text>
    </svg>
  );
}
