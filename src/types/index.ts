/* Ritim veri modeli. Her koleksiyon ayrı tutulur; ileride Supabase/Firebase tablolarına birebir taşınabilir. */

export type HealthFlag = "pregnancy" | "diabetes" | "ed" | "meds" | "other" | "none";
export type Theme = "system" | "light" | "dark";
export type WeightUnit = "kg" | "lb";

export interface Profile {
  age: number;
  height: number; // cm
  weight: number; // kg
  targetWeight: number | null; // kg
  sex: string | null;
  activity: string;
  healthFlags: HealthFlag[];
  createdAt: number;
}

export interface NotificationSettings {
  enabled: boolean;
  fastStart: boolean;
  windowOpen: boolean;
  goalSoon: boolean;
  water: boolean;
  dailyCheck: boolean;
  quietStart: string; // "23:00"
  quietEnd: string; // "08:00"
}

export interface Settings {
  plan: string;
  fastHours: number;
  startTime: string; // "HH:MM"
  waterGoal: number; // ml
  unit: WeightUnit;
  theme: Theme;
  notifications: NotificationSettings;
}

export interface PlanOverride { startTime: string; hours: number }

export interface Meta {
  profile: Profile | null;
  settings: Settings;
  overrides: Record<string, PlanOverride>; // dayKey → today's plan
  achievements: Record<string, number>; // badgeId → unlockedAt
  demo: boolean;
  seenLanding: boolean;
}

interface Base { id: string; demo?: boolean }
export interface FastingSession extends Base { start: number; end: number | null; goalH: number }
export interface Meal extends Base { ts: number; label: string; tags: string[]; note: string }
export interface WaterLog extends Base { ts: number; ml: number }
export interface HungerLog extends Base { ts: number; level: number; reason: string; note: string; awareness?: string | null }
export interface SleepLog extends Base { date: string; bed: number; wake: number }
export interface WeightLog extends Base { ts: number; kg: number; waist: number | null }

export interface AppState {
  meta: Meta;
  fasts: FastingSession[];
  meals: Meal[];
  water: WaterLog[];
  hunger: HungerLog[];
  sleep: SleepLog[];
  weight: WeightLog[];
  _u: Partial<Record<Collection, number>>; // last update time per collection (sync)
}

export type Collection = "meta" | "fasts" | "meals" | "water" | "hunger" | "sleep" | "weight";
export type ListCollection = Exclude<Collection, "meta">;

export type Tab = "today" | "fast" | "history" | "stats" | "profile";

export interface LiveState {
  mode: "fast" | "fast-done" | "eat" | "empty";
  f?: FastingSession;
  lf?: FastingSession | null;
  el: number;
  goal: number;
  p: number;
  end?: number;
  nextStart?: number;
}

export interface Insight { id: string; text: string; detail?: string }
