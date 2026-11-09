using Hangfire;

namespace ParaRota.Application.Services;

public interface IMonthlyPdfEmailService
{
    /// <summary>
    /// Tercihi açık (SendMonthlyPdfEmail) + e-postası doğrulanmış kullanıcılara geçen ayın
    /// özet PDF'ini e-posta ekiyle gönderir (kişisel scope). Geçen ay hiç hareketi olmayan
    /// kullanıcı atlanır. Gönderilen e-posta sayısını döner.
    /// </summary>
    // Hangfire: aynı job'ın iki instance'ı çakışmasın (restart/uzun koşu senaryosu).
    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    Task<int> SendMonthlyPdfsAsync(CancellationToken cancellationToken = default);
}
