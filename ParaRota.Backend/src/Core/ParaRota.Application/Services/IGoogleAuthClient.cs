namespace ParaRota.Application.Services;

// Web "authorization code" akışı: Google token endpoint'inde kod → id_token değişimi.
// Impl: Infrastructure/Authentication/GoogleAuthClient (HttpClient + client secret).
public interface IGoogleAuthClient
{
    // Verilen authorization code'u id_token'a çevirir. null = başarısız.
    Task<string?> ExchangeCodeForIdTokenAsync(string code, CancellationToken ct = default);
}
