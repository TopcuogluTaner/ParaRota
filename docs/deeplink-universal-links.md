# Universal Links / App Links — Davet linki uygulamada açılsın (Option A)

> **Durum (2026-06-07):** Yapılandırma kod tarafında HAZIR ve commit'lendi (`7ee1b42`).
> **BLOKE:** Apple Developer Team ID + Android imza SHA-256 yok (markette uygulama yok henüz).
> Bu iki değer girilip web deploy edilince + standalone build alınınca çalışır.
> **Expo Go'da ÇALIŞMAZ** — sadece gerçek APK/IPA'da.

## Amaç
Aile daveti e-postasındaki link (`https://pararotam.com/accept-invite?token=...`) telefonda
**web yerine uygulamayı** açsın. Uygulama yüklü değilse otomatik web'e düşer (fallback).

## Neden bekliyor
- **Apple Team ID** (10 haneli) ancak **Apple Developer hesabı** olunca var.
- **Android SHA-256 fingerprint** ancak EAS keystore / **Google Play App Signing** olunca kesinleşir.
- Markette uygulama/hesap olmadığı için ikisi de henüz yok → placeholder bırakıldı.

İlgili genel planlar: [`store-launch-plan.md`](./store-launch-plan.md), [`google-mobile-setup.md`](./google-mobile-setup.md)

---

## Şimdiye kadar yapılanlar (commit 7ee1b42)

### 1. `ParaRota.Mobile/app.json`
- iOS: `ios.associatedDomains: ["applinks:pararotam.com"]`
- Android: `android.intentFilters` → `VIEW` + `autoVerify:true`, `https://pararotam.com/accept-invite` (`BROWSABLE`,`DEFAULT`)

### 2. `ParaRota.Web/public/.well-known/`
- `apple-app-site-association` (uzantısız) — `appIDs: ["TEAMID.com.pararotam.mobile"]`, path `/accept-invite`
- `assetlinks.json` — `package_name: com.pararotam.mobile`, `sha256_cert_fingerprints: ["REPLACE_WITH_SHA256_FINGERPRINT"]`
- Cloudflare Pages `public/`'i dist köküne kopyalar → `https://pararotam.com/.well-known/...` servis edilir.

### 3. `ParaRota.Web/public/_headers`
- `/.well-known/apple-app-site-association` ve `assetlinks.json` için `Content-Type: application/json`.

Uygulama tarafı zaten hazır: `scheme: "pararota"`, route `app/(app)/accept-invite.tsx`, bundle/package
`com.pararotam.mobile`.

---

## Geri dönünce yapılacaklar (checklist)

- [ ] **Apple Team ID** al → `apple-app-site-association` içindeki `TEAMID`'i değiştir.
      Yer: developer.apple.com → Membership → Team ID, veya `cd ParaRota.Mobile && eas credentials` (iOS).
      Sonuç: `"appIDs": ["ABCDE12345.com.pararotam.mobile"]`
- [ ] **Android SHA-256** al → `assetlinks.json` içindeki `REPLACE_WITH_SHA256_FINGERPRINT`'i değiştir.
      Yer: `eas credentials` → Android → Keystore → SHA-256.
      Play App Signing varsa: Play Console → Setup → App integrity → App signing key → SHA-256.
      **En sağlamı:** hem upload key hem Play app-signing fingerprint'ini diziye ekle (iki eleman).
- [ ] **Backend env:** `App__WebBaseUrl=https://pararotam.com` (sonda `/` yok, `www` yok).
      `www` kullanılıyorsa app.json'a `applinks:www.pararotam.com` + intentFilter host'unu da ekle.
- [ ] **Web deploy** + doğrula (tarayıcıda aç, JSON dönmeli, HTTPS, yönlendirmesiz):
      - `https://pararotam.com/.well-known/apple-app-site-association`
      - `https://pararotam.com/.well-known/assetlinks.json`
- [ ] **Standalone build** al (EAS veya local Gradle) — Expo Go DEĞİL — ve cihaza kur.
- [ ] **Test:**
      - iOS: linke dokun → app açılır (iOS AASA'yı cache'ler; gerekirse uygulamayı yeniden kur).
      - Android: `adb shell pm get-app-links com.pararotam.mobile` → domain `verified` olmalı.

## Notlar / tuzaklar
- AASA dosyası **uzantısız** olmalı ve `application/json` servis edilmeli (yukarıda `_headers` ile çözüldü).
- iOS Universal Links'i agresif cache'ler — değişiklikten sonra uygulamayı silip yeniden kur.
- Android `autoVerify`, build/kurulum anında `assetlinks.json`'a erişebilmeli → önce web deploy, sonra build.
- Link host'u (pararotam.com) ile `associatedDomains`/`intentFilters` host'u **birebir** aynı olmalı.

## Köprü (opsiyonel, app henüz markette değilken)
Web `/accept-invite` sayfasına **"Uygulamada Aç"** butonu eklenebilir → `pararota://accept-invite?token=...`
şemasını dener, açılmazsa web'de devam / mağazaya yönlendirir. (Universal Links olgunlaşana kadar köprü.)
