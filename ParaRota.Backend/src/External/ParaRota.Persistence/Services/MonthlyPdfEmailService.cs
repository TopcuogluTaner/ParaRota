using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ParaRota.Application.DTOs.Exports;
using ParaRota.Application.Services;
using ParaRota.Domain.Enums;
using ParaRota.Persistence.Context;

namespace ParaRota.Persistence.Services;

/// <summary>
/// Scheduled export (Faz 4 V4). Her ayın 1'inde (Hangfire <c>monthly-pdf-email</c>) çalışır;
/// tercihi açık kullanıcılara geçen ayın özet PDF'ini e-posta ekiyle gönderir.
/// Hangfire'da HTTP context olmadığından CurrentUserService.ActiveHouseholdId null döner →
/// ExportService kişisel scope'ta üretir (bilinçli: rapor kullanıcının kendi defteri).
/// </summary>
public class MonthlyPdfEmailService(
    AppDbContext context,
    IExportService exportService,
    IMailService mailService,
    ILogger<MonthlyPdfEmailService> logger) : IMonthlyPdfEmailService
{
    private static readonly CultureInfo Tr = CultureInfo.GetCultureInfo("tr-TR");

    public async Task<int> SendMonthlyPdfsAsync(CancellationToken cancellationToken = default)
    {
        var firstOfThisMonth = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
        var prev = firstOfThisMonth.AddMonths(-1);
        var monthDisplay = prev.ToString("MMMM yyyy", Tr);

        var users = await context.Users
            .AsNoTracking()
            .Where(u => u.SendMonthlyPdfEmail && u.EmailConfirmed && u.Email != null)
            .Select(u => new { u.Id, u.Email, u.FirstName })
            .ToListAsync(cancellationToken);

        var sent = 0;
        var failed = 0;

        foreach (var user in users)
        {
            try
            {
                // Hareketsiz ay → boş PDF gönderme (kişisel scope, tamamlanmış işlemler).
                var hasActivity = await context.Transactions.AsNoTracking()
                    .AnyAsync(x => x.HouseholdId == null
                                && x.UserId == user.Id
                                && x.Status == TransactionStatus.Completed
                                && x.TransactionDate.Year == prev.Year
                                && x.TransactionDate.Month == prev.Month,
                              cancellationToken);
                if (!hasActivity) continue;

                var pdf = await exportService.GenerateMonthlyPdfAsync(user.Id, new MonthlyPdfRequest
                {
                    Year = prev.Year,
                    Months = [prev.Month],
                    IncludeTransactions = true,
                }, cancellationToken);

                await mailService.SendWithAttachmentAsync(
                    to: user.Email!,
                    subject: $"ParaRotam — {monthDisplay} özetin",
                    htmlBody: EmailTemplates.MonthlyPdf(user.FirstName, monthDisplay),
                    attachmentFileName: $"pararotam-ozet-{prev:yyyy-MM}.pdf",
                    attachmentBytes: pdf,
                    cancellationToken);

                sent++;
            }
            catch (Exception ex)
            {
                failed++;
                logger.LogWarning(ex, "Monthly PDF email failed for user {UserId}.", user.Id);
            }
        }

        logger.LogInformation("Monthly PDF emails for {Month:yyyy-MM}: {Sent} sent, {Failed} failed.", prev, sent, failed);
        return sent;
    }
}
