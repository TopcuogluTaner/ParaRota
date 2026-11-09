using ClosedXML.Excel;
using ParaRota.Application.Services.Reporting;

namespace ParaRota.Infrastructure.Reporting;

/// <summary>
/// ClosedXML ile işlem listesi Excel üretir. Stateless singleton.
/// İki sayfa: "İşlemler" (başlık + özet şerit + stilli tablo) ve
/// "Kategori Özeti" (data-bar grafikli kategori dağılımı).
/// </summary>
public sealed class XlsxReportGenerator : IXlsxReportGenerator
{
    private const string ColorHeader = "#1E3A5F";
    private const string ColorIncome = "#0F8B6C";
    private const string ColorExpense = "#B0341E";
    private const string ColorMuted = "#7B8794";
    private const string ColorBorder = "#D8E0E8";
    private const string ColorZebra = "#F4F7FA";
    private const string ColorPanel = "#EEF3F8";

    public byte[] RenderTransactions(IReadOnlyList<TransactionRow> rows)
    {
        ArgumentNullException.ThrowIfNull(rows);

        using var wb = new XLWorkbook();
        BuildTransactionsSheet(wb, rows);
        BuildCategorySheet(wb, rows);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    // ── İşlemler sayfası ───────────────────────────────────────────────────
    private static void BuildTransactionsSheet(XLWorkbook wb, IReadOnlyList<TransactionRow> rows)
    {
        var ws = wb.AddWorksheet("İşlemler");
        const int cols = 8;

        var income = rows.Where(r => r.Type == "Gelir").Sum(r => r.Amount);
        var expense = rows.Where(r => r.Type == "Gider").Sum(r => r.Amount);
        var net = income - expense;
        var moneyFmt = MoneyFormat(rows);

        // Başlık şeridi
        ws.Range(1, 1, 1, cols).Merge();
        ws.Cell(1, 1).Value = "ParaRotam — İşlem Raporu";
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 16;
        ws.Cell(1, 1).Style.Font.FontColor = XLColor.White;
        ws.Cell(1, 1).Style.Fill.BackgroundColor = XLColor.FromHtml(ColorHeader);
        ws.Cell(1, 1).Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        ws.Cell(1, 1).Style.Alignment.Indent = 1;
        ws.Row(1).Height = 30;

        ws.Range(2, 1, 2, cols).Merge();
        var minD = rows.Count > 0 ? rows.Min(r => r.Date) : DateTime.Now;
        var maxD = rows.Count > 0 ? rows.Max(r => r.Date) : DateTime.Now;
        ws.Cell(2, 1).Value = $"{minD:dd.MM.yyyy} – {maxD:dd.MM.yyyy}   ·   {rows.Count} işlem   ·   Oluşturma: {DateTime.Now:dd.MM.yyyy HH:mm}";
        ws.Cell(2, 1).Style.Font.FontColor = XLColor.FromHtml(ColorMuted);
        ws.Cell(2, 1).Style.Font.FontSize = 9;
        ws.Cell(2, 1).Style.Alignment.Indent = 1;
        ws.Row(2).Height = 18;

        // Özet şeridi (rows 4-7) — panel zeminli
        ws.Range(4, 1, 7, 2).Style.Fill.BackgroundColor = XLColor.FromHtml(ColorPanel);
        SummaryRow(ws, 4, "Toplam Gelir", income, moneyFmt, ColorIncome, bold: false);
        SummaryRow(ws, 5, "Toplam Gider", expense, moneyFmt, ColorExpense, bold: false);
        SummaryRow(ws, 6, "Net", net, moneyFmt, net >= 0 ? ColorIncome : ColorExpense, bold: true);
        ws.Cell(7, 1).Value = "İşlem Sayısı";
        ws.Cell(7, 1).Style.Font.FontColor = XLColor.FromHtml(ColorMuted);
        ws.Cell(7, 1).Style.Font.Bold = true;
        ws.Cell(7, 1).Style.Alignment.Indent = 1;
        ws.Cell(7, 2).Value = rows.Count;

        // Tablo başlığı (row 9)
        const int hr = 9;
        var headers = new[] { "Tarih", "Tip", "Kategori", "Tutar", "Para Birimi", "Not", "Kaynak", "İşleyen" };
        for (var i = 0; i < headers.Length; i++)
            ws.Cell(hr, i + 1).Value = headers[i];
        var headerRange = ws.Range(hr, 1, hr, cols);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromHtml(ColorHeader);
        headerRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        ws.Row(hr).Height = 20;

        // Veri
        var firstData = hr + 1;
        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var r = firstData + i;
            ws.Cell(r, 1).Value = row.Date;
            ws.Cell(r, 2).Value = row.Type;
            ws.Cell(r, 3).Value = row.Category;
            ws.Cell(r, 4).Value = row.Amount;
            ws.Cell(r, 5).Value = row.Currency;
            ws.Cell(r, 6).Value = row.Notes ?? string.Empty;
            ws.Cell(r, 7).Value = row.Source;
            ws.Cell(r, 8).Value = row.CreatedByName ?? string.Empty;
            if (i % 2 == 1)
                ws.Range(r, 1, r, cols).Style.Fill.BackgroundColor = XLColor.FromHtml(ColorZebra);
        }

        var lastData = firstData + rows.Count - 1;
        if (rows.Count > 0)
        {
            ws.Range(firstData, 1, lastData, 1).Style.DateFormat.Format = "dd.mm.yyyy";
            var amountRange = ws.Range(firstData, 4, lastData, 4);
            amountRange.Style.NumberFormat.Format = moneyFmt;
            amountRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
            amountRange.Style.Font.Bold = true;

            var typeRange = ws.Range(firstData, 2, lastData, 2);
            typeRange.AddConditionalFormat().WhenEquals("\"Gelir\"").Font.SetFontColor(XLColor.FromHtml(ColorIncome));
            typeRange.AddConditionalFormat().WhenEquals("\"Gider\"").Font.SetFontColor(XLColor.FromHtml(ColorExpense));

            // Satır alt kenarlıkları (ince)
            var body = ws.Range(firstData, 1, lastData, cols);
            body.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
            body.Style.Border.BottomBorderColor = XLColor.FromHtml(ColorBorder);
        }

        // Tablo davranışı
        ws.Range(hr, 1, Math.Max(lastData, hr), cols).SetAutoFilter();
        ws.SheetView.FreezeRows(hr);
        ws.Columns().AdjustToContents();
        ws.Column(1).Width = Math.Max(ws.Column(1).Width, 12);
        ws.Column(6).Width = Math.Min(ws.Column(6).Width, 50); // Not kolonu taşmasın
    }

