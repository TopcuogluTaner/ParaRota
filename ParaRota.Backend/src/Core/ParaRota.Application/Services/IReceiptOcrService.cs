using ParaRota.Application.DTOs.Receipts;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Services;

public interface IReceiptOcrService
{
    /// <summary>
    /// Verilen fiş görselini Azure Document Intelligence prebuilt-receipt
    /// modeli ile analiz eder ve structured veri döner.
    /// Hiçbir kayıt oluşturmaz; sadece parse eder.
    /// </summary>
    Task<ApiResponse<ScannedReceiptDto>> ScanAsync(Stream imageStream, string contentType, CancellationToken cancellationToken = default);
}
