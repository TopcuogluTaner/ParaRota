# ParaRota — Paywall & Abonelik (Premium) Planı

> Durum: **KOD YAZILDI (backend + mobil + web).** Kalan: mağaza/servis kurulumu + gerçek anahtarlar + EAS build + uçtan uca sandbox test.
> Tarih: 2026-06-09

## ✅ Uygulanan (kod tarafı — 3 commit)

**Backend** (`a97f55e`):
- `UserSubscription` entity + `SubscriptionStatus`/`SubscriptionStore` enum + EF config (unique UserId) + DbSet.
- `AppUser.TrialEndsAt`; migration `AddSubscriptionsAndTrial` + mevcut kullanıcı backfill (`max(createdDate, 2026-06-09)+30g`). Yeni kayıt/Google/Apple `TrialEndsAt` set eder.
- `ISubscriptionService`/`SubscriptionService`: `GetPremiumStatusAsync` (abonelik OR deneme), `ApplyWebhookAsync` (idempotent upsert, event→status map, eski olay atlama), `ExpireOverdueAsync`.
- `/auth/me` (`UserDto`) → `IsPremium/IsInTrial/PremiumExpiresAt/TrialEndsAt/Plan`.
- `WebhooksController` `POST /api/v1/webhooks/revenuecat` (`[AllowAnonymous]`, Authorization secret fixed-time check).
- `RequirePremiumAttribute` → `403 PREMIUM_REQUIRED`; Investments (class), Receipts `scan`, Households `create`/`invite`.
- `ErrorCodes.PremiumRequired` + 5 dil `errors.json` (web+mobil). Hangfire `subscriptions-expire-check` (02:20). `appsettings` RevenueCat+Stripe; `deploy/SECRETS.md`.

**Mobil** (`e1ae394`): `react-native-purchases`; `src/features/subscription/` (purchases.ts graceful wrapper, useEntitlement, usePaywallStore, PremiumGate, PaywallSheet). `_layout` configure+PurchasesBridge(logIn/logOut)+PaywallSheet mount. Gate: Yatırımlar+Aile route, Fiş tarama aksiyonları. AuthUser premium alanları, app.json `revenueCatIosKey/AndroidKey`, `paywall.json` 5 dil. tsc temiz.

**Web** (`a3a9fd0`): `@revenuecat/purchases-js`; `src/features/subscription/` (purchases.ts, useEntitlement, usePaywallStore, PaywallDialog, PremiumGate). App.tsx configure (App User ID=backend userId), MainLayout PaywallDialog mount. Gate: /investments + /household route, QuickActionDock Fiş Okut. `RevenueCatWebKey` (appsettings + config store). `paywall.json` 5 dil. tsc + vite build + i18n:check temiz.

**Mobil UI revizyonu** (2026-06-09): Paywall modal → **tam ekran route** (`/(app)/paywall`). Sebep: Paper Portal'ları mount sırasına göre üst üste biniyordu; root'ta mount edilen PaywallSheet, okutma/QuickEntry modallarının ALTINDA kalıyordu. `usePaywallStore`+`PaywallSheet` silindi → `openPaywall(feature)` (lib/paywallNav, router.push) + `PaywallScreen` (hero + özellik listesi + plan kartları). Modal içinden tetiklenen paywall'larda önce modal kapatılır (Portal'lar route'ların üstünde kalır). **Yeni karşılama akışı**: ilk üyelik/girişte `/welcome` (TrialWelcomeScreen, (app) grubunun DIŞINDA) → "30 Gün Ücretsiz Başla" / "Premium ile Devam Et" seçimi; seçim yapılmadan `(app)`'a girilmez (onboarding slaytları da bekler → bindirme yok). Görünürlük: `isInTrial && plan∉{monthly,yearly}` + kullanıcı bazlı AsyncStorage (`pararota.trialWelcomeSeen.<id>`); abonelik alanlar/deneme bitenler görmez. `paywall.json` `welcome.*` 5 dil. NOT: Web'de karşılama ekranı henüz YOK (yalnız mobil).

