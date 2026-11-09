using ParaRota.Domain.Entities;

namespace ParaRota.Application.Services;

public interface IJwtProvider
{
    string CreateAccessToken(AppUser user, IList<string> roles);
    string GenerateRefreshToken();
    string ComputeSha256Hash(string value);
    string GenerateNumericCode(int length = 6);
    int GetAccessTokenExpiryMinutes();
    int GetRefreshTokenExpiryDays();
}
