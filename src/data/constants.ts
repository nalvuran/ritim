import type { HealthFlag, Settings } from "../types";

export const PLANS: { id: string; h: number | null; d: string; intense?: boolean }[] = [
  { id: "12:12", h: 12, d: "Başlangıç için yumuşak bir ritim" },
  { id: "14:10", h: 14, d: "Dengeli ve sürdürülebilir" },
  { id: "16:8", h: 16, d: "En yaygın tercih" },
  { id: "18:6", h: 18, d: "Deneyimli kullanıcılar için" },
  { id: "20:4", h: 20, d: "Yoğun; dikkatli ilerle", intense: true },
  { id: "OMAD", h: 23, d: "Günde tek öğün; yoğun", intense: true },
  { id: "Özel", h: null, d: "Süreyi kendin belirle" },
];
export const HUNGER_REASONS = ["Gerçek açlık", "Tatlı isteği", "Can sıkıntısı", "Stres", "Alışkanlık", "Sosyal ortam", "Diğer"];
export const MEAL_TAGS = ["Protein", "Sebze", "Karbonhidrat", "Tatlı", "İçecek", "Diğer"];
export const MEAL_LABELS = ["İlk öğün", "Ara öğün", "Son öğün", "Atıştırmalık"];
export const ACTIVITY = ["Düşük", "Orta", "Yüksek"];
export const SEXES = ["Kadın", "Erkek", "Belirtmek istemiyorum"];
export const HEALTH_FLAGS: { id: HealthFlag; t: string }[] = [
  { id: "pregnancy", t: "Gebelik veya emzirme" },
  { id: "diabetes", t: "Diyabet ya da kan şekeri ilacı" },
  { id: "ed", t: "Yeme bozukluğu geçmişi" },
  { id: "meds", t: "Düzenli ilaç kullanımı" },
  { id: "other", t: "Başka bir kronik sağlık durumu" },
];

/* Bilimsel olarak temkinli, genel ifadeler. Kesin saat/etki iddiası yok. */
export const PHASES = [
  { from: 0, h: "Sindirim dönemi", p: "Son öğünün sindirimi devam ediyor. Su içmek iyi bir başlangıç." },
  { from: 4, h: "Geçiş dönemi", p: "Vücudun, öğün sonrası duruma göre enerji kullanımını ayarlamaya başlar." },
  { from: 8, h: "Uyum dönemi", p: "Bu dönemde enerji kullanımı değişmeye devam eder. Ne zaman ne hissettiğin kişiden kişiye farklıdır." },
  { from: 12, h: "Derinleşen oruç", p: "Açlık hissi dalgalar halinde gelip geçebilir. Su ve şekersiz içecekler yardımcı olabilir." },
  { from: 16, h: "Uzun oruç", p: "Kendini nasıl hissettiğine dikkat et. Baş dönmesi, halsizlik ya da çarpıntı olursa orucu bitirmek en doğru seçimdir." },
];

export const DEFAULT_SETTINGS: Settings = {
  plan: "16:8", fastHours: 16, startTime: "20:00", waterGoal: 2500, unit: "kg", theme: "system",
  notifications: { enabled: false, fastStart: true, windowOpen: true, goalSoon: true, water: true, dailyCheck: true, quietStart: "23:00", quietEnd: "08:00" },
};

export const STORE_KEY = "ritim.v1";
