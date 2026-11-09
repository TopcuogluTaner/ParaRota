# ParaRota — App Store & Google Play yayın planı

Durum: backend canlı (api.pararotam.com), web canlı (pararotam.com), mobil EAS kuruldu,
auth (parola + Google) + çekirdek modüller + 5 dil + Liquid Glass tasarım hazır.
Bu doküman yayına kadar kalan TÜM işleri listeler. **🤖 = kod (Claude), 🧑 = kullanıcı (hesap/panel/içerik).**

---

## FAZ A — Zorunlu kod engelleri (bunlar olmadan mağaza RED eder)

### A1. Hesap silme (in-app) — ✅ TAMAMLANDI (2026-06-04)
Her iki mağaza zorunlu kılıyor. **CANLI:** `DELETE /auth/account` (hard-delete, FK-güvenli,
tüm veri + Identity user). Mobil Profil → "Hesabımı sil" (ConfirmDialog) + web ProfilePage danger
kartı. i18n × 5. Canlı test: kullanıcı + tüm veri → 0. (Aile sahipliği edge: 409 ile devir/sil iste.)
- 🤖 Backend: `DELETE /api/v1/auth/account` (authenticated). Kullanıcı + tüm verisi: transactions, budgets, goals, debts, recurring, categories (non-system), investments, device tokens, refresh tokens, notifications. Sahip olunan **household** için: tek üyeyse sil; başka üye varsa sahipliği devret ya da engelle + mesaj. Parola/`SİL` teyidi. Soft-delete yerine **gerçek/anonimize silme** (KVKK/GDPR).
- 🤖 Mobil: Ayarlar → "Hesabımı sil" → ConfirmDialog (parola gir / "SİL" yaz) → endpoint → logout.
- 🤖 Web: Ayarlar'da aynı akış.
- 🤖 i18n × 5 + `errorCode`.

