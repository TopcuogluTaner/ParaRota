using ParaRota.Application.DTOs.Exports;

namespace ParaRota.Application.Services;

/// <summary>
/// Faz 4 — Raporlama / Export. Aylık PDF özet + işlem listesi Excel.
/// Aile scope = household-native kayıtlar; kişisel scope = sahibinin kişiselleri.
/// </summary>
public interface IExportService
{
    /// <summary>
    /// Aylık özet PDF binary'sini üretir. Aktif scope (CurrentUserService) üzerinden
    /// veri toplar; user'ın görünür olduğu pool'a göre filtrelenir.
    /// </summary>
    Task<byte[]> GenerateMonthlyPdfAsync(int userId, MonthlyPdfRequest req, CancellationToken cancellationToken = default);

    /// <summary>
    /// İşlem listesi Excel binary'sini üretir. Tarih aralığı + opsiyonel kategori
    /// ve tip filtresi. Maksimum row cap servis tarafında (50000).
    /// </summary>
    Task<byte[]> GenerateTransactionsXlsxAsync(int userId, TransactionsXlsxRequest req, CancellationToken cancellationToken = default);
}
