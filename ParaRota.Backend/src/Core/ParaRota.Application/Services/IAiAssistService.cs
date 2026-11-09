using ParaRota.Application.DTOs.Ai;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Services;

public interface IAiAssistService
{
    /// <summary>Serbest metni tek bir işlem önerisine çevirir (kategori eşleştirme + göreli tarih çözümü).</summary>
    Task<ApiResponse<ParsedTransactionDto>> ParseTransactionAsync(int userId, string text, string? language, CancellationToken cancellationToken = default);

    /// <summary>Bas-konuş: ses kaydını Gemini çözümler + işleme çevirir (cihazda STT gerekmez).</summary>
    Task<ApiResponse<ParsedTransactionDto>> ParseTransactionFromAudioAsync(int userId, byte[] audio, string mimeType, string? language, CancellationToken cancellationToken = default);

    /// <summary>Dikte: ses kaydını yalnız YAZIYA döker (kullanıcı düzenleyip kendi gönderir).</summary>
    Task<ApiResponse<string>> TranscribeAsync(byte[] audio, string mimeType, CancellationToken cancellationToken = default);

    /// <summary>Aktif scope için aylık içgörüler — gerçekler sunucuda, yorum Gemini'de; 12 saat önbellekli.</summary>
    Task<ApiResponse<MonthlyInsightsDto>> GetMonthlyInsightsAsync(int userId, int month, int year, string? language, CancellationToken cancellationToken = default);
}