### A2. Apple ile Giriş — ✅ KOD TAMAM (2026-06-04) · 🧑 capability + build kaldı
**CANLI backend:** `/auth/apple` (Apple JWKS doğrulama, aud=com.pararotam.mobile, graceful 401).
Mobil iOS native Apple butonu (login ekranı, Expo Go'da güvenli gizli). 🧑 KALAN: Apple Developer
App ID'de "Sign in with Apple" capability (EAS build genelde otomatik ekler) + dev/prod build'de test.
App Store kuralı 4.8: Google varsa **zorunlu**.
- 🧑 Apple Developer → App ID'de **"Sign in with Apple" capability** aç.
- 🤖 Backend: `/api/v1/auth/apple` — identity token'ı Apple JWKS ile doğrula (iss=appleid.apple.com, aud=bundle id `com.pararotam.mobile`), sub/email al, `AspNetUserLogins("Apple")` bul/oluştur, IssueTokens. (Google ile aynı desen; isim yalnız ilk girişte gelir → client iletir.)
- 🤖 Mobil: `expo-apple-authentication` (iOS-only buton), `app.json ios.usesAppleSignIn: true` + config plugin. Dev/prod build gerekir.
- 🤖 AppleAuthSettings (izinli aud) + i18n.

### A3. Gizlilik Politikası + Kullanım Şartları — ✅ TAMAMLANDI (2026-06-04)
**CANLI:** https://pararotam.com/privacy + /terms (TR+EN, dil-duyarlı, public). Web LoginPage
footer + mobil Profil "Yasal" bölümü link veriyor. Mağaza listelemesinde bu URL kullanılacak.
🧑 KALAN: metni gözden geçir/hukuk onayı (içerik taslak; iletişim info@pararotam.com).
İkisi de **Privacy Policy URL** zorunlu (finans + e-posta + Google/Apple verisi).
- 🤖 Web: `/privacy` + `/terms` sayfaları (TR + EN). İçerik: toplanan veri (e-posta, ad, finansal kayıtlar, Google/Apple ID), kullanım, saklama (Hetzner AB), 3. taraflar (Google, Apple, Resend, Gemini OCR, Cloudflare), saklama süresi, silme hakkı, iletişim, KVKK/GDPR.
- 🤖 Mobil + web: Ayarlar + auth ekranlarında link.
- 🧑 Metni hukukçuya/danışmana okut (bu hukuki tavsiye değil).

### A4. Mobil Google girişi — prod doğrulama — 🧑 + 🤖
- 🧑 Android SHA-1 yayıldı mı kontrol, iOS/Android **dev build**'de Google girişini test et.
- 🤖 Sorun çıkarsa düzelt (backend audience ID'leri zaten ekli).

---

## FAZ B — Production push notifications — 🧑 + 🤖
- 🧑/🤖 iOS: `eas credentials` → APNs key (EAS Apple hesabından üretir).
- 🧑 Android: Firebase projesi → **FCM v1** → `google-services.json` + EAS'e FCM kimliği.
- 🤖 `app.json` push config (gerekirse), prod build'de uçtan uca push testi.

---

## FAZ C — Production build & mağaza hesapları
### C1. Apple — 🧑 + 🤖
- 🧑 App Store Connect → uygulama kaydı (bundle `com.pararotam.mobile`, ad "ParaRota", kategori **Finance**).
- 🤖 `eas build --profile production --platform ios`.
- 🤖/🧑 `eas submit` veya manuel yükleme → **TestFlight** beta → sonra inceleme.

### C2. Google — 🧑 + 🤖
- 🧑 **Google Play Console** hesabı aç ($25 tek sefer).
- 🧑 Uygulama oluştur (kategori Finance).
- 🤖 `eas build --profile production --platform android` (AAB).
- 🤖/🧑 `eas submit` / yükle → **Internal testing** → sonra production.

---

## FAZ D — Mağaza listeleme içerikleri — 🧑 (🤖 metin/copy yardımı)
- 🤖 Uygulama adı, alt başlık, **açıklama (TR + EN)**, anahtar kelimeler — taslak.
- 🧑 **Ekran görüntüleri**: iPhone 6.7" + 6.5"; (app.json `supportsTablet:true` → **iPad ekran görüntüsü de gerekir**; istemiyorsak 🤖 false yapar). Android telefon (+ tablet).
- 🧑 Play **feature graphic** (1024×500). İkon ✓.
- 🧑 Destek URL'i + pazarlama URL'i (pararotam.com).
- 🧑 **Yaş derecesi anketi** (her iki mağaza) — finans, içerik yok → 4+/Everyone.
- 🧑 **Veri beyanı**: Play "Data Safety" formu + App Store "Privacy Labels" — topladığımız veriyi beyan et (A3 ile uyumlu).

---

## FAZ E — Uyum / hukuk
- A1 (silme) + A3 (politika) KVKK/GDPR'ı büyük ölçüde karşılar.
- Veri taşınabilirliği: **Export (PDF/Excel) zaten var** ✓ (GDPR artısı).
- 🧑 "Lisanslı finansal danışman değildir" tarzı kısa sorumluluk reddi (tracker olduğu için hafif).

---

## FAZ F — Yayın öncesi QA — 🧑 + 🤖
- 🤖/🧑 Prod build'de tam regresyon (iki platform): auth (parola/Google/Apple), tüm modüller, push, export, aile davet (e-posta + deep link), OCR.
- 🧑 Dark/light × 5 dil × RTL (Arapça) gözden geçirme.
- 🤖 (opsiyonel) Sentry ile crash izleme.

---

## FAZ H — Monetizasyon (v1.1, ilk yayından SONRA) — 🤖 + 🧑
**Karar (2026-06-04):** v1.0 ÜCRETSİZ çıkar; ödeme v1.1'de. Model: **abonelik (aylık + yıllık)**.
**Premium kapsam:** Yatırım/portföy + Aile/household + Fiş tarama(OCR)/raporlar. Ücretsiz çekirdek:
gelir-gider + temel bütçe + hedefler.
- ⚠️ **Zorunlu:** dijital özellik → **Google Play Billing + Apple IAP** (kendi ödeme/Stripe YASAK). Komisyon %15→%30.
- 🤖 **RevenueCat** SDK (tek SDK, iki mağaza, entitlement). Dev build gerekir.
- 🧑 Play Console + App Store Connect'te abonelik ürünleri tanımla (aylık/yıllık + opsiyonel deneme).
- 🤖 Backend: `user.IsPremium` + RevenueCat webhook + premium uçlarda guard (yatırım/aile/OCR-export).
- 🤖 Uygulama: paywall ekranı + premium özelliklerde kilit/"Premium'a geç" yönlendirmesi.

## FAZ G — Yayın sonrası / altyapı — 🧑 + 🤖
- 🧑 Uptime/monitoring (UptimeRobot vb.), 🧑 günlük yedek doğrulaması (cron var).
- 🤖 (opsiyonel) EAS Update / OTA ile hotfix yeteneği.

---

## Önerilen sıra
1. **A1 hesap silme** (🤖, hızlı, iki mağaza için de şart)
2. **A3 gizlilik + şartlar** (🤖 taslak; URL listeye gerekli)
3. **A2 Apple Sign In** (🤖 + 🧑 capability)
4. **A4 + B** Google/Apple/push prod doğrulama (build sonrası)
5. **C** production build + hesaplar
6. **D + E** listeleme + veri beyanları + yaş derecesi
7. **F** QA → **submit** → inceleme → yayın

**Tahmin:** A1–A3 birkaç oturumluk kod; build + listeleme + inceleme süreci (Apple inceleme ~1-3 gün) ile birlikte gerçekçi olarak ~1-2 hafta.
