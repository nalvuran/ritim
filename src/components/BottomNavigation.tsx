import type { Tab } from "../types";
import { setTab, ui } from "../services/ui";
import { useUI } from "../hooks/useApp";
import { Icon } from "./Icons";

const TABS: { id: Tab; t: string; i: keyof typeof Icon }[] = [
  { id: "today", t: "Bugün", i: "today" },
  { id: "fast", t: "Oruç", i: "fast" },
  { id: "history", t: "Geçmiş", i: "history" },
  { id: "stats", t: "İstatistik", i: "stats" },
  { id: "profile", t: "Profil", i: "profile" },
];
export function BottomNavigation() {
  useUI();
  return (
    <nav className="nav" aria-label="Ana menü">
      <ul>
        {TABS.map(t => {
          const I = Icon[t.i];
          return (
            <li key={t.id}>
              <button onClick={() => setTab(t.id)} aria-current={ui.tab === t.id ? "page" : undefined}>
                <span className="ni"><I /></span>{t.t}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
