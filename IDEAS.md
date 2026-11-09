# ParaRota — Fikir & Özellik Envanteri

Bu dosya **eski ParaRota.Web frontend'inden** çıkarılmış tüm kavramsal fikirleri, özellikleri ve UI/UX
detaylarını içerir. Sıfırdan yeni frontend kurulurken referans olarak kullanılacak. Burada **kod
parçaları değil, fikirler** vardır — neyi koruyacağız, neyi atacağız, neyi geliştireceğiz.

---

## 1. Ana Konsept

**Para Rota**, kullanıcıların finansal hedeflerine ulaşması için kişisel bir **finansal yol haritası**
sunan kişisel finans yönetimi uygulamasıdır.

Ana sloganlar:
- "Finansal Yol Haritası" — kullanıcıyı bir amaca odaklayan rota metaforu
- Hızlı gelir/gider kaydı
- Sabit (mecburi) ve değişken (anlık) harcamaların ayrımı
- Düzenli/tekrarlayan ödemelerin otomatik yönetimi

---

## 2. Modüller (eski frontend'de var olan tüm modüller)

### 2.1 Auth (Kimlik Doğrulama) — KORUNACAK
- Register (kayıt) + e-posta doğrulama (6 haneli kod, 15 dk ömür)
- Login (JWT access + refresh token)
- Forgot Password / Reset Password (token üzerinden)
- Change Password (oturum içi)
- Verify Email (kayıt sonrası mecburi)
- "Beni hatırla" davranışı, token cookie'de
- Login sayfasında glassmorphism + finans temalı SVG illüstrasyon (RotaDraw)
- Rol bazlı erişim (Admin/User)

### 2.2 Dashboard / Ana Sayfa — KORUNACAK, GENİŞLETİLECEK
**Mevcut widget'lar (drag & drop ile özelleştirilebilir):**
- `WelcomeBanner` — kullanıcıya selam, hızlı eylem
- `MonthlySummaryCards` — bu ay: toplam gelir, gider, net bakiye
- `IncomeExpenseChart` — son N ayın gelir/gider trendi (ApexCharts)
- `RecentTransactions` — son hareketler listesi
- `BudgetStatusWidget` — bütçe durumu özet
- `FinancialGoalCard` — hedef ilerlemesi

**UX özellikleri:**
- Edit Mode: widget'lar yeniden sıralanabilir (@dnd-kit/sortable)
- Widget gizleme/gösterme (kullanıcı bazlı persist)
- Widget genişlik seçimi: full / 7-kolon / 5-kolon
- Tüm widget'lar gizliyse boş durum ekranı
- Lazy loaded customizer drawer

**Yeniden tasarımda eklenecek:**
- "Bu ay maaşın geldi mi?" hatırlatması (recurring planned → tıkla onayla)
- Yaklaşan ödemeler widget'ı (önümüzdeki 7 gün)
- Kategori bazlı harcama dağılımı (donut chart)
- Tasarruf oranı göstergesi (gelir - gider) / gelir

### 2.3 Hareketler (Income/Expense/Recurring) — YENİDEN TASARLANACAK
Şu an `IncomeExpensePage` altında **3 ayrı sekme** var: Gelirler / Giderler / Tekrarlar. **Yeni tasarımda
hepsi tek "Hareketler" sayfasında** birleşecek, type/nature filtresiyle ayrışacak.

**Korunacak fikirler:**
- **Hızlı Kayıt (Quick Entry)** — sağ alt FAB → modal → tutar + kategori + tip ile saniyede kayıt
- **Fatura/Fiş Tarama (ReceiptScanModal)** — fotoğraf yükle → OCR ile tutar/tarih/satıcı çıkar → onayla → Transaction
- **Dönem Filtresi (PeriodFilter)** — yıl + ay seçici, "tüm zamanlar" opsiyonu
- **Özet Kartlar (SummaryCards)** — toplam gelir, toplam gider, net bakiye, tekrar eden tutar
- **Badge bileşenleri:**
  - `TypeBadge` (Gelir/Gider rengi: yeşil/kırmızı)
  - `NatureBadge` (Sabit/Değişken)
  - `StatusBadge` (Planlı/Tamamlandı)
