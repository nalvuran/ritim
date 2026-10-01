import type { Badge } from "../utils/analytics";

/** Sade rozet kartı: açılmamışsa ilerleme gösterir. */
export function AchievementCard({ b, unlockedAt }: { b: Badge; unlockedAt?: number }) {
  const done = b.progress >= b.target;
  return (
    <div className={`badge${done ? " done" : ""}`} aria-label={`${b.t}: ${done ? "kazanıldı" : `${b.progress}/${b.target}`}`}>
      <span className="badge-i" aria-hidden="true">{b.icon}</span>
      <span className="badge-t">{b.t}</span>
      <span className="badge-d">{done ? (unlockedAt ? new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(unlockedAt) : "Kazanıldı") : `${b.progress}/${b.target}`}</span>
      {!done && <span className="bar" aria-hidden="true"><i style={{ width: `${(b.progress / b.target) * 100}%` }} /></span>}
    </div>
  );
}
