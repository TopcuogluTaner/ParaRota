# ParaRota — Yol Haritası

> Bu dokümaN [IDEAS.md](./IDEAS.md) üzerine inşa edilmiş **yürütme planı**dır.
> IDEAS = "neyi koruyacağız". Bu dokümaN = "hangi sırayla, nasıl, hangi kararlarla yapacağız".

Son güncelleme: 2026-05-17

---

## 1. Şu an nerede duruyoruz?

### 1.1 ParaRota.Web (frontend) — büyük ölçüde hazır, backend bekliyor

| Alan | Durum | Not |
|---|---|---|
| Auth sayfaları | ✅ | Login/Register/Verify/Forgot/Reset — 5 dilde, RTL Arapça dahil |
| Auth store (Zustand) | ✅ | JWT cookie, refresh logic, fetchUser |
| Dashboard widget'ları | ✅ | WelcomeBanner, MonthlySummaryCards, IncomeExpenseChart, CategoryDonutChart, UpcomingPayments, RecentTransactions, GoalProgressCard, BudgetStatusWidget |
| Feature sayfaları | ✅ (UI) | Transactions, Categories, Budgets, Goals, Debts, Profile, Settings — mock data ile çalışıyor |
| Chrome | ✅ | Sidebar + Topbar + UserMenu + LanguageSwitcher + QuickEntryModal |
| Theme | ✅ | Cartographic Finance, dark/light, MUI v7, Fraunces + Geist |
| i18n | ✅ | TR / EN / AR (RTL) / ES / DE — 6 namespace; mock veri dil değişiminde in-place çevriliyor |
| API client v0 | ✅ | TanStack Query + DTOs + feature hooks (henüz pages mock'ta) |
| Test altyapısı | ⛔ | Vitest + RTL kurulmadı |
| Mobile responsive | ⚠️ | Desktop-first; mobilde test edilmedi |

### 1.2 ParaRota.Backend — sadece auth var

| Alan | Durum |
|---|---|
| Clean Architecture iskeleti (Domain/Application/Infrastructure/Persistence/Presentation/WebApi) | ✅ |
| ASP.NET Identity tabanlı auth (Login/Register/VerifyEmail/Forgot/Reset) | ✅ |
| docker-compose (PostgreSQL) | ✅ |
| Unit test projesi (boş çekirdek) | ✅ |
| Categories / Transactions / Budgets / Goals / Debts CRUD | ⛔ |
| Dashboard summary endpoint | ⛔ |
| Recurring transaction job | ⛔ |
| Receipt OCR / Asset / Portfolio | ⛔ |

---

## 2. IDEAS.md eleştirisi

### 2.1 IDEAS'taki sıralama eleştirisi
- **Faz 1 MVP fazla geniş.** IDEAS Faz 1'i: Hareketler + Kategoriler + Recurring + Dashboard + Hızlı Kayıt. 5 ana iş; gerçekçi değil. Bizim revize Faz 1 bölüm 3'te.
- **Recurring "Faz 1" değil ama olmadan ürün boş hissettirir.** Faz 1.5'e koyduk — Faz 1 biter bitmez recurring rule entity'sini ekliyoruz.

### 2.2 IDEAS'ta eksik / eklenmesi gereken konseptler

| Konsept | Açıklama | Niye |
|---|---|---|
| `currency` (Transaction) | Default TRY, ama kolon **şimdiden** schema'da. Conversion logic Faz 4. | Sonradan eklemek migration acısı. |
| `paidVia` (Transaction) | Nakit / Banka kartı / Kredi kartı / Havale / EFT. | "Kartla mı nakit mi" kullanıcının ilk sorduğu şey. Borç entegrasyonu için kritik. |
| `householdId` (ileride) | Aile/ortak hesap için user_id → household_id geçişine hazırlık. | TR'de aile bütçesi yaygın. Faz 4'te aktif olsa bile schema şimdiden hazır olsun. |
| Bildirim merkezi (gerçek) | Topbar bell gerçek bildirim çeksin: budget ihlali, recurring planned hatırlatma, hedef milestone. | Şu an mock. "Bütçeyi aştın" canlı uyarı çekirdek değer. |
| Audit log | Kim ne zaman ne değiştirdi. Soft-delete dahil. | Finansal güven; "ben mi sildim, neydi?" |
| PWA + offline-first | LocalStorage queue + sync. Service worker. | Mobilde internet olmayabilir; kayıt boşa gitmesin. |
| Toplu içe aktarma (CSV/bank statement) | İlk kullanımda 3 ayın hareketini yükleyebilme. | Onboarding'in en zor adımı. |
| Kategori bazlı vergi alanı | Freelance gelirinde KDV/Stopaj. | Net hesabı doğru gelsin. |
| Goal funding akışı | Transaction yaratırken "şu hedefe ekle" → goal.current artar. | IDEAS belirsiz; somut akış lazım. |

### 2.3 IDEAS'tan değiştirdiğimiz / silmek istediğimiz şeyler

| Konu | Karar | Sebep |
|---|---|---|
| AG Grid | ❌ Vazgeçildi | Bundle ağır (~200kb), ParaRota tek kullanıcı + yüzlerce satır seviyesi. **MUI DataGrid Community** yeterli. |
| ApexCharts | ❌ Vazgeçildi | Zaten `@mui/x-charts` kullanılıyor; tema entegrasyonu en iyi. |
| AGrid wrapper | ❌ Yazılmayacak | MUI DataGrid'in toolbar'ı + export'u zaten var. |
| FormBuilder generic component | ⚠️ Erteleniyor | Şu an her form özel; ileride pattern oturursa yazılır. Prematür abstraction. |
| RenderInWindow | ❌ Silindi | Use case yok. |
| Drag & drop dashboard customizer | ⏸ Faz 2 | MVP'de yok. 1 hafta iş, ölçülebilir kullanıcı değeri düşük. |

---

## 3. Revize Faz Planı

### Faz 1 — MVP Çekirdek (1-2 hafta)
**Hedef:** Kullanıcı kategori + hareket girip dashboard'da görebilsin. **Multi-currency UI baştan açık.**

**Backend:**
1. `Category` entity + CRUD + DTO + validator
   - Kolonlar: `name`, `iconKey` (iconify ikonu, ör. `mdi:home`), `emoji` (opsiyonel kullanıcı override), `color`, `type` (income/expense), `isSystem`, `userId`, `householdId` (nullable, Faz 2 aktivasyonu için)
   - Seed: sistem kategorileri (Maaş, Bonus, Kira, Faturalar, Market, Ulaşım, Yeme-İçme, Eğlence, Sağlık, Abonelikler, Borç Ödeme) — varsayılan iconify ikon, emoji boş
2. `Transaction` entity + CRUD + filter/pagination + DTO + validator
   - Kolonlar: `categoryId`, `amount`, `currency` (3-harf kod, default 'TRY'), `paidVia` (cash/debitCard/creditCard/transfer/eft), `date`, `type`, `nature`, `status`, `note`, `recurring` (sadece flag — kurallar Faz 1.5), `userId`, `householdId` (nullable)
3. `DashboardSummary` endpoint
   - Per-currency breakdown: TRY total + diğer para birimleri ayrı liste (Faz 4'e kadar conversion yok)
   - monthlyTrend (her ay TRY karşılığı; multi-currency desteği Faz 4)
   - topExpensesByCategory, recentTransactions, upcomingPayments
4. EF migration + database update
5. Seed runner: sistem kategorileri ilk request'te user için kopyalanır VEYA system-wide olarak okunur — karar Faz 1'de verilecek

**Frontend:**
6. Vitest + RTL kur, smoke test bir component için
7. Dashboard'u mock'tan `useDashboardSummaryQuery`'e geçir
   - Per-currency totals: TRY ana, diğer currency'ler "+ $X" gibi ek satır
8. TransactionsPage'i `useTransactionsQuery`'e geçir
9. CategoriesPage'i `useCategoriesQuery`'e geçir
   - Emoji override input (boş bırakılırsa iconify ikonu, doluysa emoji öne çıkar)
10. QuickEntryModal `useCreateTransaction` mutation'ı çağırsın
11. **Currency input** (Autocomplete: TRY/USD/EUR/GBP + Intl.NumberFormat ile format)
12. **`paidVia` segment buton** (5 ödeme yöntemi ikonu)

### Faz 1.5 — Recurring + Bütçe (1 hafta)
12. `RecurringRule` entity (frequency, startDate, endDate, autoApprove, isActive)
13. Background job: günlük cron → kurala göre Transaction üret (autoApprove=false ise Planned)
14. UI: RecurringRules sayfası (basit list + CRUD)
15. `Budget` entity + CRUD + status hesaplama (spent/remaining/usage/alertLevel)
16. BudgetsPage'i API'ye bağla

### Faz 2 — Hedefler + Bildirim merkezi + Household (2-3 hafta)
17. `Goal` entity + CRUD + status enum (active/completed/paused)
18. Goal funding akışı: Transaction yaratırken "şu hedefe katkı" seçimi → `goal.current` artar
19. GoalsPage'i API'ye bağla
20. **Notification entity** + tetikleme: budget exceed/warn, recurring planned reminder, goal milestone
21. Topbar bell gerçek `useNotificationsQuery`'e bağlansın
22. SignalR / Server-Sent Events ile push (opsiyonel — polling de yeterli MVP+)
23. Dashboard drag & drop customizer (@dnd-kit/sortable)
24. CSV/Excel export (Transactions sayfasında buton)
25. **Household / Aile hesabı (aktif feature):**
    - `Household` entity (id, name, ownerUserId, createdAt)
    - `HouseholdMember` (userId, householdId, role: owner/admin/member, joinedAt, status: invited/active)
    - **E-posta davet sistemi** (token, 7 gün ömür)
    - Kullanıcı bir household'a katılınca: kategori/transaction/budget/goal ortak (Faz 1'de eklenen `householdId` kolonu aktif olur)
    - Settings sayfasına "Aile" tab: üye yönetimi, davet gönder, çık
    - UI'da "Bu kayıt kim tarafından eklendi" göstergesi (transaction satırında küçük avatar)

### Faz 3 — Borçlar + OCR + Mobile (2-3 hafta)
25. `Debt` entity + CRUD + payment history
26. Payoff Plan: Snowball / Avalanche karşılaştırma; aylık tablo üret
27. Debt → Transaction linkleme (ödeme yapınca otomatik gider kaydı)
28. **Receipt OCR**: OpenAI Vision API entegrasyonu (Tesseract.js Türkçe fiş tanımada zayıf)
29. ReceiptScanModal: fotoğraf yükle → tutar/tarih/satıcı çıkar → onayla → Transaction
30. PWA: service worker + manifest + offline queue
31. Mobile responsive sweep: tüm sayfaları telefonda test et

### Faz 4 — Portföy + Admin + İleri Düzey (3-4 hafta)
32. `Asset` entity (USD/EUR/GAU/BTC/stock) + TCMB/CoinGecko fetch endpoint'leri
33. `ExchangeRate` entity + cron job
34. `Portfolio` entity + Buy/Sell işlemleri + kar/zarar hesabı
35. Transaction'a asset linkleme (kur o anki değerle kilitlenir)
36. Multi-currency dashboard (display currency seçimi)
37. Admin paneli: sistem kategorileri yönetimi, asset tanımları, kur tetikleme
38. Toplu içe aktarma: CSV bank statement parse
39. Audit log entity + UI
40. Aile/Household: user_id → householdId migration

---

## 4. Açık sorulara verilen kararlar

| Soru | Karar | Sebep |
|---|---|---|
| Tablo kütüphanesi | **MUI DataGrid Community** | AG Grid bundle ağır, ParaRota ölçeği için aşırı. |
| Grafik | **`@mui/x-charts`** (zaten kullanılıyor) | Tema entegrasyonu en iyi, ekstra paket gereksiz. |
| Para birimi | **Schema'da kolon başta, conversion Faz 4** | Sonradan eklemek migration acısı. |
| OCR | **Faz 3, OpenAI Vision API** | Tesseract Türkçe fiş zayıf; Vision doğru ama Faz 3'e kadar bekleyebilir. |
| Mobil | **PWA + responsive Faz 3'te**, Capacitor wrap Faz 4'te | RN ayrı repo şu an aşırı. |
| Test | **Vitest + RTL Faz 1 başında** | Geriye dönük yazmak 3x pahalı. Smoke testler yeter. |
| Server state | **TanStack Query** (Faz 1 öncesi kuruldu ✅) | Cache + invalidation + devtools standart. |
| DTO senkronu | **Elle, Faz 1'de paralel** | Swagger auto-gen 30+ endpoint olunca eklenir. |

---

## 5. Karar verilen noktalar (2026-05-17)

- **Household:** Aktif feature, **Faz 2'ye** çekildi. Faz 1'de tüm tablolara `householdId` kolonu nullable olarak eklenecek (Faz 2'de aktive edilir; migration acısı yok).
- **Kategori emoji:** Sistem kategorisi seed'inde varsayılan iconify ikonu var, kullanıcı isterse `emoji` field'ı ile üzerine yazabilir.
- **Para birimi:** **Multi schema + multi UI baştan.** Faz 1'de bile USD/EUR/GBP transaction girilebilir. Conversion (FX rates) Faz 4'te.

## 6. Hâlâ karar verilmemiş noktalar

- **Bildirim push** — SignalR mi yeterli, polling mi başlasın? (Polling daha kolay, SignalR Faz 2.5'te eklensin önerim.)
- **Mobile native** — Capacitor wrap mı, ayrı React Native mi? (Capacitor öneriyorum, kod paylaşımı %95.)
