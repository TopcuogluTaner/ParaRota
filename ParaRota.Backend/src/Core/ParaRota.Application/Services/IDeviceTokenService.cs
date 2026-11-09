using ParaRota.Application.DTOs.DeviceTokens;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Services;

public interface IDeviceTokenService
{
    Task<ApiResponse<string>> RegisterAsync(int userId, RegisterDeviceTokenDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> RevokeAsync(int userId, string token, CancellationToken cancellationToken = default);

    // FCM dispatch için: kullanıcının aktif tüm token'larını döner.
    Task<IReadOnlyList<string>> GetActiveTokensAsync(int userId, CancellationToken cancellationToken = default);

    // Push sağlayıcısının "cihaz artık kayıtlı değil" dediği token'ları pasife alır
    // (uygulama silinmiş cihazlar her push'ta hata üretmesin).
    Task DeactivateTokensAsync(IReadOnlyList<string> tokens, CancellationToken cancellationToken = default);
}