- **Dışa Aktarma** — CSV ve Excel formatlarında transaction export
- **Tekrarlayan Hareket** kuralları:
  - Frequency: Günlük / Haftalık / Aylık / Yıllık
  - StartDate + EndDate (opsiyonel)
  - AutoApprove flag — true ise direkt Completed, false ise Planned olarak üretilir
  - IsActive toggle (durdurmadan kuralı koruyabilme)
- **Sayfalama (Pagination)** — meta ile total/page/pageSize
- **Receipt Photo URL** — Transaction'a fatura fotoğrafı ekleyebilme
- **Asset bağlama** — bir transaction belirli bir varlığa (USD, EUR, altın) bağlanabilir, kur o anki değerle kilitlenir

**Yeniden tasarımda netleşecek:**
- "Maaş gir" / "Fatura ödedim" / "Market alışverişi" gibi shortcut akışlar
- Inline edit (grid içinde hızlı tutar değiştirme)
- Çoklu seçim + toplu işaretleme (planlı → tamamlandı)

### 2.4 Kategoriler — YENİDEN TASARLANACAK
**Eski tasarım:** Sadece Admin altında (`/Admin/Categories`) yönetiliyor — kullanıcı kendi kategorisini ekleyemiyor.

**Korunacak:**
- CategoryType: Income / Expense (iki ayrı kategori dünyası)
- Iconify icon seçimi (`mdi:cash`, `mdi:food`, vs.)
- Renk seçimi (kategoriye özel)

**Yeni tasarımda:**
- **Kullanıcı kendi kategorisini ekleyebilmeli** (Admin değil)
- Sistem-default kategoriler seed edilir (Maaş, Bonus, Fatura, Market, Ulaşım, Eğlence, Sağlık, Kira, Borç Ödeme, Tasarruf)
- Sistem kategorisi silinemez (IsSystem flag), sadece gizlenebilir
- Kategori bazlı renk + ikon (grafiklerde kullanılacak)

### 2.5 Bütçe (Budget) — KORUNACAK, FAZ 2
**Fikir:** Belirli bir ay+yıl için kategori bazlı harcama limiti koy, kullanım durumunu canlı izle.

**Korunacak özellikler:**
- Aylık bütçe (year + month + categoryId + amount)
- `warningThreshold` (uyarı yüzdesi, varsayılan %80)
- BudgetStatus hesaplama:
  - `spentAmount` (o ay o kategoride yapılan harcama)
  - `remainingAmount`
  - `usagePercentage`
  - `alertLevel`: 1=Normal, 2=Warning (eşiği geçti), 3=Exceeded (bütçeyi aştı)
- Bütçe durumu widget'ı ana sayfaya
- Bütçe aşımı bildirimi (in-app)

**Eklenebilir:**
- Önceki ayın bütçesini bu aya kopyalama
- Otomatik bütçe önerisi (son 3 ayın ortalamasına göre)

### 2.6 Hedefler (Goals) — KORUNACAK, FAZ 2
**Fikir:** Kullanıcı bir hedef koyar ("Tatil — 30.000 TL"), tasarrufunu o hedefe doğru izler.

**Korunacak:**
- `GoalDto`: name, description, targetAmount, currentAmount, targetDate, priority, status
- **Priority:** 1=Low, 2=Medium, 3=High
- **Status:** 1=Active, 2=Completed, 3=Cancelled, 4=Paused
- ProgressPercentage (0-100) hesaplama
- RemainingAmount hesaplama
- **İlerleme barı renk kodu:**
  - %0-50 → kırmızı (geriden)
  - %50-80 → sarı (yolda)
  - %80-100 → yeşil (yaklaştı/tamamlandı)
- Tamamlanan hedefte özel badge/görsel vurgusu
- Hedef detay sayfası (`GoalDetailPage`)
- Durum güncelleme (Active → Paused/Completed/Cancelled)
- Mevcut tutar güncelleme (manuel artırım)

**Eklenebilir:**
- Hedef için otomatik aylık tasarruf önerisi (kalan miktar / kalan ay)
- Bir Transaction'ı bir hedefe bağlama (bu hedef için tasarruf ettim)
- "Rota" görselleştirmesi: hedef tarihine kadar yol haritası (zaman çizelgesi)

### 2.7 Borçlar (Debts) — FAZ 3'E ERTELE
**Fikir:** Kredi kartı, bireysel kredi, konut/taşıt/öğrenim kredisi gibi borçları takip et + ödeme planı oluştur.

