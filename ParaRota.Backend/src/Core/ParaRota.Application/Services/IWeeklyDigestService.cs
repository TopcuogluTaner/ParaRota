using Hangfire;

namespace ParaRota.Application.Services;

public interface IWeeklyDigestService
{
    /// <summary>
    /// "Haftalık özet": her pazartesi kullanıcıya geçen haftanın (Pzt–Paz) harcama özetini
    /// ve bir önceki haftaya göre değişim yüzdesini bildirim olarak gönderir.
    /// DedupKey ile hafta başına bir kez; geçen hafta hiç hareketi olmayan kullanıcı atlanır.
    /// Gönderilen bildirim sayısını döner.
    /// </summary>
    // Hangfire: aynı job'ın iki instance'ı çakışmasın (restart/uzun koşu senaryosu).
    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    Task<int> SendWeeklyDigestsAsync(CancellationToken cancellationToken = default);
}
