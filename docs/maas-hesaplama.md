# Maaş Hesaplama (Brüt → Net) — özellik notu

Türkiye resmi brüt→net maaş hesabı. **Faz 1 TAMAMLANDI ve canlıda**, Faz 2 bekliyor.

## Durum
- ✅ **Faz 1 — Hesap motoru + "Maaş Hesaplama" ekranı** (2026-06-05): backend resmi kümülatif hesap + mobil ekran. Canlı + doğrulanmış.
- ⏳ **Faz 2 — Gelire entegrasyon** (BAŞLANMADI): gelir girişine Brüt/Net toggle; tekrarlayan maaş kuralı her ay o ayın kümülatif netini üretsin.

## Tasarım kararı (kullanıcıyla)
- **Tam resmi** hesap istendi (verginet.net/maas-hesaplama.aspx gibi) — kümülatif gelir vergisi dahil. Basit oran/sabit net REDDEDİLDİ.
- Net, kümülatif vergi nedeniyle yıl içinde değişir: üst dilime geçince düşer, Temmuz asgari ücret istisnası artışıyla bir miktar toparlar.

## 2026 resmi parametreler (kaynak: cottgroup, kolayik, alomaliye)
- SGK işçi payı **%14**, işsizlik **%1**, damga **%0,759 (binde 7,59)**
- SGK taban **33.030** / tavan **297.270** TL
- Asgari ücret: brüt **33.030**, net **28.075,50**
- Gelir vergisi dilimleri (kümülatif matrah): 0–190.000 **%15** · 190.001–400.000 **%20** · 400.001–1.500.000 **%27** · 1.500.001–5.300.000 **%35** · 5.300.001+ **%40**
- Asgari ücret istisnası (aylık): gelir vergisi Oca-Haz 4.211,33 / Tem-Ara 5.615,10; damga 250,70 (tüm yıl)

## Hesap yöntemi (verginet ile birebir)
1. SGK %14 + işsizlik %1 (brüt üzerinden, tavanla sınırlı)
2. Matrah = brüt − SGK − işsizlik, **Ocak'tan kümülatif biriker**
3. Kümülatif matraha dilimler → bu ayın gelir vergisi = (bu aya kadar kümülatif vergi) − (geçen aya kadar)
4. Asgari ücret istisnası = min ücret matrahına AYNI kümülatif mantıkla hesaplanır (Oca-Haz/Tem-Ara farkı otomatik çıkar, hardcode yok); istisna kendi vergisini aşamaz
5. Damga = brüt×%0,759 − 250,70 (min, 0'ın altına inmez)
6. **Net = brüt − SGK − işsizlik − gelir vergisi − damga**

## Doğrulama (canlı test edildi)
- Asgari ücret 33.030 → Ocak net **28.075,50** ✓ (resmi değerle birebir)
- Brüt 100.000 → Ocak **75.953,03**, Haziran **65.753,03** (dip), Aralık **67.156,80**, yıllık net **833.881,63**

## Kod yerleri
**Backend:**
- `ParaRota.Application/Services/IPayrollService.cs` — arayüz (`ComputeYear`, `SupportedYears`)
- `ParaRota.Application/DTOs/Payroll/PayrollResultDto.cs` — `PayrollResultDto` + `PayrollMonthDto`
- `ParaRota.Infrastructure/Payroll/TurkishPayrollService.cs` — **hesap motoru + yıl parametreleri** (⚠️ her yıl buraya yeni `YearParams` ekle)
- `ParaRota.Presentation/Controllers/v1/PayrollController.cs` — `GET /api/v1/payroll/gross-to-net?gross=X&year=2026` + `/payroll/years`
- DI: `Infrastructure/DependencyInjection.cs` içinde `AddSingleton<IPayrollService, TurkishPayrollService>`

**Mobil:**
- `src/shared/api/types/payroll.ts`, `src/shared/api/endpoints/payroll.ts`
- `src/features/payroll/api/usePayroll.ts` — `usePayrollQuery(gross, year)`
- `src/features/payroll/pages/PayrollCalculatorScreen.tsx` — ekran
- `app/(app)/payroll.tsx` (route) + `(app)/_layout.tsx` Drawer.Screen kaydı
- More menüsü girişi: `src/features/settings/pages/MoreScreen.tsx`
- i18n: yeni `payroll` namespace × 5 dil (`locales/*/payroll.json`) + `i18n/index.ts`'e kayıtlı; menü etiketi `navigation.payroll`

## Faz 2 planı (KALAN)
- Gelir formuna (TransactionFormModal + RecurringRuleFormModal) **Brüt/Net** toggle.
- Brüt seçilince:
  - **Tekrarlayan maaş:** brüt'ü sakla; motor üretim sırasında o ayın **kümülatif netini** hesaplasın (ay-ay değişen tutar). `ComputeMonth(brüt, yıl, ay)` metodu eklenecek.
  - **Tek seferlik:** standart yıl varsayımıyla o ayın neti.
- Brüt + kırılımı işlem notunda/metadata'da saklamak (raporda "brüt: X, net: Y").
- Olası eklemeler: ekranda yıl seçimi (şimdilik sabit 2026), işe başlama ayı (`startMonth` paramı backend'de hazır), engelli indirimi/BES/teşvik (v2 profil).
