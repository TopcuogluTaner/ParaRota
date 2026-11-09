using System.Collections.Concurrent;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using ParaRota.Application.DTOs.Ai;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Dtos;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

/// <summary>
/// AI asistanı: (1) serbest metin → işlem önerisi, (2) aylık içgörüler.
/// Halüsinasyon koruması: içgörüde TÜM rakamlar sunucuda hesaplanır, Gemini'ye
/// "gerçekler" olarak verilir ve yalnız bunları yorumlaması istenir.
/// </summary>
public class AiAssistService(AppDbContext context, IGeminiTextClient gemini, ICurrentUserService currentUser) : IAiAssistService
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
    };

    private static readonly string[] TrDays = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

    private static string LanguageName(string? code) => (code ?? "tr").ToLowerInvariant() switch
    {
        "en" => "English",
        "de" => "Deutsch",
        "es" => "Español",
        "ar" => "العربية (Arabic)",
        _ => "Türkçe",
    };

    // ── (1) Doğal dilde işlem kaydı ────────────────────────────────────────

    public async Task<ApiResponse<ParsedTransactionDto>> ParseTransactionAsync(int userId, string text, string? language, CancellationToken cancellationToken = default)
    {
        var (cats, prompt) = await BuildParsePromptAsync(userId,
            $"Metin: \"\"\"{text.Trim()}\"\"\"", cancellationToken);

        var result = await gemini.GenerateJsonAsync(prompt, ParseSchema, cancellationToken);
        return MapParseResult(result, cats);
    }

    public async Task<ApiResponse<ParsedTransactionDto>> ParseTransactionFromAudioAsync(int userId, byte[] audio, string mimeType, string? language, CancellationToken cancellationToken = default)
    {
        var (cats, prompt) = await BuildParsePromptAsync(userId,
            "Girdi ekteki SES KAYDIDIR: önce konuşmayı anla, sonra işleme çevir. Anlaşılmıyorsa veya bir para işlemi değilse amount'u null bırak.",
            cancellationToken);

        var result = await gemini.GenerateJsonFromAudioAsync(prompt, audio, mimeType, ParseSchema, cancellationToken);
        return MapParseResult(result, cats);
    }

    public async Task<ApiResponse<string>> TranscribeAsync(byte[] audio, string mimeType, CancellationToken cancellationToken = default)
    {
        const string prompt =
            "Bu ses kaydındaki konuşmayı AYNEN yazıya dök (hangi dildeyse o dilde). " +
            "YALNIZ söylenen sözleri yaz: zaman damgası (00:01 gibi), süre, konuşmacı etiketi, köşeli parantez notu EKLEME. " +
            "Düzeltme, yorum, noktalama abartısı ekleme; sayıları rakamla yaz (\"dört yüz elli\" → 450). " +
            "Konuşma yoksa text'i boş bırak. Yalnız verilen JSON şemasına uygun yanıt ver.";
        var schema = new
        {
            type = "OBJECT",
            properties = new { text = new { type = "STRING", nullable = true } },
        };

        var result = await gemini.GenerateJsonFromAudioAsync(prompt, audio, mimeType, schema, cancellationToken);
        if (!result.Ok)
            return Fail<string>(result.Status);

        string? text = null;
        try
        {
            using var doc = JsonDocument.Parse(result.Json!);
            if (doc.RootElement.TryGetProperty("text", out var v) && v.ValueKind == JsonValueKind.String)
                text = v.GetString();
        }
        catch { /* parse hatası aşağıda boş-metin yoluna düşer */ }

        return string.IsNullOrWhiteSpace(text)
            ? ApiResponse<string>.Fail("Konuşma anlaşılamadı.", 422, errorCode: ErrorCodes.AiParseFailed)
            : ApiResponse<string>.Success(text.Trim());
    }

    private sealed record CatRow(int Id, string Name, TransactionType Type);

    // Metin/ses ortak prompt: kategoriler kullanıcının görebildiği listeden seçtirilir.
    private async Task<(List<CatRow> Cats, string Prompt)> BuildParsePromptAsync(int userId, string inputSection, CancellationToken ct)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, ct);
        var cats = await (scope.HasValue
                ? context.Categories.AsNoTracking().Where(x => x.HouseholdId == scope.Value || (x.IsSystem && x.UserId == null))
                : context.Categories.AsNoTracking().Where(x => (x.UserId == userId && x.HouseholdId == null) || (x.IsSystem && x.UserId == null)))
            .Select(c => new CatRow(c.Id, c.Name, c.Type))
            .ToListAsync(ct);

        var expenseNames = string.Join(", ", cats.Where(c => c.Type == TransactionType.Expense).Select(c => c.Name));
        var incomeNames = string.Join(", ", cats.Where(c => c.Type == TransactionType.Income).Select(c => c.Name));

        var now = DateTime.Now;
        var prompt =
            "Sen bir kişisel finans asistanısın. Kullanıcının girdisini TEK bir finans işlemine çevir ve yalnız verilen JSON şemasına uygun yanıt ver.\n" +
            $"Bugün: {now:yyyy-MM-dd} ({TrDays[(int)now.DayOfWeek]}). Göreli tarihleri buna göre çöz (\"dün\", \"geçen cuma\", \"sabah\" = bugün). transactionDate ISO 8601 (yyyy-MM-dd); tarih belirtilmemişse bugünü yaz.\n" +
            "amount: ondalık sayı (binlik ayraç yok). Girdide tutar yoksa veya girdi bir para işlemi değilse amount'u null bırak.\n" +
            "currency: ISO 4217 (₺/TL/lira → TRY, $ → USD, € → EUR); belirtilmemişse TRY.\n" +
            "type: \"expense\" (harcama) ya da \"income\" (gelir; maaş/satış/iade gibi).\n" +
            $"categoryName: type=expense ise YALNIZ şu listeden birebir seç: [{expenseNames}]. type=income ise: [{incomeNames}]. Uygun değilse null.\n" +
            "description: kullanıcının dilinde 2-4 kelimelik kısa başlık (ör. \"Akşam yemeği\"). Uydurma yapma.\n" +
            inputSection;

        return (cats, prompt);
    }

    private static readonly object ParseSchema = new
    {
        type = "OBJECT",
        properties = new
        {
            amount = new { type = "NUMBER", nullable = true },
            currency = new { type = "STRING", nullable = true },
            type = new { type = "STRING", nullable = true },
            categoryName = new { type = "STRING", nullable = true },
            transactionDate = new { type = "STRING", nullable = true },
            description = new { type = "STRING", nullable = true },
        },
    };

    private ApiResponse<ParsedTransactionDto> MapParseResult(GeminiTextResult result, List<CatRow> cats)
    {
        if (!result.Ok)
            return Fail<ParsedTransactionDto>(result.Status);

        GeminiParsed? parsed;
        try { parsed = JsonSerializer.Deserialize<GeminiParsed>(result.Json!, JsonOpts); }
        catch { parsed = null; }

        if (parsed?.Amount is not decimal amount || amount <= 0)
            return ApiResponse<ParsedTransactionDto>.Fail("Metinden bir işlem çıkarılamadı.", 422, errorCode: ErrorCodes.AiParseFailed);

        var type = string.Equals(parsed.Type, "income", StringComparison.OrdinalIgnoreCase)
            ? TransactionType.Income
            : TransactionType.Expense;

        var matched = string.IsNullOrWhiteSpace(parsed.CategoryName)
            ? null
            : cats.FirstOrDefault(c => c.Type == type && string.Equals(c.Name, parsed.CategoryName.Trim(), StringComparison.OrdinalIgnoreCase));

        var now = DateTime.Now;
        var date = DateTime.TryParse(parsed.TransactionDate, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d)
            ? d.Date.AddHours(12) // saat dilimi kaymasına karşı öğlen
            : now;
        if (date > now.AddDays(1)) date = now; // geleceğe kayıt önerme

        return ApiResponse<ParsedTransactionDto>.Success(new ParsedTransactionDto
        {
            Amount = Math.Round(amount, 2),
            Currency = NormalizeCurrency(parsed.Currency),
            Type = type,
            CategoryId = matched?.Id,
            CategoryName = matched?.Name,
            TransactionDate = date,
            Description = string.IsNullOrWhiteSpace(parsed.Description) ? null : parsed.Description.Trim(),
        });
    }

    private static string NormalizeCurrency(string? c)
    {
        var v = c?.Trim().ToUpperInvariant();
        return v is { Length: 3 } && v.All(char.IsLetter) ? v : "TRY";
    }

    private sealed class GeminiParsed
    {
        public decimal? Amount { get; set; }
        public string? Currency { get; set; }
        public string? Type { get; set; }
        public string? CategoryName { get; set; }
        public string? TransactionDate { get; set; }
        public string? Description { get; set; }
    }

    // ── (2) Aylık içgörüler ────────────────────────────────────────────────

    // Kota koruması: aynı kullanıcı × scope × ay × dil için 12 saatte bir üretim.
    private static readonly ConcurrentDictionary<string, (DateTime At, MonthlyInsightsDto Dto)> InsightCache = new();
    private static readonly TimeSpan InsightTtl = TimeSpan.FromHours(12);

    public async Task<ApiResponse<MonthlyInsightsDto>> GetMonthlyInsightsAsync(int userId, int month, int year, string? language, CancellationToken cancellationToken = default)
    {
        var scope = await HouseholdScope.ResolveActiveScopeAsync(context, userId, currentUser.ActiveHouseholdId, cancellationToken);
        var lang = (language ?? "tr").ToLowerInvariant();
        var cacheKey = $"{userId}:{scope?.ToString() ?? "p"}:{year:D4}-{month:D2}:{lang}";

        if (InsightCache.TryGetValue(cacheKey, out var hit) && DateTime.Now - hit.At < InsightTtl)
            return ApiResponse<MonthlyInsightsDto>.Success(hit.Dto);

        // ── Gerçekler (tamamı sunucuda) ──
        IQueryable<Domain.Entities.Transaction> txBase = scope.HasValue
            ? context.Transactions.AsNoTracking().Where(x => x.HouseholdId == scope.Value)
            : context.Transactions.AsNoTracking().Where(x => x.HouseholdId == null && x.UserId == userId);
        txBase = txBase.Where(x => x.Status == TransactionStatus.Completed);

        var prev = new DateTime(year, month, 1).AddMonths(-1);

        var cur = await MonthTotalsAsync(txBase, year, month, cancellationToken);
        var before = await MonthTotalsAsync(txBase, prev.Year, prev.Month, cancellationToken);

        if (cur.Income == 0 && cur.Expense == 0)
            return ApiResponse<MonthlyInsightsDto>.Fail("Bu ay için yeterli veri yok.", 422, errorCode: ErrorCodes.AiInsightsNoData);

        var topCats = await txBase
            .Where(x => x.Type == TransactionType.Expense && x.TransactionDate.Year == year && x.TransactionDate.Month == month)
            .GroupBy(x => x.Category.Name)
            .Select(g => new { Name = g.Key, Total = g.Sum(x => x.Amount) })
            .OrderByDescending(g => g.Total)
            .Take(5)
            .ToListAsync(cancellationToken);

        var prevByCat = await txBase
            .Where(x => x.Type == TransactionType.Expense && x.TransactionDate.Year == prev.Year && x.TransactionDate.Month == prev.Month)
            .GroupBy(x => x.Category.Name)
            .Select(g => new { Name = g.Key, Total = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(g => g.Name, g => g.Total, cancellationToken);

        var budgets = await context.Budgets.AsNoTracking()
            .Where(b => b.Month == month && b.Year == year
                     && (scope.HasValue ? b.HouseholdId == scope.Value : b.HouseholdId == null && b.UserId == userId))
            .CountAsync(cancellationToken);

        var facts = new
        {
            month = $"{year:D4}-{month:D2}",
            income = Math.Round(cur.Income),
            expense = Math.Round(cur.Expense),
            net = Math.Round(cur.Income - cur.Expense),
            savingsRatePct = cur.Income > 0 ? Math.Round((cur.Income - cur.Expense) / cur.Income * 100) : 0,
            prevMonthExpense = Math.Round(before.Expense),
            expenseChangePct = before.Expense > 0 ? Math.Round((cur.Expense / before.Expense - 1) * 100) : (decimal?)null,
            topExpenseCategories = topCats.Select(c => new
            {
                name = c.Name,
                total = Math.Round(c.Total),
                prevTotal = prevByCat.TryGetValue(c.Name, out var p) ? Math.Round(p) : 0,
            }),
            budgetCount = budgets,
            currency = "TRY",
        };

        var prompt =
            "Sen sakin, yargılamayan bir kişisel finans koçusun. Aşağıdaki GERÇEKLER kullanıcının bir aylık özetidir.\n" +
            "KURALLAR: YALNIZ verilen sayıları kullan; yeni sayı, oran veya kategori UYDURMA. Sayıları aynen aktar (yuvarlama yapma).\n" +
            $"Çıktı dili: {LanguageName(lang)}. 3-5 kısa içgörü yaz; her biri tek cümle, en fazla ~140 karakter, samimi 'sen' dili.\n" +
            "En dikkat çekici değişimlerle başla; mümkünse bir olumlu gözlemle bitir. tone: positive | warning | neutral.\n" +
            $"GERÇEKLER: {JsonSerializer.Serialize(facts)}";

        var schema = new
        {
            type = "OBJECT",
            properties = new
            {
                insights = new
                {
                    type = "ARRAY",
                    items = new
                    {
                        type = "OBJECT",
                        properties = new
                        {
                            text = new { type = "STRING" },
                            tone = new { type = "STRING" },
                        },
                    },
                },
            },
        };

        var result = await gemini.GenerateJsonAsync(prompt, schema, cancellationToken);
        if (!result.Ok)
            return Fail<MonthlyInsightsDto>(result.Status);

        GeminiInsights? parsed;
        try { parsed = JsonSerializer.Deserialize<GeminiInsights>(result.Json!, JsonOpts); }
        catch { parsed = null; }

        var items = (parsed?.Insights ?? [])
            .Where(i => !string.IsNullOrWhiteSpace(i.Text))
            .Take(5)
            .Select(i => new InsightItemDto
            {
                Text = i.Text!.Trim(),
                Tone = i.Tone?.ToLowerInvariant() is "positive" or "warning" ? i.Tone!.ToLowerInvariant() : "neutral",
            })
            .ToList();

        if (items.Count == 0)
            return ApiResponse<MonthlyInsightsDto>.Fail("İçgörü üretilemedi.", 422, errorCode: ErrorCodes.AiParseFailed);

        var dto = new MonthlyInsightsDto { Month = month, Year = year, Items = items };
        InsightCache[cacheKey] = (DateTime.Now, dto);
        return ApiResponse<MonthlyInsightsDto>.Success(dto);
    }

    private static async Task<(decimal Income, decimal Expense)> MonthTotalsAsync(IQueryable<Domain.Entities.Transaction> txBase, int year, int month, CancellationToken ct)
    {
        var rows = await txBase
            .Where(x => x.TransactionDate.Year == year && x.TransactionDate.Month == month)
            .GroupBy(x => x.Type)
            .Select(g => new { Type = g.Key, Total = g.Sum(x => x.Amount) })
            .ToListAsync(ct);
        return (
            rows.FirstOrDefault(r => r.Type == TransactionType.Income)?.Total ?? 0m,
            rows.FirstOrDefault(r => r.Type == TransactionType.Expense)?.Total ?? 0m);
    }

    private static ApiResponse<T> Fail<T>(int status) => status switch
    {
        503 => ApiResponse<T>.Fail("AI servisi yapılandırılmamış.", 503, errorCode: ErrorCodes.AiNotConfigured),
        429 => ApiResponse<T>.Fail("AI servisi yoğun, biraz sonra tekrar dene.", 429, errorCode: ErrorCodes.AiServiceBusy),
        _ => ApiResponse<T>.Fail("AI servisi hata verdi.", 502, errorCode: ErrorCodes.AiServiceError),
    };

    private sealed class GeminiInsights
    {
        public List<GeminiInsightItem>? Insights { get; set; }
    }

    private sealed class GeminiInsightItem
    {
        public string? Text { get; set; }
        public string? Tone { get; set; }
    }
}
