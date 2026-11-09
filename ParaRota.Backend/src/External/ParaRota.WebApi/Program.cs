using Hangfire;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using ParaRota.Application.Services;
using ParaRota.Domain.Constants;
using ParaRota.Domain.Entities;
using ParaRota.Persistence.Context;
using ParaRota.WebApi;
using ParaRota.WebApi.Configuration;
using ParaRota.WebApi.Hubs;
using ParaRota.WebApi.Middleware;

// DateTime.Now (Kind=Local) ile PostgreSQL timestamptz kolonlarına yazabilmek için.
// Project rule: DateTime.Now kullanılır. Npgsql 6+ varsayılanda UTC ister; legacy mode bunu gevşetir.
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
AppContext.SetSwitch("Npgsql.DisableDateTimeInfinityConversions", true);

// Faz 4 — QuestPDF community license (revenue <$1M için free). Production'da
// revenue eşiği aşılırsa Pro license satın alınmalı.
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

builder.Services.InstallServices(builder.Configuration, AssemblyReference.Assembly);

var app = builder.Build();

// Nginx/Cloudflare arkasında TLS terminasyonu yapılıyor; orijinal şema/IP'yi X-Forwarded-*
// başlıklarından oku. Bu olmadan UseHttpsRedirection (production) sonsuz redirect loop'u yaratır.
var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
};
forwardedHeadersOptions.KnownNetworks.Clear();
forwardedHeadersOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedHeadersOptions);

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    var roleManager = scope.ServiceProvider
        .GetRequiredService<Microsoft.AspNetCore.Identity.RoleManager<AppRole>>();
    foreach (var role in AppRoles.All)
    {
        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new AppRole(role));
    }

    // Admin tohumlama: "Admin:SeedEmails" (appsettings/env) listesindeki KAYITLI kullanıcılara
    // Admin rolünü idempotent verir. E-posta henüz kayıtlı değilse atlanır (kullanıcı kaydolup
    // bir sonraki açılışta verilir). Elle DB SQL'ine gerek kalmaz; rol JWT'ye gömülü olduğundan
    // kullanıcının yeniden giriş yapması gerekir.
    var adminEmails = app.Configuration.GetSection("Admin:SeedEmails").Get<string[]>() ?? [];
    if (adminEmails.Length > 0)
    {
        var userManager = scope.ServiceProvider
            .GetRequiredService<Microsoft.AspNetCore.Identity.UserManager<AppUser>>();
        foreach (var email in adminEmails)
        {
            if (string.IsNullOrWhiteSpace(email)) continue;
            var adminUser = await userManager.FindByEmailAsync(email.Trim());
            if (adminUser is null)
            {
                app.Logger.LogWarning("Admin seed: {Email} henüz kayıtlı değil, atlandı.", email);
                continue;
            }
            if (!await userManager.IsInRoleAsync(adminUser, AppRoles.Admin))
            {
                await userManager.AddToRoleAsync(adminUser, AppRoles.Admin);
                app.Logger.LogInformation("Admin seed: {Email} kullanıcısına Admin rolü verildi.", email);
            }
        }
    }

    // Global sistem kategorileri (UserId=NULL). Idempotent — yoksa ekler.
    var categoryService = scope.ServiceProvider.GetRequiredService<ICategoryService>();
    await categoryService.SeedGlobalSystemCategoriesAsync();

    // Popüler abonelik kataloğu varsayılanları. Key bazlı idempotent — admin'in panel düzenlemelerini ezmez.
    var subscriptionCatalogService = scope.ServiceProvider.GetRequiredService<ISubscriptionCatalogService>();
    await subscriptionCatalogService.SeedDefaultsAsync();

    // Kıdem tavanı bilinen dönemleri (2026 H1). EffectiveFrom bazlı idempotent — admin panel düzenlemelerini ezmez.
    var severanceCeilingService = scope.ServiceProvider.GetRequiredService<ISeveranceCeilingService>();
    await severanceCeilingService.SeedDefaultsAsync();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<ExceptionMiddleware>();

