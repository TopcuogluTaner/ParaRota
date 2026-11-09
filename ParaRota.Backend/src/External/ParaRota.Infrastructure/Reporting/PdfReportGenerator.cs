using System.Globalization;
using ParaRota.Application.Services.Reporting;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ParaRota.Infrastructure.Reporting;

/// <summary>
/// QuestPDF Fluent template ile aylık özet PDF üretir. Stateless singleton.
/// Plan: <c>docs/plans/reporting-export-faz4.md §3.4</c>.
/// </summary>
public sealed class PdfReportGenerator : IPdfReportGenerator
{
    private static readonly string[] MonthNamesTr =
    [
        "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
    ];

    private const string ColorHeader = "#1E3A5F";
    private const string ColorIncome = "#0F8B6C";
    private const string ColorExpense = "#B0341E";
    private const string ColorMuted = "#7B8794";
    private const string ColorBorder = "#E2E8EE";
    private const string ColorBackground = "#F7F8FA";

    public byte[] RenderMonthlySummary(MonthlyPdfModel model)
    {
        ArgumentNullException.ThrowIfNull(model);

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontFamily("Lato").FontSize(10).FontColor("#1A1F2C"));

                page.Header().Element(c => ComposeHeader(c, model));
                page.Content().Element(c => ComposeContent(c, model));
                page.Footer().AlignCenter().Text(text =>
                {
                    text.DefaultTextStyle(x => x.FontSize(8).FontColor(ColorMuted));
                    text.Span("ParaRotam · ");
                    text.Span(DateTime.Now.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture));
                    text.Span(" · Sayfa ");
                    text.CurrentPageNumber();
                    text.Span(" / ");
                    text.TotalPages();
                });
            });
        }).GeneratePdf();
    }

    /// <summary>Ay numaralarını okunur etikete çevirir: tek ay, bitişik aralık ya da virgüllü liste.</summary>
    private static string FormatPeriod(IReadOnlyList<int> months, int year)
    {
        if (months.Count == 0) return year.ToString(CultureInfo.InvariantCulture);
        var sorted = months.OrderBy(x => x).ToList();
        if (sorted.Count == 1) return $"{MonthNamesTr[sorted[0] - 1]} {year}";

        var contiguous = sorted.Zip(sorted.Skip(1), (a, b) => b - a == 1).All(x => x);
        if (contiguous)
            return $"{MonthNamesTr[sorted[0] - 1]} – {MonthNamesTr[sorted[^1] - 1]} {year}";

        return $"{string.Join(", ", sorted.Select(m => MonthNamesTr[m - 1]))} {year}";
    }

    private static void ComposeHeader(IContainer container, MonthlyPdfModel model)
    {
        var allMonths = model.Sections.SelectMany(s => s.Months).Distinct().OrderBy(x => x).ToList();
        container.Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("PARAROTAM").FontSize(9).LetterSpacing(0.18f).FontColor(ColorMuted).Bold();
                    c.Item().PaddingTop(2).Text("Aylık Rapor").FontSize(20).FontColor(ColorHeader).Bold();
                });
                row.AutoItem().AlignRight().Column(c =>
                {
                    c.Item().Text(FormatPeriod(allMonths, model.Year))
                        .FontSize(13).FontColor(ColorHeader);
                    c.Item().Text(model.OwnerDisplayName).FontSize(9).FontColor(ColorMuted);
                });
            });
            col.Item().PaddingTop(8).LineHorizontal(0.8f).LineColor(ColorBorder);
        });
    }

    private static void ComposeContent(IContainer container, MonthlyPdfModel model)
    {
        var multiSection = model.Sections.Count > 1;
        container.PaddingVertical(16).Column(col =>
        {
            col.Spacing(multiSection ? 26 : 20);
            foreach (var section in model.Sections)
            {
                col.Item().Element(c => ComposeSection(c, model, section, multiSection));
            }
        });
    }

    private static void ComposeSection(IContainer container, MonthlyPdfModel model, MonthlyPdfSection section, bool showHeading)
    {
        container.Column(col =>
        {
            col.Spacing(16);
            if (showHeading)
            {
                col.Item().BorderBottom(0.8f).BorderColor(ColorBorder).PaddingBottom(4)
                    .Text(FormatPeriod(section.Months, model.Year))
                    .FontSize(13).FontColor(ColorHeader).Bold();
            }
            col.Item().Element(c => ComposeSummary(c, model, section));
            col.Item().Element(c => ComposeRatioBar(c, section));
            col.Item().Element(c => ComposeCategoryBreakdown(c, model, section));
            if (model.IncludeTransactions)
                col.Item().Element(c => ComposeTopTransactions(c, model, section));
        });
    }

    private static void ComposeSummary(IContainer container, MonthlyPdfModel model, MonthlyPdfSection section)
    {
        container.Row(row =>
        {
            row.Spacing(10);
            row.RelativeItem().Element(c => SummaryCard(c, "GELİR", section.TotalIncome, model.Currency, ColorIncome));
            row.RelativeItem().Element(c => SummaryCard(c, "GİDER", section.TotalExpense, model.Currency, ColorExpense));
            row.RelativeItem().Element(c => SummaryCard(c, "NET", section.Net, model.Currency, section.Net >= 0 ? ColorIncome : ColorExpense));
        });
    }

    private static void SummaryCard(IContainer container, string label, decimal amount, string currency, string accentColor)
    {
        container.Background(ColorBackground).Padding(14).Column(c =>
        {
            c.Item().Text(label).FontSize(8).LetterSpacing(0.18f).FontColor(ColorMuted).Bold();
            c.Item().PaddingTop(6).Text(FormatMoney(amount, currency))
                .FontSize(16).FontColor(accentColor).Bold();
        });
    }

    /// <summary>Gelir/gider oranını tek bakışta gösteren yatay çubuk (yeşil gelir + kırmızı gider).</summary>
    private static void ComposeRatioBar(IContainer container, MonthlyPdfSection section)
    {
        var total = section.TotalIncome + section.TotalExpense;
        if (total <= 0m) return;

        var incomeW = (float)(section.TotalIncome / total);
        var expenseW = (float)(section.TotalExpense / total);

        container.Column(col =>
        {
            col.Item().Height(10).Row(row =>
            {
                if (incomeW > 0) row.RelativeItem(incomeW).Background(ColorIncome);
                if (expenseW > 0) row.RelativeItem(expenseW).Background(ColorExpense);
            });
            col.Item().PaddingTop(4).Row(row =>
            {
                row.RelativeItem().Text($"Gelir %{incomeW * 100:0}").FontSize(8).FontColor(ColorIncome);
                row.RelativeItem().AlignRight().Text($"Gider %{expenseW * 100:0}").FontSize(8).FontColor(ColorExpense);
            });
        });
    }

    private static void ComposeCategoryBreakdown(IContainer container, MonthlyPdfModel model, MonthlyPdfSection section)
    {
        container.Column(col =>
        {
            col.Item().Text("KATEGORİ DAĞILIMI").FontSize(8).LetterSpacing(0.18f).FontColor(ColorMuted).Bold();
            col.Item().PaddingTop(8);

            if (section.CategoryBreakdowns.Count == 0)
            {
                col.Item().PaddingTop(6).Text("Bu dönemde gider kaydı bulunmuyor.")
                    .FontSize(9).FontColor(ColorMuted).Italic();
                return;
            }

            foreach (var c in section.CategoryBreakdowns)
            {
                col.Item().PaddingVertical(4).Row(row =>
                {
                    row.ConstantItem(140).Column(left =>
                    {
                        left.Item().Text(c.CategoryName).FontSize(10).Bold();
                        left.Item().Text($"%{c.PercentOfExpense * 100:0.#}")
                            .FontSize(8).FontColor(ColorMuted);
                    });
                    row.RelativeItem().AlignMiddle().Column(bar =>
                    {
                        var widthPercent = Math.Max(0.04, Math.Min(1d, c.PercentOfExpense));
                        bar.Item().Height(8).Background(ColorBorder).Row(brow =>
                        {
                            brow.RelativeItem((float)widthPercent).Background(SafeColor(c.Color));
                            brow.RelativeItem((float)(1 - widthPercent));
                        });
                    });
                    row.ConstantItem(100).AlignRight().AlignMiddle()
                        .Text(FormatMoney(c.Total, model.Currency))
                        .FontSize(10).FontColor(ColorExpense);
                });
            }
        });
    }

    private static void ComposeTopTransactions(IContainer container, MonthlyPdfModel model, MonthlyPdfSection section)
    {
        container.Column(col =>
        {
            col.Item().Text("EN BÜYÜK İŞLEMLER").FontSize(8).LetterSpacing(0.18f).FontColor(ColorMuted).Bold();
            col.Item().PaddingTop(8);

            if (section.TopTransactions.Count == 0)
            {
                col.Item().Text("Bu dönemde işlem kaydı yok.").FontSize(9).FontColor(ColorMuted).Italic();
                return;
            }

            col.Item().Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.ConstantColumn(70);
                    c.RelativeColumn();
                    c.ConstantColumn(50);
                    c.ConstantColumn(100);
                });

                table.Header(header =>
                {
                    header.Cell().BorderBottom(0.6f).BorderColor(ColorBorder).PaddingVertical(4)
                        .Text("Tarih").FontSize(8).Bold().FontColor(ColorMuted);
                    header.Cell().BorderBottom(0.6f).BorderColor(ColorBorder).PaddingVertical(4)
                        .Text("Kategori").FontSize(8).Bold().FontColor(ColorMuted);
                    header.Cell().BorderBottom(0.6f).BorderColor(ColorBorder).PaddingVertical(4)
                        .Text("Tip").FontSize(8).Bold().FontColor(ColorMuted);
                    header.Cell().BorderBottom(0.6f).BorderColor(ColorBorder).PaddingVertical(4)
                        .AlignRight().Text("Tutar").FontSize(8).Bold().FontColor(ColorMuted);
                });

                foreach (var t in section.TopTransactions)
                {
                    table.Cell().PaddingVertical(3).Text(t.Date.ToString("dd MMM", new CultureInfo("tr-TR")))
                        .FontSize(9);
                    table.Cell().PaddingVertical(3).Column(c =>
                    {
                        c.Item().Text(t.Category).FontSize(9);
                        if (!string.IsNullOrWhiteSpace(t.Notes))
                            c.Item().Text(t.Notes).FontSize(7).FontColor(ColorMuted);
                    });
                    table.Cell().PaddingVertical(3).Text(t.IsIncome ? "Gelir" : "Gider")
                        .FontSize(8).FontColor(t.IsIncome ? ColorIncome : ColorExpense);
                    table.Cell().PaddingVertical(3).AlignRight()
                        .Text(FormatMoney(t.Amount, model.Currency))
                        .FontSize(9).FontColor(t.IsIncome ? ColorIncome : ColorExpense).Bold();
                }
            });
        });
    }

    private static string FormatMoney(decimal amount, string currency)
    {
        var sign = currency switch
        {
            "TRY" => "₺",
            "USD" => "$",
            "EUR" => "€",
            "GBP" => "£",
            _ => currency + " ",
        };
        var trCulture = new CultureInfo("tr-TR");
        return $"{sign}{amount.ToString("N2", trCulture)}";
    }

    private static string SafeColor(string color)
    {
        if (string.IsNullOrWhiteSpace(color)) return ColorMuted;
        if (color.Length is 4 or 7 && color.StartsWith('#')) return color;
        return ColorMuted;
    }
}