    private static void SummaryRow(IXLWorksheet ws, int r, string label, decimal value, string moneyFmt, string colorHex, bool bold)
    {
        ws.Cell(r, 1).Value = label;
        ws.Cell(r, 1).Style.Font.FontColor = XLColor.FromHtml(ColorMuted);
        ws.Cell(r, 1).Style.Font.Bold = true;
        ws.Cell(r, 1).Style.Alignment.Indent = 1;
        ws.Cell(r, 2).Value = value;
        ws.Cell(r, 2).Style.NumberFormat.Format = moneyFmt;
        ws.Cell(r, 2).Style.Font.FontColor = XLColor.FromHtml(colorHex);
        ws.Cell(r, 2).Style.Font.Bold = bold;
        ws.Cell(r, 2).Style.Font.FontSize = bold ? 12 : 11;
    }

    // ── Kategori Özeti sayfası ─────────────────────────────────────────────
    private static void BuildCategorySheet(XLWorkbook wb, IReadOnlyList<TransactionRow> rows)
    {
        var ws = wb.AddWorksheet("Kategori Özeti");
        var moneyFmt = MoneyFormat(rows);

        ws.Range(1, 1, 1, 3).Merge();
        ws.Cell(1, 1).Value = "Kategori Özeti";
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 16;
        ws.Cell(1, 1).Style.Font.FontColor = XLColor.White;
        ws.Cell(1, 1).Style.Fill.BackgroundColor = XLColor.FromHtml(ColorHeader);
        ws.Cell(1, 1).Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        ws.Cell(1, 1).Style.Alignment.Indent = 1;
        ws.Row(1).Height = 28;

        var next = 3;
        next = CategoryBlock(ws, next, "Giderler", rows.Where(r => r.Type == "Gider"), moneyFmt, ColorExpense);
        next += 1;
        CategoryBlock(ws, next, "Gelirler", rows.Where(r => r.Type == "Gelir"), moneyFmt, ColorIncome);

        ws.Column(1).Width = 28;
        ws.Column(2).Width = 18;
        ws.Column(3).Width = 12;
    }

