using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using ParaRota.Application.Common.Settings;
using ParaRota.Application.Services;

namespace ParaRota.Infrastructure.Authentication;

// Apple Sign In identity token doğrulaması: Apple JWKS (public anahtarlar) ile imza +
// iss (appleid.apple.com) + aud (bundle id) + süre kontrolü. Client secret GEREKMEZ.
public class AppleAuthClient(HttpClient http, IOptions<AppleAuthSettings> options, ILogger<AppleAuthClient> logger) : IAppleAuthClient
{
    private readonly AppleAuthSettings _settings = options.Value;

    // Apple JWKS anahtarları nadiren döner — her girişte canlı çekmek gereksiz gecikme
    // ve Apple'a bağımlılık. 6 saat süreç-içi cache; imza doğrulaması cache'lenmiş
    // anahtarla başarısız olursa bir kez tazeleyip yeniden denenir (key rotation anı).
    private static readonly TimeSpan JwksCacheTtl = TimeSpan.FromHours(6);
    private static JsonWebKeySet? _cachedJwks;
    private static DateTime _cachedAt;
    private static readonly SemaphoreSlim JwksLock = new(1, 1);

    private async Task<JsonWebKeySet> GetJwksAsync(bool forceRefresh, CancellationToken ct)
    {
        if (!forceRefresh && _cachedJwks is not null && DateTime.Now - _cachedAt < JwksCacheTtl)
            return _cachedJwks;

        await JwksLock.WaitAsync(ct);
        try
        {
            if (!forceRefresh && _cachedJwks is not null && DateTime.Now - _cachedAt < JwksCacheTtl)
                return _cachedJwks;
            var jwksJson = await http.GetStringAsync("https://appleid.apple.com/auth/keys", ct);
            _cachedJwks = new JsonWebKeySet(jwksJson);
            _cachedAt = DateTime.Now;
            return _cachedJwks;
        }
        finally
        {
            JwksLock.Release();
        }
    }

    public async Task<ApplePayload?> ValidateAsync(string identityToken, CancellationToken ct = default)
    {
        if (_settings.ClientIds.Count == 0) return null;
        try
        {
            var result = await ValidateWithJwksAsync(identityToken, await GetJwksAsync(forceRefresh: false, ct));
            if (result is null && _cachedJwks is not null)
            {
                // Cache'lenmiş anahtarla doğrulanamadı — Apple anahtar döndürmüş olabilir; bir kez tazele.
                result = await ValidateWithJwksAsync(identityToken, await GetJwksAsync(forceRefresh: true, ct));
            }
            return result;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Apple identity token doğrulaması başarısız.");
            return null; // imza/iss/aud/süre geçersiz veya ağ hatası → geçersiz
        }
    }

    private Task<ApplePayload?> ValidateWithJwksAsync(string identityToken, JsonWebKeySet jwks)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
            var parameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = "https://appleid.apple.com",
                ValidateAudience = true,
                ValidAudiences = _settings.ClientIds,
                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = jwks.GetSigningKeys(),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(2),
            };

            var principal = handler.ValidateToken(identityToken, parameters, out _);
            var sub = principal.FindFirst("sub")?.Value;
            if (string.IsNullOrWhiteSpace(sub)) return Task.FromResult<ApplePayload?>(null);
            var email = principal.FindFirst("email")?.Value;
            return Task.FromResult<ApplePayload?>(new ApplePayload(sub, email));
        }
        catch
        {
            return Task.FromResult<ApplePayload?>(null); // bu anahtar setiyle doğrulanamadı
        }
    }
}
