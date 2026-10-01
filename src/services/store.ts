import type { AppState, Collection, Meta } from "../types";
import { DEFAULT_SETTINGS, STORE_KEY } from "../data/constants";
import { capability } from "./claude";

export const COLS: Collection[] = ["meta", "fasts", "meals", "water", "hunger", "sleep", "weight"];

export function freshMeta(): Meta {
  return {
    profile: null,
    settings: { ...DEFAULT_SETTINGS, notifications: { ...DEFAULT_SETTINGS.notifications } },
    overrides: {}, achievements: {}, demo: false, seenLanding: false,
  };
}
export function freshState(): AppState {
  return { meta: freshMeta(), fasts: [], meals: [], water: [], hunger: [], sleep: [], weight: [], _u: {} };
}
function mergeMeta(m: Partial<Meta> | undefined): Meta {
  const base = freshMeta();
  if (!m) return base;
  return {
    ...base, ...m,
    settings: { ...base.settings, ...(m.settings || {}), notifications: { ...base.settings.notifications, ...(m.settings?.notifications || {}) } },
    achievements: m.achievements || {}, overrides: m.overrides || {},
  };
}

/* ---------------- In-memory store ---------------- */
export let S: AppState = freshState();
let version = 0;
const listeners = new Set<() => void>();
export const subscribe = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };
export const getVersion = () => version;
const emit = () => { version++; listeners.forEach(l => l()); };
export let storageOk = true;

/* ---------------- Storage adapters ----------------
   Bir adapter, koleksiyon bazında { value/items, updatedAt } belgeleri okur/yazar.
   Supabase/Firebase'e geçmek için yalnızca yeni bir RemoteAdapter yazmak yeterli (bkz. README). */
export interface RemoteAdapter {
  name: string;
  read(col: Collection): Promise<{ updatedAt: number; value?: any; items?: any[] } | null>;
  write(col: Collection, doc: { updatedAt: number; value?: any; items?: any[] }): Promise<void>;
}

/** claude.ai artifact veritabanı: kişiye özel satırlar (data/users/<id>/...) */
async function claudeDbAdapter(): Promise<RemoteAdapter | null> {
  const [db, user] = await Promise.all([capability<any>("db"), capability<any>("user")]);
  if (!db || !user) return null;
  const id = await user.id();
  if (!id) return null;
  const col = db.collection("data/users/" + id);
  return {
    name: "claude-db",
    async read(c) { const snap = await col.doc(c).get(); return snap?.exists ? JSON.parse(JSON.stringify(snap.data())) : null; },
    async write(c, doc) { await col.doc(c).set(JSON.parse(JSON.stringify(doc))); },
  };
}

export function loadLocal() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    S = {
      ...freshState(), ...p, meta: mergeMeta(p.meta), _u: p._u || {},
    };
    for (const c of COLS) if (c !== "meta" && !Array.isArray((S as any)[c])) (S as any)[c] = [];
  } catch (e) { storageOk = false; console.warn("Yerel veri okunamadı", e); }
}
function persistLocal() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); storageOk = true; }
  catch { storageOk = false; }
}

const Sync = {
  remote: null as RemoteAdapter | null,
  dirty: new Set<Collection>(),
  writing: {} as Record<string, boolean>,
  timer: 0 as any,
  schedule() { if (!this.remote) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), 1200); },
  async flush() {
    const r = this.remote; if (!r) return;
    for (const c of Array.from(this.dirty)) {
      if (this.writing[c]) continue;
      this.dirty.delete(c); this.writing[c] = true;
      const updatedAt = S._u[c] || Date.now();
      const doc = c === "meta" ? { value: S.meta, updatedAt } : { items: (S as any)[c], updatedAt };
      try { await r.write(c, doc); } catch (e: any) { console.warn("Eşitleme yazılamadı", c, e?.code); }
      finally { this.writing[c] = false; if (this.dirty.has(c)) this.schedule(); }
    }
  },
};
export const syncName = () => Sync.remote?.name || null;

let remoteStarted = false;
export async function initRemote() {
  if (remoteStarted) return;
  remoteStarted = true;
  try {
    const r = await claudeDbAdapter();
    if (!r) return;
    let changed = false;
    for (const c of COLS) {
      let remote: any = null;
      try { remote = await r.read(c); } catch { continue; }
      const localU = S._u[c] || 0;
      if (remote && (remote.updatedAt || 0) > localU) {
        if (c === "meta") S.meta = mergeMeta(remote.value); else (S as any)[c] = remote.items || [];
        S._u[c] = remote.updatedAt; changed = true;
      } else if (localU && (!remote || localU > (remote.updatedAt || 0))) Sync.dirty.add(c);
    }
    Sync.remote = r;
    persistLocal();
    Sync.flush();
    emit(); // arayüzü (eşitleme durumu ve gelen veriler) güncelle
    void changed;
  } catch (e) { console.warn("Uzak depolama kullanılamıyor", e); }
}

/** Koleksiyon(lar) değişti: yerelde kaydet, uzak eşitlemeyi planla, arayüzü güncelle. */
export function commit(...cols: Collection[]) {
  const now = Date.now();
  for (const c of cols) { S._u[c] = now; Sync.dirty.add(c); }
  persistLocal();
  Sync.schedule();
  emit();
}
/** Tüm durumu değiştir (ör. veri silme) */
export function replaceState(next: AppState) {
  S = next;
  commit(...COLS);
}