    /// <summary>Bir tür için kategori dağılımı bloğu (başlık + tablo + Tutar kolonunda data-bar). Sonraki boş satırı döndürür.</summary>
    private static int CategoryBlock(IXLWorksheet ws, int startRow, string title, IEnumerable<TransactionRow> source, string moneyFmt, string barColorHex)
    {
        var groups = source
            .GroupBy(r => r.Category)
            .Select(g => (Category: g.Key, Total: g.Sum(x => x.Amount)))
            .Where(g => g.Total > 0)
            .OrderByDescending(g => g.Total)
            .ToList();

        var total = groups.Sum(g => g.Total);

        // Blok başlığı
        ws.Cell(startRow, 1).Value = title;
        ws.Cell(startRow, 1).Style.Font.Bold = true;
        ws.Cell(startRow, 1).Style.Font.FontSize = 12;
        ws.Cell(startRow, 1).Style.Font.FontColor = XLColor.FromHtml(barColorHex);

        var hr = startRow + 1;
        ws.Cell(hr, 1).Value = "Kategori";
        ws.Cell(hr, 2).Value = "Tutar";
        ws.Cell(hr, 3).Value = "Pay";
        var hRange = ws.Range(hr, 1, hr, 3);
        hRange.Style.Font.Bold = true;
        hRange.Style.Font.FontColor = XLColor.White;
        hRange.Style.Fill.BackgroundColor = XLColor.FromHtml(ColorHeader);

        if (groups.Count == 0)
        {
            ws.Cell(hr + 1, 1).Value = "Kayıt yok";
            ws.Cell(hr + 1, 1).Style.Font.FontColor = XLColor.FromHtml(ColorMuted);
            ws.Cell(hr + 1, 1).Style.Font.Italic = true;
            return hr + 2;
        }

        var first = hr + 1;
        for (var i = 0; i < groups.Count; i++)
        {
            var r = first + i;
            ws.Cell(r, 1).Value = groups[i].Category;
            ws.Cell(r, 2).Value = groups[i].Total;
            ws.Cell(r, 2).Style.NumberFormat.Format = moneyFmt;
            ws.Cell(r, 3).Value = total > 0 ? (double)(groups[i].Total / total) : 0;
            ws.Cell(r, 3).Style.NumberFormat.Format = "0.0%";
            if (i % 2 == 1)
                ws.Range(r, 1, r, 3).Style.Fill.BackgroundColor = XLColor.FromHtml(ColorZebra);
        }
        var last = first + groups.Count - 1;

        // Tutar kolonunda data-bar (hücre içi yatay grafik)
        ws.Range(first, 2, last, 2).AddConditionalFormat()
            .DataBar(XLColor.FromHtml(barColorHex))
            .LowestValue()
            .HighestValue();

        // Toplam satırı
        var tr = last + 1;
        ws.Cell(tr, 1).Value = "Toplam";
        ws.Cell(tr, 1).Style.Font.Bold = true;
        ws.Cell(tr, 2).Value = total;
        ws.Cell(tr, 2).Style.NumberFormat.Format = moneyFmt;
        ws.Cell(tr, 2).Style.Font.Bold = true;
        ws.Range(tr, 1, tr, 3).Style.Border.TopBorder = XLBorderStyleValues.Thin;
        ws.Range(tr, 1, tr, 3).Style.Border.TopBorderColor = XLColor.FromHtml(ColorBorder);

        return tr + 1;
    }

    private static string MoneyFormat(IReadOnlyList<TransactionRow> rows)
    {
        var currencies = rows.Select(r => r.Currency).Where(c => !string.IsNullOrWhiteSpace(c)).Distinct().ToList();
        if (currencies.Count != 1) return "#,##0.00";
        return currencies[0] switch
        {
            "TRY" => "#,##0.00 \"₺\"",
            "USD" => "#,##0.00 \"$\"",
            "EUR" => "#,##0.00 \"€\"",
            "GBP" => "#,##0.00 \"£\"",
            var c => "#,##0.00 \"" + c + "\"",
        };
    }
}
