import { closeSheet } from "../services/ui";
import { Button } from "./Button";
import { SheetHeader } from "./Modal";

/** Onay penceresi (veri silme gibi geri alınamaz işlemler için) */
export function ConfirmSheet({ title, body, confirm, danger, onConfirm }: { title: string; body: string; confirm: string; danger?: boolean; onConfirm: () => void }) {
  return (
    <>
      <SheetHeader title={title} />
      <p className="muted">{body}</p>
      <div className="actions">
        <Button variant={danger ? "danger" : "primary"} onClick={() => { closeSheet(); onConfirm(); }}>{confirm}</Button>
        <Button variant="ghost" onClick={closeSheet}>Vazgeç</Button>
      </div>
    </>
  );
}