**Korunacak fikirler:**
- **Debt Types:** CreditCard, PersonalLoan, Mortgage, CarLoan, StudentLoan, Other (her biri farklı renk)
- Alanlar: name, lenderName, totalAmount, remainingBalance, interestRate, delayInterestRate, minimumPayment, dueDay
- **Yasal minimum ödeme oranı** (legalMinimumPaymentRate) — Türkiye'de kredi kartları için
- Ödeme geçmişi (DebtPayment): her ödeme bir transaction'a bağlanabilir
- **isOverdue** (vadesi geçti) flag
- **monthlyInterestAmount** (aylık faiz tutarı) hesaplama
- **DebtSummary:** toplam borç, kalan, ödenmiş, aylık faiz, gecikmiş borç sayısı

**Payoff Plan (Ödeme Planı):**
- **Snowball:** önce en küçük borç (motivasyon)
- **Avalanche:** önce en yüksek faizli borç (matematiksel optimal)
- `monthlyExtraBudget` (minimum ödemenin üzerine eklenecek miktar)
- Çıktı: ay ay ödeme tablosu, kaç ayda biteceği, toplam ödenecek faiz, "borçsuz tarih"
- **Karşılaştırma:** Snowball vs Avalanche → ne kadar faiz tasarrufu

**Önemli:** Borç ödemesi bir Transaction olarak kaydedilebilmeli (linkToExpense flag).

### 2.8 Portföy / Varlıklar / Döviz — FAZ 4'E ERTELE (en sona)
Bu modüller kişisel finans çekirdeğinden bağımsız bir "yatırım takibi" dünyası. MVP'de yok.

**Korunacak fikirler (gelecek için):**

#### Asset (Varlık)
- code (USD, EUR, GAU, BTC), name, assetType (FX/Crypto/Precious Metal/Stock)
- tcmbCode (TCMB API entegrasyonu için)
- coinGeckoId (kripto için)
- decimalPlaces (görsel formatlama)

#### ExchangeRate (Kur)
- Source: 1=TCMB, 2=CoinGecko, 3=Manual
- buyRate, sellRate, midRate
- fetchedAt timestamp
- Manuel kur girişi (admin)
- Otomatik fetch endpoint'i (TCMB / CoinGecko)
- BIST/TCMB altın fiyatı çekme

#### Portfolio (Portföy)
- Her varlık için: amount, totalCostTRY, averageCostTRY
- Anlık değerleme: currentMidRate, currentValueTRY
- Kar/Zarar: profitLossTRY, profitLossPercent
- Alım (Buy) ve Satım (Sell) işlemleri ile portföy güncelleme
- Toplam portföy değeri + toplam kar/zarar
- Multi-currency görüntüleme (display currency seçimi)
- Portföy dağılımı grafiği (PortfolioChart)
- Buy/Sell modal

### 2.9 Profil / Ayarlar — KORUNACAK, BASIT
- ViewProfile: kullanıcı bilgileri görüntüleme/düzenleme
- SettingsPage: tema, dil, para birimi tercihi
- ChangePassword

### 2.10 Admin Paneli — KORUNACAK MA KÜÇÜLT
- AdminPage (kullanıcı listesi vb.)
- AdminExchangeRates (manuel kur girişi, fetch tetikleme)
- AdminCategories (sistem default kategorilerini yönetme)
- AdminAssets (varlık tanımları)

**Yeni tasarımda:** Admin sadece sistem-wide şeyler için (kategoriler, asset tanımları, kur tetikleme).
Kullanıcı kendi kategorisini, hedefini, transaction'ını kendi yönetir.

### 2.11 SİLİNECEKLER (eski projeden kalıntı, finansla alakasız)
Eski Navbar'da listelenen ama bu projenin amacıyla **hiç ilgisi olmayan** sayfalar — yeni projeye taşınmayacak:
- RemoteWork (Uzaktan Çalışma)
- MailPage (Maillerim)
- CongratulationSpecialDay (Özel Gün Kutlamaları)
- AnnouncementsPage (Duyurular)
- SpecialDay (Özel Günler)
- Leave (İzinlerim)
- Balance (Bakiyelerim — HR bakiyesi, finans değil)
- Equipment (Ekipmanlarım)
- ApplicationsPage
- DocumentsPage
- Puantaj (mesai takibi)

