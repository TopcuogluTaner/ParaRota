using ParaRota.Application.DTOs.Auth;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Services;

public interface IAuthService
{
    Task<ApiResponse<string>> RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> VerifyEmailAsync(VerifyEmailDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> ResendVerificationCodeAsync(ResendVerificationCodeDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginDto dto, string? ipAddress, CancellationToken cancellationToken = default);
    Task<ApiResponse<AuthResponseDto>> RefreshTokenAsync(RefreshTokenDto dto, string? ipAddress, CancellationToken cancellationToken = default);

    // Google ile giriş — ID token doğrula → bul/bağla/oluştur → token üret.
    Task<ApiResponse<AuthResponseDto>> GoogleSignInAsync(GoogleSignInDto dto, string? ipAddress, CancellationToken cancellationToken = default);

    // Apple ile giriş — identity token doğrula → bul/bağla/oluştur → token üret.
    Task<ApiResponse<AuthResponseDto>> AppleSignInAsync(AppleSignInDto dto, string? ipAddress, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> ForgotPasswordAsync(ForgotPasswordDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> ResetPasswordAsync(ResetPasswordDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> ChangePasswordAsync(int userId, ChangePasswordDto dto, CancellationToken cancellationToken = default);
    Task<ApiResponse<UserDto>> GetCurrentUserAsync(int userId, CancellationToken cancellationToken = default);
    Task<ApiResponse<int>> SetOnboardingSeenAsync(int userId, int version, string? platform = null, CancellationToken cancellationToken = default);

    // Profil rozeti ("ikon|#RRGGBB") guncelle; null/bos = kaldir.
    Task<ApiResponse<string?>> SetAvatarAsync(int userId, string? avatar, CancellationToken cancellationToken = default);

    // Aylık özet PDF e-postası tercihini (opt-in) günceller; güncel değeri döner.
    Task<ApiResponse<bool>> SetMonthlyPdfEmailAsync(int userId, bool enabled, CancellationToken cancellationToken = default);

    // Hesabı + tüm kişisel verisini kalıcı sil (KVKK/GDPR + mağaza zorunluluğu).
    Task<ApiResponse<string>> DeleteAccountAsync(int userId, CancellationToken cancellationToken = default);
}