// Development'ta CORS preflight'ı HTTPS'e yönlendirip patlatmaması için HTTPS redirect kapalı.
// Production'da reverse proxy / load balancer TLS terminasyonunu yönetir.
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();

    // Güvenlik header'ları — production-only. Dev'de sweetalert/swagger gibi bazı
    // tool'lar inline script kullanabildiği için CSP eklenmedi (ayrı görev).
    app.Use(async (ctx, next) =>
    {
        ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
        ctx.Response.Headers["X-Frame-Options"] = "DENY";
        ctx.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        ctx.Response.Headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()";
        await next();
    });
}

app.UseCors(CorsServiceInstaller.PolicyName);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<NotificationsHub>("/hubs/notifications");

// Hangfire dashboard — sadece auth'lu kullanıcılar erişebilir (HangfireDashboardAuth filter).
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new HangfireDashboardAuth() },
    DashboardTitle = "ParaRota Jobs",
});

// Recurring jobs — uygulama her başladığında idempotent şekilde register edilir.
// Hangfire cron'ları varsayılan UTC yorumlar; aşağıdaki saatlerin tamamı TR saati
// varsayımıyla seçildi → tek noktadan Europe/Istanbul'a sabitlenir.
var trTimeZone = new RecurringJobOptions { TimeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul") };
RecurringJob.AddOrUpdate<IRecurringRuleService>(
    "recurring-rules-daily",
    job => job.RunDueAsync(CancellationToken.None),
    "5 2 * * *", trTimeZone); // Her gün 02:05 (server local)

RecurringJob.AddOrUpdate<IHouseholdService>(
    "household-invites-expire",
    job => job.ExpireOldInvitesAsync(CancellationToken.None),
    "10 2 * * *", trTimeZone); // Her gün 02:10 — pending davetlerden expired'ları işaretler

RecurringJob.AddOrUpdate<IDebtService>(
    "debts-due-reminders",
    job => job.SendDuePaymentRemindersAsync(CancellationToken.None),
    "15 2 * * *", trTimeZone); // Her gün 02:15 — vadesi yaklaşan borç ödemelerini hatırlatır

RecurringJob.AddOrUpdate<IGoldDayService>(
    "goldday-meeting-reminders",
    job => job.SendMeetingRemindersAsync(CancellationToken.None),
    "20 2 * * *", trTimeZone); // Her gün 02:20 — yaklaşan gün toplantılarını hatırlatır

RecurringJob.AddOrUpdate<IPriceAlarmService>(
    "price-alarm-check",
    job => job.CheckAlarmsAsync(CancellationToken.None),
    "0 * * * *", trTimeZone); // Her saat başı — aktif fiyat alarmlarını canlı fiyata göre kontrol eder

RecurringJob.AddOrUpdate<IMarketDataService>(
    "market-data-refresh-daily",
    job => job.RefreshSnapshotsAsync(CancellationToken.None),
    "0 16 * * *", trTimeZone); // Her gün 16:00 — TCMB ~15:30 bülteni sonrası kur/altın snapshot'larını yaz

RecurringJob.AddOrUpdate<ISubscriptionService>(
    "subscriptions-expire-check",
    job => job.ExpireOverdueAsync(CancellationToken.None),
    "20 2 * * *", trTimeZone); // Her gün 02:20 — webhook kaçarsa süresi geçmiş abonelikleri Expired'a düşür

RecurringJob.AddOrUpdate<IMonthlyDigestService>(
    "monthly-digest",
    job => job.SendMonthlyDigestsAsync(CancellationToken.None),
    "0 7 1 * *", trTimeZone); // Her ayın 1'i 07:00 (server local) — "ay sonu karnesi" bildirimi; DedupKey ile idempotent

RecurringJob.AddOrUpdate<IWeeklyDigestService>(
    "weekly-digest",
    job => job.SendWeeklyDigestsAsync(CancellationToken.None),
    "0 7 * * 1", trTimeZone); // Her pazartesi 07:00 (server local) — geçen haftanın harcama özeti; DedupKey ile idempotent

RecurringJob.AddOrUpdate<IMonthlyPdfEmailService>(
    "monthly-pdf-email",
    job => job.SendMonthlyPdfsAsync(CancellationToken.None),
    "15 7 1 * *", trTimeZone); // Her ayın 1'i 07:15 — tercihi açık kullanıcılara geçen ayın özet PDF'i e-postayla

app.Run();
