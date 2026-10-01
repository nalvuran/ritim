import { dismissToast, ui } from "../services/ui";
import { useUI } from "../hooks/useApp";

export function ToastHost() {
  useUI();
  const t = ui.toast;
  return (
    <div className={`toast${t ? " show" : ""}`} role="status" aria-live="polite">
      {t && <span>{t.msg}</span>}
      {t?.action && <button type="button" onClick={() => { const a = t.action!; dismissToast(); a.fn(); }}>{t.action.label}</button>}
    </div>
  );
}