Bunlar başka bir HR projesi şablonundan miras kalmış.

---

## 3. UI/UX Desenleri (Korunacak)

### Tema
- MUI v7 (Material UI)
- Dark / Light mode (localStorage persist)
- Inter font family
- Glassmorphism: modal ve kartlarda `backdropFilter: blur()` + yarı şeffaf arka plan
- Hardcoded renk yok, hep theme color (`primary.main`, `success.main`, vs.)

### Bileşenler
- **AGrid** (AG Grid Community wrapper): tablolar için tek standart — toolbar, arama, export, Türkçe lokalizasyon
- **GridColumnFactory:** kolon tipleri (string, dateTime, boolean, nested, status)
- **ActionRenderer:** satır eylemleri (düzenle/sil/önizle/ekle)
- **FormBuilder:** generic form (text, number, autocomplete, date, radio, checkbox, textarea); showCondition/disabled koşullu alanlar
- **ZoomModal:** draggable + büyütülebilir + pop-out destekli modal (MUI Dialog yerine standart) — glassmorphism
- **DeleteModal:** silme onay diyalogu
- **RenderInWindow:** yeni pencerede render

### Bildirim
- **SweetAlert2** sarmalayıcı (`SweetAlert.success/error/warning/fromApi`)
- **react-hot-toast** (kısa anlık bildirimler için)
- `useApiHandler` mutasyon yanıtlarında otomatik SweetAlert; `silent: true` ile bastırılabilir

### Animasyon
- `motion` (framer-motion) — sayfa geçişleri, kart girişleri
- Keyframes: slideUp, borderPulse (edit mode), Fade, Zoom

---

## 4. Teknik Patternler (Korunacak)

### State
- **Zustand** store'lar:
  - `useAuthStore` — token, user, refresh logic, role check
  - `useConfigStore` — runtime config (baseUrl from `appsettings.json`)
  - `useThemeStore` — dark/light persist
  - `useDashboardStore` — widget layout persist

### API
- `useApiHandler<T>(endpoint, primaryKey)` — generic CRUD hook
- `runWithAuthRetry` pattern — 401'de otomatik refresh + retry
- `ApiResponse<T>` standardı: `{ isSuccess, data, message }`
- Singleton refresh token promise (race condition önler)

### Routing
- React Router DOM v7
- `ProtectedRoute` (auth guard)
- `AccessGuard` (role guard)
- Public routes: /Login, /Register, /VerifyEmail, /ForgotPassword, /ResetPassword

### Lokalizasyon
- i18next + react-i18next + browser language detector
- Arayüz dili Türkçe (varsayılan), İngilizce opsiyonel
- Kod İngilizce, UI string Türkçe

### Config
- `public/appsettings.json` runtime config
- `Environment: "TEST" | "PROD"` ile ortam bazlı API URL seçimi

---

## 5. Yeni Frontend Önceliği (sıralı)

**Faz 0:** Auth + tema + layout + i18n + routing iskeleti
**Faz 1 (MVP):**
1. Hareketler sayfası (unified, type/nature/status filtreli)
2. Kategoriler (kullanıcı yönetebilir)
3. Tekrarlayan hareket kuralları (basit listeleme + CRUD)
4. Dashboard (4 widget: summary, chart, recent transactions, upcoming)
5. Hızlı Kayıt FAB

**Faz 2:** Budget + Goals
**Faz 3:** Debts (+ Payoff Plan) + Receipt OCR
**Faz 4:** Portfolio + Assets + ExchangeRates + Admin paneli

---

## 6. Açık Sorular (yeni frontend kurulurken karar verilecek)

- **Tablo kütüphanesi:** AG Grid devam mı, yoksa MUI DataGrid mi? (AG Grid daha güçlü ama lisans/bundle ağır)
- **Grafik:** ApexCharts devam mı, Recharts mı?
- **Para birimi:** MVP sadece TRY mi, multi-currency baştan mı?
- **OCR:** Tesseract.js (client-side, ücretsiz) vs OpenAI Vision API (server-side, ücretli ama doğru)?
- **Mobil:** React Native ayrı repo mu yoksa Capacitor/PWA mı?
- **Test:** Vitest + React Testing Library baştan eklenecek mi?
