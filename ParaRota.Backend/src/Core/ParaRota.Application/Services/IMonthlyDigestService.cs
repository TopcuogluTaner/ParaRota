using Hangfire;

namespace ParaRota.Application.Services;

public interface IMonthlyDigestService
{
    /// <summary>
    /// "Ay sonu karnesi": her kullanıcıya geçen ayın özetini (gelir/gider/net, bütçe uyumu,
    /// en büyük gider kalemi) bildirim olarak gönderir. DedupKey ile ay başına bir kez;
    /// geçen ayda hiç hareketi olmayan kullanıcı atlanır. Gönderilen bildirim sayısını döner.
    /// </summary>
    // Hangfire: aynı job'ın iki instance'ı çakışmasın (restart/uzun koşu senaryosu).
    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    Task<int> SendMonthlyDigestsAsync(CancellationToken cancellationToken = default);
}
