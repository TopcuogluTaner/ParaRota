# Faz 6 — Yatırım / Varlık Takibi (Portföy) Planı

> TCMB (EVDS) kaynaklı altın + döviz portföy takibi. Kullanıcı bir alım girer ("100.000 ₺ altın aldım"),
> sistem o günkü kuru EVDS'den çeker, adedi/gramı saklar; daha sonra güncel kurla değer + kâr/zarar gösterir.
> Hedef: al-tut-değerini-gör senaryosu. Satış (realize K/Z) 6.4'e bırakıldı.

## 1. Kilitlenmiş kararlar (kullanıcı onayı 2026-06-04)

| Konu | Karar |
|---|---|
| Kapsam (MVP) | **Gram altın + USD/EUR/GBP** (EVDS tek kaynak) |
| Nakit bağlantısı | **İşleme bağlı** — alım, opsiyonel olarak hesaptan gider düşer (Debt LinkedTransaction deseni) |
| Giriş şekli | **Hem TL tutarı hem adet/gram** — biri girilir, diğeri o günkü kurdan türetilir |
| Veri tazeliği | **Saat başı** — Hangfire job iş saatlerinde saatte bir EVDS'den çeker |
| Gider kategorisi | **"Yatırım" sistem kategorisi** (otomatik, kullanıcı her seferinde seçmez) |
| Satış / pozisyon kapatma | **6.4'e ertelendi** (MVP = alım + değerleme) |

## 2.0 — 6.0 SPIKE SONUCU (2026-06-04, kullanıcının gerçek TR bağlantısından test edildi)

> ⚠️ Veri-katmanı varsayımı değişti. Spike, kör kod yazmadan önce şunu yakaladı:

| Bulgu | Durum |
|---|---|
| **Döviz (USD/EUR/GBP)** — anahtarsız `kurlar/today.xml` + tarihli `kurlar/YYYYMM/DDMMYYYY.xml` | ✅ **Çalışıyor.** Geçmiş backfill dahil (02062026.xml → USD 45.9228 döndü). Anahtar GEREKMİYOR. |
| **Klasik keyed EVDS REST** `evds2.tcmb.gov.tr/service/evds/` + `key` header | ❌ **Ölü.** Bir **BigIP** yük dengeleyici her isteği (anahtarlı/anahtarsız, query/header farketmez) **evds3'e 302** atıyor. Redirect anahtar kontrolünden ÖNCE → "anahtar geçersiz" değil, **endpoint göçü**. |
| **evds3 yeni sistem** | React SPA; backend `https://evds3.tcmb.gov.tr/igmevdsms-dis/...` (ör. **POST** `/serieList/baslangicBitis` body `{series,startDate,endDate,frequency,...}`). JSON döner, key-header'da 401 vermedi ama **dokümante değil/özel** — muhtemelen session/CSRF ister. Üretim entegrasyonu için sağlam temel DEĞİL. |
| **Altın** | Yalnız EVDS'de (keyed) → yukarıdaki göç yüzünden **bloklu.** |
| **Anahtar** | Doğrulanamadı — test edilebilecek çalışan dokümante public uç yok. (Anahtar değeri repoya YAZILMAZ — yalnız appsettings/secret.) |
| **Saat başı** | Anahtarsız XML **günlüktür** (TCMB ~15:30 tek bülten). Saat-başı yalnız evds3 keyed sistemde → EVDS çözülmeden saat-başı YOK; çözülmezse döviz günlük resmi kapanışa düşer. |

**Sonuç:** Döviz hemen yapılabilir (stabil, anahtarsız). Altın + saat-başı, evds3 public API yönteminin netleşmesine bağlı. Karar §2.1'de.

### 2.1.b — ÇÖZÜLDÜ: çalışan EVDS3 ucu + anahtar geçerli (2026-06-04)
> evds2/service göçtü ama yeni public uç bulundu (maintained `evdspy` kütüphanesi teyit etti) ve **kullanıcının anahtarı ÇALIŞIYOR** (anahtar değeri repoya yazılmaz — yalnız appsettings/secret).

