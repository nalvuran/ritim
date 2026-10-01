import type { Insight } from "../types";
import { Icon } from "./Icons";

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className="insight">
      <span className="insight-i" aria-hidden="true"><Icon.spark /></span>
      <p>{insight.text}</p>
    </div>
  );
}
