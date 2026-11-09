namespace ParaRota.Application.Services;

// Apple identity token doğrulama sonucu. Email yalnız ilk girişte / scope verilirse gelir.
public record ApplePayload(string Sub, string? Email);

// Apple Sign In — identity token'ı Apple JWKS ile doğrular (client secret gerekmez).
// Impl: Infrastructure/Authentication/AppleAuthClient.
public interface IAppleAuthClient
{
    Task<ApplePayload?> ValidateAsync(string identityToken, CancellationToken ct = default);
}