- **Çalışan uç:** `GET https://evds3.tcmb.gov.tr/igmevdsms-dis/series=<KOD>&startDate=GG-AA-YYYY&endDate=GG-AA-YYYY&type=json`
- **Auth:** HTTP header `key: <ANAHTAR>` (URL'de değil — 05.04.2024 değişikliği).
- **Param stili:** path-style (`series=...&...`, `?` YOK). Tarihler ZORUNLU. Format `GG-AA-YYYY`.
- **Yanıt:** `{"totalCount":N,"items":[{"Tarih":"...","<KOD_alt_cizgili>":"deger","UNIXTIME":{...}}]}`
- **Döviz (GÜNLÜK, güncel):** `TP.DK.USD.S.YTL` (satış) / `TP.DK.USD.A.YTL` (alış); EUR=`TP.DK.EUR.*`, GBP=`TP.DK.GBP.*`. (04-06-2026 USD satış=45.9522 doğrulandı.) Anahtarsız `today.xml` de var.
- **Gram altın (AYLIK, ~2 ay gecikmeli):** `TP.MK.KUL.YTL` = "Külçe Altın Satış Fiyatı (TL/Gr)" — kategori 2502 (ALTIN İSTATİSTİKLERİ), datagroup `bie_mkaltytl` (Ankara Kuyumcular Odası). **En güncel = 2026-4 → 6835.34 TL/gr.** Diğer: `TP.MK.CUM.YTL` (Cumhuriyet), `TP.MK.RES.YTL` (Reşat), `TP.MK.LON.YTL` (Londra ons USD).
- ⚠️ **Günlük resmi gram altın YOK:** `today.xml` yalnız döviz; EVDS'de gram altın yalnız bu aylık seri. Günlük altın ancak "Saat Başı" SPA servisi (temiz API değil) ya da 3. parti.

### 2.2 — Kullanıcı kararı (2026-06-04, spike sonrası)
- ✅ **Döviz ŞİMDİ** yapılır (USD/EUR/GBP, anahtarsız XML). Altın aynı `IMarketDataProvider`'a evds3 yöntemi netleşince eklenir.
- ✅ **Tazelik: günlük resmi kapanış** (saat-başı şart değil). Hangfire job **günde bir** (TCMB bülteni ~15:30 sonrası, ör. 16:00 TR). Saat-başı, EVDS netleşirse sonraki faza.
- Build sırası güncellendi: **6.1 FX backend → 6.2 web → 6.3 mobile**, altın = EVDS netleşince ara-faz.

### 2.1 Önerilen yol (spike sonrası)
- **Adım 1 (kullanıcı, 5 dk):** evds3.tcmb.gov.tr'ye hesabınla gir → **Dokümanlar / Web Servis** sayfasından göç-sonrası **güncel public API yöntemini + anahtarın nasıl gönderildiğini** öğren; anahtarın geçerli/aktif olduğunu profilden teyit et. Bana ilet.
- **Adım 2 (mimari):** `IMarketDataProvider` çok-kaynaklı tasarlanır → **döviz = anahtarsız XML** (bugün çalışır), **altın = EVDS3** (yöntem netleşince). Böylece FX hemen, altın izole risk olarak sonra eklenir.
- **Fallback:** EVDS3 public API çözülmezse altın için 3. parti kaynak (ör. collectapi) — ama "Merkez Bankası" tercihinden sapar, son çare.

## 2. Veri kaynağı — TCMB EVDS (tek sağlayıcı)

- **Erişim:** EVDS REST — `https://evds2.tcmb.gov.tr/service/evds/series=<KOD>&startDate=DD-MM-YYYY&endDate=DD-MM-YYYY&type=json&key=<APIKEY>`
- **Anahtar:** ücretsiz; kullanıcı kendi TCMB hesabıyla alır (bkz. §9 adımlar). `appsettings.json` → `Evds:ApiKey` (Azure DI anahtarı gibi, repo sözleşmesine uygun).
- **Series kodları (spike'ta kesinleşecek):** USD/EUR/GBP alış-satış (`TP.DK.USD.A.YTL` / `.S.YTL` vb.), gram altın TL (EVDS "Altın" kategorisi). **6.0 spike** bu kodları + saat-başı granülasyonun EVDS'de gerçekten dönüp dönmediğini doğrular.
- **Anahtarsız `kurlar/today.xml` neden yetmez:** yalnız döviz içerir, **altın yok** → EVDS zorunlu.
- **Hafta sonu/tatil:** TCMB veri yayınlamaz → "son iş günü kuru"na düşülür; snapshot cache bunu doğal çözer.
- **Caching zorunlu:** EVDS rate-limit'i var; her kur tek sefer çekilip `AssetPriceSnapshot`'a yazılır, tekrar çekilmez.

## 3. Domain modeli

### 3.1 Enum / sabitler
```
AssetType (enum): GoldGram, Usd, Eur, Gbp   // MVP; sonra çeyrek/yarım/tam, hisse, fon
```
`AssetCode` string olarak da tutulabilir (EVDS series eşleme tablosu için esneklik). Karar: enum + `AssetCatalog` statik eşleme (enum → EVDS series kodu + i18n key + ondalık hassasiyet).

### 3.2 Entity'ler (`ParaRota.Domain/Entities/`)

**`InvestmentHolding : BaseEntity`**
```
int UserId / AppUser User
int? HouseholdId / Household?            // scope
int? SharedWithHouseholdId               // Plan C scope sözleşmesi
AssetType AssetType
decimal Quantity                         // adet/gram
decimal InvestedAmount                   // ₺ maliyet
decimal UnitPriceAtPurchase              // alış günü birim kuru (snapshot'tan)
string Currency = "TRY"
DateTime PurchaseDate
int? LinkedTransactionId / Transaction?  // nakit gider bağlantısı (nullable)
string? Note
```

**`AssetPriceSnapshot : BaseEntity`** (kur arşivi / cache)
```
AssetType AssetType
DateTime Timestamp                       // saat başı; en güncel = MAX(Timestamp)
decimal BuyPrice
decimal SellPrice
string Source = "EVDS"
// Unique index (AssetType, Timestamp)
```

### 3.3 Migration
- 2 tablo + indexler: `InvestmentHolding(UserId, HouseholdId, SharedWithHouseholdId, PurchaseDate)`, `AssetPriceSnapshot(AssetType, Timestamp)` unique.
- FK'ler: HouseholdId → Households (SetNull), SharedWithHouseholdId → Households (SetNull), LinkedTransactionId → Transactions (SetNull), UserId → Users.
- "Yatırım" sistem kategorisi seed'i (global system categories setine ekleme; tip = expense; i18n adı).

## 4. Backend mimari (MediatR + Clean Architecture)

### 4.1 Infrastructure — market data
- `IMarketDataProvider` (Application/Services) + `EvdsMarketDataProvider` (External/Infrastructure):
  - `GetLatestAsync(AssetType)` — en güncel snapshot (cache); yoksa EVDS'den çek.
  - `GetForDateAsync(AssetType, date)` — geçmiş backfill (snapshot yoksa EVDS tarihli sorgu → kaydet). Hafta sonu → son iş günü.
  - `RefreshAllAsync()` — saat başı job'un çağırdığı toplu çekim.
  - `EvdsSettings { ApiKey, BaseUrl }` (IOptions), `HttpClient` (named/typed client + Polly retry opsiyonel).

### 4.2 Application — MediatR
- `CreateHoldingCommand` (+Validator: tutar>0 veya quantity>0, tarih gelecekte değil, AssetType geçerli) — alış kurunu çek, eksik alanı türet, `LinkToCashFlow` true ise **atomik** `Transaction` (expense, "Yatırım" kategori) + `LinkedTransactionId` set. **`BeginTransactionAsync` + rollback** (Debt `1fc7b88` deseni — hayalet kayıt yok).
- `UpdateHoldingCommand`, `DeleteHoldingCommand` (linked tx davranışı: silinince tx'i koru ama unlink — karar §7).
- `GetPortfolioQuery` → `PortfolioDto { TotalInvested, TotalCurrentValue, TotalPnL, TotalPnLPct, LastUpdated, Items[] }`; `HoldingDto { ..., CurrentUnitPrice, CurrentValue, PnL, PnLPct }`. Değerleme = `Quantity × GetLatestAsync`.
- AutoMapper profile + FluentValidation.
- Scope: `HouseholdScope.ResolveActiveScopeAsync`; raporlama agregasyonunda Plan C `SharedWithHouseholdId` kuralı.

### 4.3 Presentation
- `InvestmentsController` — `GET /portfolio`, `POST /holdings`, `PUT /holdings/{id}`, `DELETE /holdings/{id}`. `[Authorize]` + controller-level `[EnableRateLimiting("api-general")]`, scope `X-Active-Household-Id`.

### 4.4 Hangfire — saat başı job
- `Program.cs`'e `RecurringJob.AddOrUpdate` → `IMarketDataProvider.RefreshAllAsync`, cron **iş saatleri içinde saatte bir** (ör. `0 9-18 * * 1-5` TR). Mevcut 02:05/02:10/02:15 ailesine katılır.
- TCMB ~15:30 günlük resmi kuru yayınlar; saatlik servis intraday — job sadece en güncel snapshot'ı yazar, idempotent.
- Sunucu TZ notu: cron Europe/Istanbul'a göre ayarlanmalı.

## 5. Frontend (Web — React 19 + MUI)
- `features/investments/{api,components,pages}`:
  - `PortfolioPage` — özet kart (toplam yatırım / güncel değer / toplam K-Z ₺+% + "son güncelleme") + holding listesi (asset, adet/gram, maliyet, güncel değer, K-Z%).
  - `AddHoldingModal` — AssetType picker, PurchaseDate, toggle `[TL tutarı | adet/gram]`, **ScopeIndicator**, switch *"Hesabımdan gider olarak düş"*.
  - `useInvestments` (TanStack Query + mutations), `shared/api/types/investments.ts` + `endpoints/investments.ts`.
- Router + Sidebar entry (mdi:gold / chart-line). Dashboard kartı opsiyonel (MVP+).

## 6. Mobile (Expo RN Paper) — parite
- `src/features/investments/` aynı yapı; PortfolioScreen + AddHoldingModal (RN Paper), ScopeIndicator, theme uyumlu.
- i18n shared `investments.json`.

## 7. Açık tasarım detayları (impl. sırasında)
- **Holding silinince linked tx:** tx korunur, `LinkedTransactionId` unlink (nakit hareketi gerçek olduğu için silinmez). (Debt deseninde silinirdi; burada kasıtlı farklı.)
- **Para birimi:** MVP TRY bazlı; EVDS FX TRY karşılığı verir.
- **Çift sayım (Plan C):** paylaşılan holding kişisel raporlamada toplanmaz.

## 8. i18n
- Yeni `investments.json` × **5 dil** (TR/EN/AR/ES/DE). "Yatırım" sistem kategori adı + UI string'leri.

## 9. EVDS API anahtarı — adımlar (kullanıcı yapar)
1. https://evds2.tcmb.gov.tr/index.php adresine git → sağ üst **"Giriş Yap / Kayıt Ol"**.
2. **Kayıt ol** (ad-soyad + e-posta + şifre) → e-posta doğrulaması.
3. Giriş yap → sağ üstte kullanıcı adı → **"Profil"** / **"API Anahtarı"** menüsü.
4. **"API Anahtarı Edin / Göster"** ile anahtarı kopyala (uzun alfasayısal dizi).
5. Anahtarı bana ver → `appsettings.json` `Evds:ApiKey` alanına koyarım (Development) + production secret.
6. (Doğrulama) Tarayıcıda test: `https://evds2.tcmb.gov.tr/service/evds/series=TP.DK.USD.S.YTL&startDate=01-06-2026&endDate=04-06-2026&type=json&key=ANAHTAR` → JSON dönerse anahtar çalışıyor.

## 10. Fazlama / build sırası
- **6.0 Spike (½ gün):** EVDS anahtar + series kodları (gram altın + USD/EUR/GBP) sabitle, saat-başı granülasyon + tarihli backfill doğrula. **Bloklayıcı:** anahtar.
- **6.1 Backend core:** entity + migration + "Yatırım" kategori seed + `EvdsMarketDataProvider` + snapshot cache + MediatR Create/Get/Delete + atomik tx linkage + saat-başı Hangfire job. `dotnet build` 0 hata.
- **6.2 Web:** features/investments + PortfolioPage + AddHoldingModal + i18n 5 dil. `tsc/build/lint` 0.
- **6.3 Mobile:** aynı feature RN Paper. `tsc --noEmit` 0.
- **6.4 fast-follow:** satış/pozisyon kapatma (realize K/Z → gelir işlemi) + dashboard portföy kartı + saat-başı "canlı" rozet.

## 10.b — DURUM (2026-06-04): 6.1 + 6.2 + 6.3 TAMAM ✅

- **6.1 Backend** ✅ — entity + migration `AddInvestments` + EvdsClient/TruncgilGoldClient +
  MarketDataService (snapshot değerleme + günlük upsert) + InvestmentService (scope + sahiplik +
  çift giriş + atomik nakit bağlama) + MediatR + InvestmentsController + günlük Hangfire job
  (16:00) + "Yatırım" sistem kategorisi. Build 0 hata. Anahtar: user-secrets (dev) / `Evds__ApiKey` (prod).
- **6.2 Web** ✅ — features/investments (PortföyPage + InvestmentFormModal) + investments ns × 5 dil +
  Sidebar/Router/nav wiring. tsc + eslint temiz.
- **6.3 Mobile** ✅ — features/investments (InvestmentsScreen + AddHoldingModal) + ns × 5 + route + Drawer. tsc 0.
- **6.4** ✅ — satış/pozisyon kapatma (SellAsync: tam/kısmi, ortalama maliyetle realize K/Z, opsiyonel gelir Tx
  "Yatırım Geliri" kategorisi) backend + web SellHoldingModal + mobile SellHoldingModal + dashboard portföy kartı
  (web PortfolioWidget + mobile RouteCard, yalnız yatırımı olanda). tsc + eslint temiz.
- **Faz 6 TAMAM.**

## Faz 7 — Geniş portföy: kripto + BIST hisse (2026-06-04) ✅
- **Kapsam:** +5 döviz (CHF/JPY/CAD/AUD/SAR), tüm altın türleri (çeyrek/yarım/tam/Cumhuriyet),
  **12 kripto** (CoinGecko, TL güncel+tarihli, anahtarsız), **12 BIST hisse** (Yahoo Finance .IS, TL).
  Toplam ~36 varlık, 4 sınıf (Altın/Döviz/Kripto/Hisse).
- **Mimari:** `AssetClass` enum + AssetType genişletildi (enum=int → migration YOK). `AssetCatalog`
  (CoinGecko id / Yahoo sembol / EVDS seri / truncgil key). `CoinGeckoClient` + `YahooStockClient`.
  MarketDataService `Class()` ile yönlendirir. **Tüm market istemcileri try/catch** → ağ/SSL/parse
  hatası null → graceful 502 (500 çökme yok). JPY 100-birim divisor.
- **Frontend:** kategorili seçici (web gruplanmış dropdown, mobil kategori SegmentedButtons + filtreli
  renkli çip grid), 36 varlık ikon/renk, kripto için akıllı ondalık (q<1→8 hane). i18n 129 anahtar × 5 dil × 2 platform.
- **Doğrulama:** hisse (THYAO 299.75₺, GARAN 129.40₺) yerel canlı test ✅; kripto kaynak Hetzner'dan
  doğrulandı (BTC 2.9M₺) — prod'da çalışır (Mac CoinGecko'ya erişemez, prod erişir). Backend build 0 hata,
  web/mobil tsc+eslint temiz. Prod deploy başarılı.
- **Veri kaynakları (hepsi anahtarsız, prod Hetzner'dan erişilebilir):** EVDS (döviz+aylık altın),
  truncgil (günlük altın), CoinGecko (kripto TL), Yahoo Finance (BIST .IS TL).
- **Sonraki olası:** ABD hisseleri (USD→TL çevrimi), TEFAS fonları, saat-başı, dinamik sembol arama (sınırsız coin/hisse).
- **Doğrulama notu:** EVDS curl ile gerçek veriyle test edildi; yerel canlı e2e (docker/postgres kapalı) yapılmadı —
  ilk `dotnet run`'da migration + "Yatırım" seed otomatik uygulanır, sonra portföy uçtan uca denenebilir.

## 11. Riskler
- EVDS series kod/granülasyon belirsizliği → 6.0 spike ile erken kapat.
- EVDS rate-limit / kesinti → agresif cache + son-iş-günü fallback + job retry.
- Sunucu saat dilimi (cron Europe/Istanbul) → job yanlış saatte çekmesin.