## ⏳ Kalan (kod DIŞI — kullanıcı aksiyonu)
1. **RevenueCat dashboard**: project, `premium` entitlement, Offerings (Aylık/Yıllık), App Store+Play+Web Billing(Stripe) bağlantıları, webhook URL (`https://api.pararotam.com/api/v1/webhooks/revenuecat`) + Authorization secret.
2. **Secret'ları gir**: prod env `RevenueCat__WebhookAuthHeader`; mobil `app.json` `revenueCatIosKey/AndroidKey`; web `public/appsettings.json` `RevenueCatWebKey`.
3. **App Store Connect / Play Console**: auto-renewable subscription (Aylık ₺99,99 / Yıllık ₺799,99), store deneme OFFER'ı YOK.
4. **Stripe**: ürün/fiyatlar + RevenueCat Web Billing.
5. **Mobil**: `npx expo prebuild` + yeni dev/EAS build (native modül için; Expo Go'da paywall pasif).
6. **Yasal**: `pararotam.com/terms` + `/privacy` + auto-renew açıklaması.
7. **Test**: sandbox satın alma, restore, sil-yükle, cross-device, web↔mobil tutarlılık, `403 PREMIUM_REQUIRED`.

---

## (Aşağısı orijinal plan)

## Context (neden / hedef)
ParaRota'da bazı özellikleri ücretli yapıp **freemium abonelik** modeline geçeceğiz. Şu an kod tabanında **hiç** ödeme/abonelik altyapısı yok (ne mobil, ne web, ne backend). Hedef:
- iOS + Android + Web'de **tutarlı** premium erişimi (kullanıcı nereden satın alırsa alsın her yerde geçerli).
- Apple/Google'ın katı kuralları: dijital abonelikte **kendi IAP'leri zorunlu**; dış ödeme mobilde RED sebebi.
- En kritik endişe: **"ödeme aldık, kullanıcı uygulamayı sildi, tekrar yükledi → abonelik kaldığı yerden devam etmeli"** ve başka cihazda giriş yapınca da geçerli olmalı.

### Çözümün özü
**RevenueCat = tek entitlement kaynağı** (`premium` entitlement). Altında platform başına ödeme rayı:

| Platform | Ödeme rayı | SDK |
|---|---|---|
| iOS | Apple IAP (StoreKit) | `react-native-purchases` |
| Android | Google Play Billing | `react-native-purchases` |
| Web | Stripe (RevenueCat **Web Billing**) | `@revenuecat/purchases-js` |

**Sil/yükle & cihaz senkronu nasıl çözülür:** Girişte `Purchases.logIn(<bizim userId>)` çağrılır → RevenueCat App User ID = bizim backend kullanıcı ID'miz. Abonelik store hesabına (Apple ID/Google) + bizim hesabımıza bağlandığı için: yeniden kurulum → `restorePurchases()` veya otomatik; başka cihaz/web → aynı hesapla giriş → entitlement gelir. **Backend, RevenueCat webhook'u ile gerçeğin kaydını tutar; `/auth/me` premium durumunu döner; premium uçlar sunucuda da korunur (UI'a güvenmeyiz).**

## Kesinleşen kararlar
- **Altyapı:** RevenueCat.
- **Premium özellikler (3):** (1) Yatırımlar/Portföy, (2) Fiş tarama (OCR), (3) Aile/household.
- **Free kalan ana kancalar:** İşlemler, bütçeler, hedefler, dashboard, kategoriler, tekrarlayanlar, **dışa aktarma**, **maaş hesaplama** — hepsi SINIRSIZ (adet limiti yok).
- **Erişim modeli:** **Herkese (yeni + mevcut) 30 gün TÜM özellikler ücretsiz (uygulama-yönetimli deneme), sonra sadece 3 premium özellik kilitlenir.** Kalıcı limitli free tier YOK; grandfathering YOK (ayrım yok).
- **30 gün başlangıcı:** Yeni kullanıcı = kayıt tarihinden; mevcut kullanıcı = paywall lansman tarihinden +30g.
- **Fiyat:** **₺99,99 aylık / ₺799,99 yıllık** (yıllık ≈ ₺66,7/ay, ~%33 indirim).
- **Store ekstra denemesi YOK** (uygulama 30g veriyor; abone olunca direkt ödeme).
- **Paywall UI:** RevenueCat hazır template (sonra custom'a geçilebilir).
- **Kapsam:** Mobil + Web, tutarlı.

---

## Mimari — Entitlement akışı
```
Satın alma (App Store / Play / Stripe)
        │
        ▼
   RevenueCat  ──(server webhook: app_user_id, entitlement, expiry)──▶  Backend /webhooks/revenuecat
        │                                                                   │ upsert UserSubscription
        ▼ (SDK customerInfo, anında UX)                                     ▼
  Mobil/Web istemci  ◀────────  /auth/me { isPremium, ... }  ◀───────────── DB (gerçeğin kaydı)
        │
        ▼ Gate: UI premium kilidi + Paywall
Backend premium uçları: [RequirePremium] (sunucu tarafı zorunlu doğrulama)
```
- **İstemci anlık UX** için RevenueCat SDK `customerInfo.entitlements.active["premium"]` (satın almadan hemen sonra).
- **Yetkili kaynak (gate kararı)** backend `/auth/me`'dir; webhook ile güncellenir. İkisi birleşir.

---

## 1) Backend (ParaRota.Backend)

### 1.1 Yeni entity + trial alanı
- `Domain/Entities/UserSubscription.cs` (`BaseEntity`, kullanıcı başına tek satır/upsert):
  `UserId`, `Status` (None/Active/InTrial/GracePeriod/Expired/Cancelled), `Store` (app_store/play_store/stripe), `ProductId`, `EntitlementId="premium"`, `PeriodType`, `ExpiresAt`, `WillRenew`, `RcAppUserId`, `OriginalTransactionId`, `LastEventAt`.
- `Persistence/Configurations/UserSubscriptionConfiguration.cs` — `ToTable("UserSubscriptions")`, unique index `UserId`, index `ExpiresAt`.
- `Domain/Enums/SubscriptionStatus.cs`, `SubscriptionStore.cs`.
- **30 günlük uygulama denemesi:** `AppUser`'a `TrialEndsAt DateTime?`. Yeni kayıtta `TrialEndsAt = createdAt + 30g`. Mevcut kullanıcılar için tek seferlik backfill: `TrialEndsAt = max(createdDate, <paywallLaunchDate>) + 30g`.
- Migration: `dotnet ef migrations add AddUserSubscriptions ...` ve `AddUserTrialEndsAt ...`
- **Premium kararı:** `IsPremium = (UserSubscription aktif) OR (TrialEndsAt > DateTime.Now)`. (Rol KULLANMAYIZ — roller permission içindir.)

### 1.2 `/auth/me` genişletmesi
- `DTOs/Auth/UserDto.cs` → `bool IsPremium`, `DateTime? PremiumExpiresAt`, `bool IsInTrial`, `DateTime? TrialEndsAt`, `string? Plan`.
- `Features/AuthFeatures/Queries/GetCurrentUser/GetCurrentUserQueryHandler.cs` → `UserSubscription` + `TrialEndsAt`'tan premium alanlarını doldur.
- Mobil `auth.types.ts` + web `AuthUser`'a aynı alanlar.

### 1.3 RevenueCat webhook
- `Presentation/Controllers/v1/WebhooksController.cs` → `POST /api/v1/webhooks/revenuecat`, `[AllowAnonymous]`, `[EnableRateLimiting("api-general")]`.
- **Doğrulama:** `Authorization` header == config secret (RevenueCat dashboard). Eşleşmezse 401.
- `app_user_id` → bizim `UserId`; event türüne göre (INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE, PRODUCT_CHANGE) `UserSubscription` upsert.
- `ISubscriptionService` + `Persistence/Services/SubscriptionService.cs`: `ApplyWebhookAsync`, `GetForUserAsync`.

### 1.4 Sunucu tarafı premium zorunluluğu (kritik — güvenlik)
UI gizlemek YETMEZ; premium uçlar API'de de korunmalı.
- `WebApi/Filters/RequirePremiumAttribute.cs` (veya servis içi kontrol): premium değilse `403 + errorCode: PREMIUM_REQUIRED`.
- Uçlar:
  - **InvestmentsController** (tüm yazma + okuma) → premium.
  - **ReceiptsController** `scan` → premium (Gemini maliyeti de var).
  - **HouseholdController** create/invite → premium.
  - **Çift taraflı premium kuralı (2026-06-12):** Aile özelliği davet eden VE davet edilen için ayrı ayrı premium gerektirir. `accept-invite` + tüm aile yönetim uçları (`GetById/Update/GetMembers/GetPendingInvites/CancelInvite/ResendInvite/RemoveMember/UpdateMemberRole/TransferOwnership`) `[RequirePremium]`. İstisnalar: `GetMine` premium'suz kullanıcıya **boş liste** döner (eski istemciler 403'e düşmesin), `Leave` açık kalır (premium'u biten üye aileden ayrılabilsin). Veri katmanında `HouseholdScope.ResolveActiveScopeAsync`/`IsActiveMemberAsync` premium-aware: premium'u biten üye otomatik kişisel scope'a düşer (üyelik silinmez, askıya alınır). Mobil/web: `accept-invite` route'u `PremiumGate feature="household"` ile sarılı; `useMyHouseholdsQuery` premium değilken istek atmaz (`enabled: isPremium`).
  - Bu uçlar trial içinde (30 gün) açıktır; trial bitince + abonelik yoksa kilitlenir.
  - **Adet limiti YOK:** Trial sonrası işlem/bütçe/hedef/tekrarlayan SINIRSIZ kalır; sadece 3 özellik kilitlenir.
- `ErrorCodes.cs`'e `PREMIUM_REQUIRED` + 5 dile `errors.json` (web+mobil) çevirisi.

### 1.5 Hangfire job (güvenlik ağı)
- `Program.cs`'e `subscriptions-expire-check` (02:20): webhook kaçarsa süresi geçmişleri Expired'a düşür. Per-job try/catch zorunlu.

### 1.6 Secret'lar
- `appsettings.json`'a boş `RevenueCat` (`WebhookAuthHeader`, `ProjectApiKey`) + `Stripe` section. Dev: user-secrets; Prod: `/opt/pararotam/.env` (`RevenueCat__WebhookAuthHeader=...`). `deploy/SECRETS.md` güncelle.

---

## 2) Mobil (ParaRota.Mobile) — bare Expo, dev client gerekir

### 2.1 SDK kurulumu
- `npx expo install react-native-purchases react-native-purchases-ui` → `npx expo prebuild` → yeni **dev client + EAS build** (Expo Go ile çalışmaz).

### 2.2 Başlatma & hesap bağlama
- `Purchases.configure({ apiKey })` + giriş sonrası `Purchases.logIn(String(user.id))`, logout'ta `Purchases.logOut()`.
- `src/features/subscription/`: `lib/purchases.ts` (configure/login/logout/getOfferings/purchase/restore), `store/useEntitlement.ts`.

### 2.3 Entitlement & gate
- `useEntitlement()`: **otorite = `/auth/me` isPremium**; satın alma sonrası anlık için RC `customerInfo` ile birleştir; satın alma/restore sonrası `queryClient.invalidateQueries(['auth','me'])`.
- `<PremiumGate feature="...">` + `usePaywall()`: kilitli ekran/aksiyona girişte Paywall modal.
- Gate noktaları: Yatırımlar ekranı, Fiş tarama aksiyonu, Aile ekranı.

### 2.4 Paywall UI
- **RevenueCat hazır template** (`react-native-purchases-ui`). Aylık ₺99,99 / Yıllık ₺799,99. Apple zorunlu: **"Satın alımları geri yükle"** + abonelik şartları/EULA/gizlilik linkleri. Store ekstra denemesi yok.

### 2.5 i18n
- Yeni `paywall.json` namespace (5 dil) → `src/shared/i18n/index.ts`. Plan adları, özellik listesi, "Deneme bitişine N gün", CTA, restore, hata mesajları.

---

## 3) Web (ParaRota.Web)
- **RevenueCat Web Billing** (`@revenuecat/purchases-js`) + Stripe. Aynı `premium` entitlement, App User ID = backend userId → mobil ile **tam tutarlı**.
- Login sonrası `Purchases.configure` + identify(userId). Paywall sayfası (`features/subscription/`), Aylık ₺99,99 / Yıllık ₺799,99.
- Gate: aynı `/auth/me isPremium` ile Yatırımlar/Fiş/Aile ekranlarını kilitle.
- **Apple anti-steering notu:** iOS uygulamasının İÇİNDEN web ödemesine yönlendirme YAPMA (RED riski). Web'den alınmış aboneliği iOS'ta **onurlandırmak serbesttir** (entitlement zaten gelir).

---

## 4) Mağaza & servis kurulumu (kod dışı, paralel)
1. **App Store Connect:** Auto-renewable subscription group + Aylık (₺99,99) & Yıllık (₺799,99). Free trial OFFER yok (deneme uygulamadan 30g).
2. **Play Console:** Subscription + Aylık/Yıllık base plans (free trial offer yok).
3. **RevenueCat dashboard:** Project, `premium` entitlement, Offerings (Aylık/Yıllık), App Store + Play + **Web Billing(Stripe)** bağlantıları, **webhook URL + Authorization secret** (= backend config).
4. **Stripe:** Hesap + ürün/fiyatlar (₺99,99/₺799,99), RevenueCat Web Billing entegrasyonu.
5. **Yasal:** Abonelik şartları + güncel Gizlilik (`pararotam.com/privacy`) + EULA; auto-renew açıklaması (Apple zorunlu).

---

## 5) Önerilen faz sırası
1. **Backend temel** (entity, TrialEndsAt, /auth/me, webhook, RequirePremium, ErrorCodes) — önkoşul.
2. **RevenueCat + mağaza ürünleri + Stripe** kurulumu (kod dışı, 1 ile paralel).
3. **Mobil** SDK + gate + paywall + yeni dev/EAS build.
4. **Web** Stripe/Web Billing + gate + paywall.
5. **Hangfire job + test** (sandbox satın alma, restore, sil-yükle, cross-device, web↔mobil tutarlılık).

---

## Doğrulama (uçtan uca test)
- **30g uygulama denemesi:** Yeni hesap → 30 gün premium açık; `TrialEndsAt` geçmişe çekilince kilitlenir, paywall çıkar.
- **Sandbox satın alma:** iOS sandbox + Android license tester ile Aylık ₺99,99 / Yıllık ₺799,99 al → SDK entitlement → `/auth/me isPremium=true` (webhook) → premium ekranlar açılır.
- **Sil/yükle:** Kaldır → tekrar kur → giriş → `restorePurchases()`/otomatik → premium devam.
- **Cross-device & web↔mobil:** Web'de Stripe ile al → mobilde aynı hesapla giriş → premium aktif (ve tersi).
- **Sunucu gate:** Premium olmayan token ile `GET /investments`, `POST /receipts/scan`, household create → `403 PREMIUM_REQUIRED`.
- **İptal/expiry:** İptal → webhook → süre sonunda `isPremium=false`, kilitlenir; Hangfire kaçağı yakalar.
- **i18n:** 5 dilde paywall + hata mesajları parity.
- Backend `dotnet build` + migration; mobil yeni dev client; web `npm run build`.
