import { useEffect } from "react";
import { S, commit, initRemote } from "./services/store";
import { toast, ui } from "./services/ui";
import { useStore, useUI } from "./hooks/useApp";
import { checkNotifications } from "./services/notifications";
import { newlyUnlocked } from "./utils/analytics";
import { BottomNavigation } from "./components/BottomNavigation";
import { SheetHost } from "./components/Modal";
import { ToastHost } from "./components/Toast";
import { Landing } from "./screens/Landing";
import { Onboarding } from "./screens/Onboarding";
import { TodayScreen } from "./screens/Today";
import { FastScreen } from "./screens/Fast";
import { HistoryScreen } from "./screens/History";
import { StatsScreen } from "./screens/Stats";
import { ProfileScreen } from "./screens/Profile";

export function applyTheme() {
  const t = S.meta.settings.theme;
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

const SCREENS = { today: TodayScreen, fast: FastScreen, history: HistoryScreen, stats: StatsScreen, profile: ProfileScreen };

export function App() {
  const v = useStore();
  useUI();

  useEffect(() => { initRemote(); }, []);
  useEffect(() => { applyTheme(); }, [v]);

  // Yeni rozet kontrolü (veri her değiştiğinde)
  useEffect(() => {
    if (!S.meta.profile) return;
    const fresh = newlyUnlocked();
    if (fresh.length) {
      commit("meta");
      toast(`Yeni rozet: ${fresh[0].icon} ${fresh[0].t}`);
    }
  }, [v]);

  // Bildirim zamanlayıcısı
  useEffect(() => {
    checkNotifications();
    const id = setInterval(checkNotifications, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!S.meta.profile) {
    return <>{S.meta.seenLanding ? <Onboarding /> : <Landing />}<ToastHost /></>;
  }
  const Screen = SCREENS[ui.tab];
  return (
    <>
      <div id="app-main">
        <main className="shell"><div className="screen" key={ui.tab}><Screen /></div></main>
        <BottomNavigation />
      </div>
      <SheetHost />
      <ToastHost />
    </>
  );
}
