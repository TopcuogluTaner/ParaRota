# Faz 4 — Raporlama / Export Planı

> İlk Faz 4 paketi. Aylık özet PDF (V1) + işlem listesi Excel (V2). QuestPDF + ClosedXML.
> Hedef: kullanıcının ay sonunda paylaşabileceği rapor + muhasebeciye gönderebileceği raw veri.

## 1. Kapsam (MVP)

| Versiyon | İçerik | Hedef kullanıcı |
|---|---|---|
| **V1** | Aylık özet PDF — gelir/gider/net, kategori dağılımı, top 10 işlem | Kişisel kullanıcı, household sahibi |
| **V2** | İşlem listesi Excel — tarih + kategori + tip filtresi, raw data | Muhasebeci, power user, ihracat |

Defer (sonraki sprint):
- V3 — Multi-month PDF (quarterly, yıllık)
- V4 — Scheduled export (Hangfire — ay başında e-mail)

## 2. Teknik stack kararları

| Konu | Karar | Gerekçe |
|---|---|---|
| PDF library | **QuestPDF** ([questpdf.com](https://www.questpdf.com/)) | MIT, .NET native Fluent API, UTF-8/Türkçe-Arapça sağlam, modern 2024+ seçim. Community license ParaRota için free (revenue <$1M). |
| Excel library | **ClosedXML** | MIT, OpenXML wrapper, formatlı hücre + autofilter + currency formatlama. |
| Streaming | `FileStreamResult` + in-memory MemoryStream | <10 MB için yeterli. Large dataset (>50k tx) Excel için chunked write — V2 sonraki iyileştirme. |
| Auth | `[Authorize]` zorunlu | Sadece authenticated user. |
| Rate limit | `auth-standard` (10/dk) | PDF generate ~50-200ms, abuse koruması. |
| Scope | Plan C uyumlu | Kişisel scope export'unda `SharedWithHouseholdId IS NULL` (çift sayım engeli). |

## 3. Backend mimari

### 3.1 Yeni dosyalar

```
src/Core/ParaRota.Application/
  DTOs/Exports/
    MonthlyPdfRequest.cs        — { Month, Year }
    TransactionsXlsxRequest.cs  — { StartDate, EndDate, CategoryIds?, Types? }
    MonthlyExportSummary.cs     — internal, DB→PDF arası tip
  Services/
    IExportService.cs           — interface

src/External/ParaRota.Persistence/Services/
  ExportService.cs              — IExportService impl, DB query + summary build

src/External/ParaRota.Infrastructure/Reporting/
  PdfReportGenerator.cs         — QuestPDF Fluent template, MonthlyExportSummary → byte[]
  XlsxReportGenerator.cs        — ClosedXML, TransactionListItem[] → byte[]

src/External/ParaRota.Presentation/Controllers/v1/
  ExportsController.cs          — 2 action
```

### 3.2 IExportService

```csharp
public interface IExportService
{
    Task<byte[]> GenerateMonthlyPdfAsync(int userId, MonthlyPdfRequest req, CancellationToken ct);
    Task<byte[]> GenerateTransactionsXlsxAsync(int userId, TransactionsXlsxRequest req, CancellationToken ct);
}
```

### 3.3 ExportService data toplama

`DashboardService.GetSummaryAsync` benzeri — Plan C `txReporting` (kişiselde `SharedWithHouseholdId IS NULL`, household'da `HouseholdId == scope OR SharedWithHouseholdId == scope`) filtresi. Aşağıdaki yapı:

```csharp
internal sealed record MonthlyExportSummary(
    string OwnerDisplayName,       // user veya household adı
    int Month, int Year,
    decimal TotalIncome,
    decimal TotalExpense,
    decimal Net,
    string Currency,               // şimdilik tek currency (default TRY)
    IReadOnlyList<CategoryBreakdown> CategoryBreakdowns,
    IReadOnlyList<TopTransaction> TopTransactions);

internal sealed record CategoryBreakdown(string CategoryName, string Color, decimal Total, double PercentOfExpense);
internal sealed record TopTransaction(DateTime Date, string Category, decimal Amount, TransactionType Type, string? Notes);
```

### 3.4 PDF template (QuestPDF)

```
┌─────────────────────────────────────┐
│  ParaRota                Mayıs 2026 │  ← header (logo + month/year)
│  Aylık Rapor                        │
├─────────────────────────────────────┤
│  Gelir          12,450.00 ₺         │
│  Gider           8,320.00 ₺         │
│  Net           +4,130.00 ₺          │  ← özet kartı
├─────────────────────────────────────┤
│  KATEGORİ DAĞILIMI                  │
│  ▓▓▓▓▓▓▓▓▓▓ Market 35%     2,912 ₺  │
│  ▓▓▓▓▓▓     Faturalar 22% 1,830 ₺   │  ← horizontal bar chart
│  ▓▓▓▓       Ulaşım 18%    1,498 ₺   │
│  ...                                 │
├─────────────────────────────────────┤
│  EN BÜYÜK 10 İŞLEM                  │
│  Tarih    Kategori    Tutar         │
│  03 May   Kira        -4,500 ₺      │  ← tablo
│  ...                                 │
└─────────────────────────────────────┘
Footer: "ParaRota tarafından oluşturuldu · 2026-05-18"
```

Font: QuestPDF default (Lato) yeterli — Türkçe glyph'leri var. Arapça için ek font (Noto Sans Arabic) sonraki iyileştirme.

### 3.5 Excel template (ClosedXML)

Sheet: "İşlemler"

| Tarih | Tip | Kategori | Tutar | Para | Not | Kaynak | İşleyen |
|---|---|---|---|---|---|---|---|
| 2026-05-03 | Gider | Kira | 4,500.00 | TRY | Mayıs kira | Manuel | Ahmet |
| ... |

- Header row: bold + bg color
- Tutar kolonu: currency format (`#,##0.00 [$₺]`)
- Tarih kolonu: ISO date
- Autofilter ON
- Sheet boyutu: column auto-fit, freeze first row

### 3.6 ExportsController

```csharp
[Authorize]
[ApiVersion("1.0")]
[EnableRateLimiting("auth-standard")]
[Route("api/v{version:apiVersion}/exports")]
public class ExportsController(IExportService svc, ICurrentUserService user) : ControllerBase
{
    [HttpPost("monthly-pdf")]
    public async Task<IActionResult> MonthlyPdf([FromBody] MonthlyPdfRequest req, CancellationToken ct)
    {
        if (user.UserId is null) return Unauthorized();
        var bytes = await svc.GenerateMonthlyPdfAsync(user.UserId.Value, req, ct);
        var fileName = $"pararota-{req.Year}-{req.Month:D2}.pdf";
        return File(bytes, "application/pdf", fileName);
    }

    [HttpPost("transactions-xlsx")]
    public async Task<IActionResult> TransactionsXlsx([FromBody] TransactionsXlsxRequest req, CancellationToken ct)
    {
        if (user.UserId is null) return Unauthorized();
        var bytes = await svc.GenerateTransactionsXlsxAsync(user.UserId.Value, req, ct);
        var fileName = $"pararota-transactions-{DateTime.Now:yyyyMMdd-HHmm}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }
}
```

### 3.7 DI register

`Persistence/DependencyInjection.AddPersistence`:
```csharp
services.AddScoped<IExportService, ExportService>();
```

`Infrastructure/DependencyInjection.AddInfrastructure`:
```csharp
services.AddSingleton<PdfReportGenerator>();
services.AddSingleton<XlsxReportGenerator>();
```

(Generator'lar stateless, singleton uygun.)

### 3.8 NuGet paketleri

`ParaRota.Infrastructure.csproj`:
```xml
<PackageReference Include="QuestPDF" Version="2025.1.4" />
<PackageReference Include="ClosedXML" Version="0.105.0" />
```

QuestPDF community license satırı `Program.cs`'e:
```csharp
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
```

## 4. Frontend mimari

### 4.1 Yeni dosyalar

```
src/features/exports/
  api/
    useExports.ts             — useMonthlyPdfMutation, useTransactionsXlsxMutation
  components/
    ExportPanel.tsx           — entry card (Settings veya ExportsPage'den çağrılır)
    MonthlyPdfModal.tsx       — month/year picker + scope indicator + submit
    TransactionsXlsxModal.tsx — date range + category filter + types + scope + submit
  pages/
    ExportsPage.tsx           — sayfa, iki kart (PDF + Excel)
  types/
    exports.ts                — request/response types

src/shared/api/endpoints/exports.ts  — exportsApi.monthlyPdf, transactionsXlsx (blob response)
src/shared/i18n/locales/<lang>/exports.json  — 5 dil
```

### 4.2 Route

`AppRouter.tsx`'e ekle:
```tsx
<Route path="/exports" element={<ExportsPage />} />
```

Sidebar'a `ExportsEntry` (icon `mdi:file-download-outline`).

### 4.3 Download flow (blob → file)

```typescript
const { mutateAsync, isPending } = useMonthlyPdfMutation();

const handleDownload = async () => {
  const blob = await mutateAsync({ month, year });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pararota-${year}-${String(month).padStart(2, '0')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
```

Axios `responseType: 'blob'` zorunlu.

### 4.4 i18n key listesi (5 dil × ~25 key)

```
exports.page_eyebrow                "RAPORLAR"
exports.page_title                  "Dışa Aktar"
exports.page_description            "Verini PDF veya Excel olarak indir."
exports.card_monthlyPdf_title       "Aylık PDF Özeti"
exports.card_monthlyPdf_description "Bir ayın gelir/gider özetini paylaşılabilir PDF olarak"
exports.card_transactionsXlsx_title "İşlem Listesi (Excel)"
exports.card_transactionsXlsx_description "Tarih aralığı + filtreli işlem dökümü"
exports.modal_monthlyPdf_title      "Aylık PDF Oluştur"
exports.modal_xlsx_title            "Excel Dışa Aktar"
exports.field_month                 "Ay"
exports.field_year                  "Yıl"
exports.field_startDate             "Başlangıç tarihi"
exports.field_endDate               "Bitiş tarihi"
exports.field_categories            "Kategoriler"
exports.field_types                 "Tipler"
exports.field_types_income          "Gelir"
exports.field_types_expense         "Gider"
exports.submit_download             "İndir"
exports.toast_pdfReady              "PDF hazırlandı"
exports.toast_xlsxReady             "Excel hazırlandı"
exports.toast_error                 "Rapor oluşturulamadı"
exports.help_monthSelector          "Sadece tamamlanmış kayıtlar dahildir"
exports.help_dateRange              "Maksimum 12 aylık aralık"
exports.help_scope                  "Aktif scope'a göre filtreleme uygulanır"
```

## 5. Plan C uyumu (çift sayım engeli)

Mevcut `DashboardService.GetSummaryAsync` deseni:
```csharp
IQueryable<Transaction> txBase = scope.HasValue
    ? context.Transactions.Where(x => x.HouseholdId == scope.Value || x.SharedWithHouseholdId == scope.Value)
    : context.Transactions.Where(x => x.HouseholdId == null && x.UserId == userId);

// Raporlama için: kişisel scope'ta SharedWithHouseholdId IS NULL filter ek
IQueryable<Transaction> txReporting = scope.HasValue ? txBase : txBase.Where(x => x.SharedWithHouseholdId == null);
```

ExportService **txReporting** kullanır (PDF aggregations + Excel raw export). Bu sayede paylaşılan kayıt:
- Aile pool'unda sayılır (export'ta görünür)
- Kişisel raporda dışlanır (çift sayım yok)

## 6. Risk + dikkat noktaları

| Risk | Etki | Mitigasyon |
|---|---|---|
| PDF generate timeout (>30sn) | UX kötü | Server timeout 30sn, frontend toast.error timeout handler. Large data için future: background job + e-mail. |
| Memory spike (>50k tx Excel) | OOM riski | Şimdilik `Take(50000)` cap; üstünde 400 BadRequest döner. Future: chunked write. |
| QuestPDF license | Lisans ihlali | Program.cs'e `QuestPDF.Settings.License = LicenseType.Community;` (revenue <$1M için). Production'da revenue artarsa Pro license alınır. |
| ClosedXML date timezone | DateTime.Kind=Local issue | Tüm date'leri ISO format string ile yaz (CLAUDE.md DateTime.Now sözleşmesi). |
| Tek currency varsayımı | Multi-currency user'lar için yanlış toplam | V1: tek currency (user'ın default'u, TRY); V2: per-currency sub-total satır. |
| Türkçe karakter font | Bazı eski fontlarda glyph eksik | QuestPDF default Lato Türkçe'yi destekliyor. Arapça için Noto Sans Arabic ek font (defer V3). |

## 7. Test stratejisi

- **PDF**: binary diff zor; PdfPig veya iText kütüphane ile metni parse + grep (kategori adı, tutar string'i içeriyor mu).
- **Excel**: ClosedXML ile cell value read-back doğrulama (hücre A1 "Tarih" header, B2 belirli tx amount).
- **E2E**: Frontend'den manuel test (download tetiklenir mi, dosya açılır mı).

(Integration test infrastructure defer edildi — sonraki sprint.)

## 8. Aşama sırası (önerilen implementasyon sırası)

1. ✅ Plan dosyası (bu dosya)
2. NuGet paketleri (QuestPDF + ClosedXML) + Program.cs license
3. Application DTOs + IExportService interface
4. Persistence ExportService impl (DB query'leri)
5. Infrastructure PdfReportGenerator (QuestPDF template)
6. Infrastructure XlsxReportGenerator (ClosedXML template)
7. Presentation ExportsController (2 action)
8. DI register (Persistence + Infrastructure)
9. Backend dotnet build verify
10. Frontend shared/api/endpoints/exports.ts (axios blob response)
11. Frontend types/exports.ts + i18n × 5 dil
12. Frontend useExports.ts hooks
13. Frontend ExportPanel + 2 modal + ExportsPage
14. Router + sidebar entry
15. Frontend build/tsc/lint/i18n:check verify
16. Manuel e2e test (PDF + Excel indir, dosya aç)
17. PROGRESS.md update + commit + push

## 9. Tahmini effort

| Aşama | Süre |
|---|---|
| NuGet + DI + interface + DTO | ~30 dk |
| ExportService data query | ~45 dk |
| PdfReportGenerator QuestPDF | ~2 saat (template tasarım) |
| XlsxReportGenerator ClosedXML | ~1 saat |
| ExportsController + DI | ~15 dk |
| Backend build + smoke fix | ~30 dk |
| Frontend api/endpoints + types | ~30 dk |
| Frontend i18n × 5 dil | ~45 dk |
| Frontend hooks + modals + page | ~2 saat |
| Router + sidebar entry | ~15 dk |
| Frontend build/lint/i18n verify | ~15 dk |
| Manuel e2e test | ~30 dk |
| PROGRESS.md + commit | ~15 dk |
| **TOPLAM** | **~9-10 saat** |

Bir oturuma sığmayabilir; 2-3 atomik commit halinde paylaştırılır (backend skeleton + frontend foundation + PDF/Excel template + UI).

## 10. Dosya konumu

- Bu plan: `docs/plans/reporting-export-faz4.md`
- İmplementasyon ilerlerken her commit Plan'ın hangi adımı tamamladığını commit mesajında `(Faz 4 / adım N)` ile belirtir.
