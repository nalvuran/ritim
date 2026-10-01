# Ritim — Aralıklı Oruç (PWA)

"Bir kronometre değil, kişisel oruç koçu." Oruç, yemek penceresi, açlık, su, uyku ve kilo kayıtlarını bir arada tutan; zamanla kişisel içgörüler sunan, mobil öncelikli bir Progressive Web App.

React + TypeScript + Vite. Ek UI kütüphanesi yok; grafikler, sayaç ve halkalar elle yazılmış hafif bileşenlerdir.

## Başlarken

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # PWA sürümü → dist/
npm run preview      # dist/ klasörünü yerelde sun (service worker localhost'ta da çalışır)
npm run build:single # tek dosyalık HTML → dist-single/index.html
```

Node 18 veya üstü gerekir.

## Yayınlama

### GitHub Pages (kurulu)

`main` dalına her gönderimde `.github/workflows/deploy.yml` uygulamayı derleyip **https://nalvuran.github.io/ritim/** adresinde yayınlar. Derleme, alt klasör için `VITE_BASE=/ritim/` ile yapılır. Pages sunucu kodu çalıştıramadığı için AI koç bu sürümde kapalı görünür.

### Vercel (koç dahil)

1. Projeyi bir Git deposuna yükle ve Vercel'e bağla. Framework olarak Vite otomatik algılanır.
2. `vercel.json` service worker için önbellek başlıklarını ve SPA yönlendirmesini ayarlar.
3. HTTPS zorunludur (service worker ve bildirimler için). Vercel, Netlify ve Cloudflare Pages bunu otomatik sağlar.

Netlify veya Cloudflare Pages kullanıyorsan derleme komutu `npm run build`, çıktı klasörü `dist`.

## AI Koç

Koç iki şekilde çalışır:

- **Claude içinde açıldığında:** Ek ayar gerekmez; Claude'un artifact çalışma ortamındaki `sample` yeteneğini kullanır.
- **Kendi sunucunda:** `api/coach.js` bir Vercel Serverless Function örneğidir. API anahtarı yalnızca sunucuda kalır.
  1. Vercel proje ayarlarına `ANTHROPIC_API_KEY` ekle (isteğe bağlı olarak `ANTHROPIC_MODEL`; güncel model adları için https://docs.claude.com/en/docs/about-claude/models).
  2. `.env` dosyasına `VITE_COACH_ENDPOINT=/api/coach` yaz ve yeniden derle.

İkisi de yoksa koç ekranı nazik bir "kullanılamıyor" mesajı gösterir; uygulamanın geri kalanı etkilenmez.

Koç kuralları (`src/services/coach.ts`): tıbbi teşhis yok, ilaç/insülin dozu yok; diyabet, gebelik, yeme bozukluğu, hipoglisemi gibi konularda sağlık profesyoneline yönlendirme; kriz ifadelerinde 112 bilgisi. Uygulama bu konularda ayrıca kendi güvenlik notunu da ekler.

## Klasör yapısı

```
src/
  types/        Veri modeli (AppState, FastingSession, Meal, …)
  data/         Sabitler: planlar, açlık nedenleri, sağlık durumları, oruç evreleri
  utils/        Saf hesaplamalar
    time.ts       Tarih/saat biçimleri (tr-TR), Türkçe ekler (20:00'de, 09:03'te)
    domain.ts     Plan, aktif oruç, günlük durum, alışkanlık skoru
    analytics.ts  İstatistik, davranış analizi, içgörüler, haftalık rapor, seri, rozetler
  services/
    store.ts      Uygulama durumu, kalıcılık, uzak eşitleme adapter'ı
    demo.ts       30 günlük gerçekçi örnek veri
    coach.ts      AI koç bağlamı ve istekleri
    notifications.ts  Bildirim zamanlayıcısı, sessiz saatler
    export.ts     JSON / CSV dışa aktarma
    claude.ts     Claude artifact yetenekleri (yalnızca Claude içinde)
    ui.ts         Sekme, alt sayfa (sheet) ve toast durumu
  hooks/        useStore, useUI, useNow, useReducedMotion
  components/   FastingTimer, ProgressRing, WaterTracker, HungerSlider, MealLog, SleepCard,
                WeightChart, FastingHistory, InsightCard, AchievementCard, WeeklyReport,
                BottomNavigation, Modal, Toast, Button, Card, Chart, Forms, …
  screens/      Landing, Onboarding, Today, Fast, History, Stats, Profile, Coach
  styles/       global.css (CSS değişkenleriyle açık/koyu tema)
public/         manifest, service worker, ikonlar
api/            İsteğe bağlı koç sunucusu
```

## Veri ve backend'e geçiş

Veriler mantıksal koleksiyonlara ayrılmıştır: `meta` (profil, ayarlar, günlük plan değişiklikleri, rozetler), `fasts`, `meals`, `water`, `hunger`, `sleep`, `weight`. Hepsi önce `localStorage`'a yazılır, ardından varsa bir uzak adapter ile eşitlenir.

Supabase veya Firebase'e geçmek için `src/services/store.ts` içindeki `RemoteAdapter` arayüzünü uygulaman yeterli:

```ts
export interface RemoteAdapter {
  name: string;
  read(col: Collection): Promise<{ updatedAt: number; value?: any; items?: any[] } | null>;
  write(col: Collection, doc: { updatedAt: number; value?: any; items?: any[] }): Promise<void>;
}
```

Örneğin Supabase'de `user_id, collection, updated_at, payload jsonb` sütunlu tek bir tablo ile başlayabilir, ileride her koleksiyonu kendi tablosuna ayırabilirsin. Çakışma çözümü şu an koleksiyon bazında "son yazan kazanır" şeklindedir.

## PWA ve bildirimler hakkında

- Uygulama ilk ziyaretten sonra çevrimdışı açılır (service worker uygulama kabuğunu ve dosyaları önbelleğe alır).
- Ana ekrana eklendiğinde tam ekran, uygulama gibi açılır. Android'de açılış ekranı manifest'teki renk ve ikonla oluşturulur; iPhone'da cihaza özel açılış görselleri eklemek istersen `apple-touch-startup-image` bağlantıları `index.html`'e eklenebilir.
- Bildirimler, uygulama açıkken ya da tarayıcı onu arka planda canlı tuttuğu sürece zamanında gönderilir. Uygulama tamamen kapalıyken de bildirim göndermek için bir push sunucusu (Web Push + VAPID) gerekir; bu, backend'e geçişle birlikte eklenebilecek bir sonraki adımdır.
- iPhone'da web bildirimleri iOS 16.4+ ve uygulamanın ana ekrana eklenmiş olmasını gerektirir.

## Sağlık güvenliği

Ritim bir alışkanlık ve günlük takip aracıdır; tıbbi teşhis veya tedavi aracı değildir. Kurulumda sağlık durumları sorulur, yoğun planlarda (20:4, OMAD) uyarı gösterilir, sağlıklı aralığın altındaki hedef kilolar kabul edilmez ve oruç evresi açıklamaları bilinçli olarak temkinli tutulmuştur.
