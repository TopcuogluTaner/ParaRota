using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ParaRota.Application.Services;
using ParaRota.Infrastructure.Authentication;
using ParaRota.Infrastructure.Mail;
using ParaRota.Infrastructure.MarketData;
using ParaRota.Infrastructure.Notifications;
using ParaRota.Infrastructure.Ocr;
using ParaRota.Infrastructure.Services;

namespace ParaRota.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));
        services.Configure<SmtpSettings>(configuration.GetSection(SmtpSettings.SectionName));
        services.Configure<AzureDocumentIntelligenceSettings>(configuration.GetSection(AzureDocumentIntelligenceSettings.SectionName));
        services.Configure<GeminiSettings>(configuration.GetSection(GeminiSettings.SectionName));
        services.Configure<Ai.AnthropicSettings>(configuration.GetSection(Ai.AnthropicSettings.SectionName));
        services.Configure<EvdsSettings>(configuration.GetSection(EvdsSettings.SectionName));

        services.AddHttpContextAccessor();
        services.AddHttpClient();

        // AI istemcileri (Anthropic/Gemini) factory'den isimli client alır — default
        // 100 sn timeout, sağlayıcı asılınca isteği o kadar işgal etmesin.
        services.AddHttpClient("ai", c => c.Timeout = TimeSpan.FromSeconds(60));

        // Faz 6 — piyasa verisi istemcileri (typed HttpClient). EVDS3 (döviz + aylık altın,
        // header key) + truncgil (günlük gram altın, anahtarsız).
        services.AddHttpClient<IEvdsClient, EvdsClient>((sp, c) =>
        {
            var s = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<EvdsSettings>>().Value;
            c.BaseAddress = new Uri(s.BaseUrl);
            c.Timeout = TimeSpan.FromSeconds(20);
        }).SetHandlerLifetime(TimeSpan.FromMinutes(5))
        .AddStandardResilienceHandler(o =>
        {
            // Tek geçici 429/503, fiyatı 24 saat bayat bırakmasın: 2 retry + devre kesici.
            o.Retry.MaxRetryAttempts = 2;
            o.AttemptTimeout.Timeout = TimeSpan.FromSeconds(15);
            o.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(45);
        });

        services.AddHttpClient<ITruncgilGoldClient, TruncgilGoldClient>(c =>
        {
            c.BaseAddress = new Uri("https://finans.truncgil.com/");
            c.Timeout = TimeSpan.FromSeconds(20);
        }).SetHandlerLifetime(TimeSpan.FromMinutes(5))
        .AddStandardResilienceHandler(o =>
        {
            // Tek geçici 429/503, fiyatı 24 saat bayat bırakmasın: 2 retry + devre kesici.
            o.Retry.MaxRetryAttempts = 2;
            o.AttemptTimeout.Timeout = TimeSpan.FromSeconds(15);
            o.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(45);
        });

        // Faz 7 — kripto (CoinGecko, TL) + hisse (Yahoo Finance BIST .IS, TL).
        services.AddHttpClient<ICoinGeckoClient, CoinGeckoClient>(c =>
        {
            c.BaseAddress = new Uri("https://api.coingecko.com/api/v3/");
            c.Timeout = TimeSpan.FromSeconds(20);
            // CoinGecko User-Agent'sız (datacenter IP'den) isteği 403'ler → UA ŞART.
            c.DefaultRequestHeaders.UserAgent.ParseAdd("ParaRota/1.0 (+https://pararotam.com)");
        }).SetHandlerLifetime(TimeSpan.FromMinutes(5))
        .AddStandardResilienceHandler(o =>
        {
            // Tek geçici 429/503, fiyatı 24 saat bayat bırakmasın: 2 retry + devre kesici.
            o.Retry.MaxRetryAttempts = 2;
            o.AttemptTimeout.Timeout = TimeSpan.FromSeconds(15);
            o.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(45);
        });

        services.AddHttpClient<IYahooStockClient, YahooStockClient>(c =>
        {
            c.BaseAddress = new Uri("https://query1.finance.yahoo.com/");
            c.Timeout = TimeSpan.FromSeconds(20);
            // Yahoo Finance de UA'sız isteği 403'ler (aynı sebep) → UA ŞART.
            c.DefaultRequestHeaders.UserAgent.ParseAdd("ParaRota/1.0 (+https://pararotam.com)");
        }).SetHandlerLifetime(TimeSpan.FromMinutes(5))
        .AddStandardResilienceHandler(o =>
        {
            // Tek geçici 429/503, fiyatı 24 saat bayat bırakmasın: 2 retry + devre kesici.
            o.Retry.MaxRetryAttempts = 2;
            o.AttemptTimeout.Timeout = TimeSpan.FromSeconds(15);
            o.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(45);
        });

        // TEFAS yatırım fonları (public API, anahtarsız, TL). Günde 1 fiyat; agresif throttle
        // → snapshot job çağrıları aralıklı yapar. UA olmadan da çalışıyor ama tutarlılık için ver.
        services.AddHttpClient<ITefasFundClient, TefasFundClient>(c =>
        {
            c.BaseAddress = new Uri("https://www.tefas.gov.tr/api/funds/");
            c.Timeout = TimeSpan.FromSeconds(25);
            c.DefaultRequestHeaders.UserAgent.ParseAdd("ParaRota/1.0 (+https://pararotam.com)");
            c.DefaultRequestHeaders.Referrer = new Uri("https://www.tefas.gov.tr/tr/fon-verileri");
        }).SetHandlerLifetime(TimeSpan.FromMinutes(5))
        .AddStandardResilienceHandler(o =>
        {
            // Tek geçici 429/503, fiyatı 24 saat bayat bırakmasın: 2 retry + devre kesici.
            o.Retry.MaxRetryAttempts = 2;
            o.AttemptTimeout.Timeout = TimeSpan.FromSeconds(15);
            o.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(45);
        });

        // Google web "authorization code" → id_token değişimi (client secret ile).
        services.AddHttpClient<IGoogleAuthClient, GoogleAuthClient>(c =>
        {
            c.Timeout = TimeSpan.FromSeconds(15);
        }).SetHandlerLifetime(TimeSpan.FromMinutes(5));

        // Apple Sign In — identity token doğrulaması (Apple JWKS).
        services.AddHttpClient<IAppleAuthClient, AppleAuthClient>(c =>
        {
            c.Timeout = TimeSpan.FromSeconds(15);
        }).SetHandlerLifetime(TimeSpan.FromMinutes(5));

        services.AddScoped<IJwtProvider, JwtProvider>();
        services.AddScoped<IMailService, SmtpMailService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        // Claude (Anthropic) düşük seviye Messages istemcisi — OCR + metin AI ortak kullanır.
        services.AddSingleton<Ai.AnthropicClient>();

        // OCR: birincil Claude vision; Anthropic anahtarı yoksa veya biçim (HEIC/HEIF)
        // desteklenmiyorsa Gemini'ye düşer (bu yüzden Gemini concrete da kayıtlı).
        // Azure devre dışı (ücret riski yok).
        services.AddSingleton<GeminiReceiptOcrService>();
        services.AddSingleton<IReceiptOcrService, ClaudeReceiptOcrService>();

        // Faz 4 — raporlama generator'ları stateless singleton; Application interface'leri
        // üzerinden çözülür (Persistence katmanı Infrastructure'a doğrudan ref vermez).
        services.AddSingleton<Application.Services.Reporting.IPdfReportGenerator, Reporting.PdfReportGenerator>();
        services.AddSingleton<Application.Services.Reporting.IXlsxReportGenerator, Reporting.XlsxReportGenerator>();

        // Notification altyapısı — Expo Push API (exp.host): mobil istemcinin kaydettiği
        // ExponentPushToken'lara gönderir; FCM/APNS yönlendirmesini Expo yapar.
        services.AddHttpClient<IPushNotifier, ExpoPushNotifier>(c =>
        {
            c.BaseAddress = new Uri("https://exp.host/--/api/v2/");
            c.Timeout = TimeSpan.FromSeconds(15);
        });
        services.AddScoped<INotificationDispatcher, NotificationDispatcher>();

        // Türkiye brüt→net maaş hesabı (stateless).
        services.AddSingleton<Application.Services.IPayrollService, Payroll.TurkishPayrollService>();

        // Kredi gerçek maliyeti (faiz + KKDF + BSMV) — stateless, dış veri yok.
        services.Configure<Loan.LoanSettings>(configuration.GetSection(Loan.LoanSettings.SectionName));
        services.AddSingleton<Application.Services.ILoanCostService, Loan.LoanCostService>();

        // TÜFE aylık endeks tek kaynağı (TP.FG.J0, 2003=100) — seriyi EVDS'ten çekip cache'ler.
        // Kira artışı + enflasyon hesaplayıcı ortak buradan okur. Scoped: IEvdsClient (typed
        // HttpClient) singleton'a yakalanmasın; seri cache zaten static alanlarda süreç-içi kalır.
        services.AddScoped<Application.Services.ICpiIndexService, MarketData.CpiIndexService>();

        // Kira artışı (TÜFE 12 aylık ortalama) — paylaşılan ICpiIndexService'ten beslenir.
        services.AddScoped<Application.Services.IRentIncreaseService, Rent.RentIncreaseService>();

        // Enflasyon "paranın değeri" hesaplayıcı — aynı TÜFE kaynağını kullanır.
        services.AddScoped<Application.Services.IInflationCalculatorService, Inflation.InflationCalculatorService>();

        // AI asistan metin istemcisi: birincil Claude (metin→JSON); SES (bas-konuş) ve
        // Anthropic anahtarı yoksa metin de Gemini'ye delege edilir (concrete kayıt şart).
        services.AddSingleton<Ai.GeminiTextClient>();
        services.AddSingleton<Application.Services.IGeminiTextClient, Ai.AnthropicTextClient>();

        return services;
    }
}
