using System.Text.Json;
using Microsoft.Extensions.Options;
using ParaRota.Application.Common.Settings;
using ParaRota.Application.Services;

namespace ParaRota.Infrastructure.Authentication;

// Google token endpoint'inde authorization code → id_token değişimi (web popup akışı).
// redirect_uri=postmessage: GIS oauth2 popup (ux_mode:'popup') sözleşmesi.
public class GoogleAuthClient(HttpClient http, IOptions<GoogleAuthSettings> options) : IGoogleAuthClient
{
    private readonly GoogleAuthSettings _settings = options.Value;

    public async Task<string?> ExchangeCodeForIdTokenAsync(string code, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_settings.WebClientId) || string.IsNullOrWhiteSpace(_settings.ClientSecret))
            return null;

        try
        {
            using var form = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = _settings.WebClientId,
                ["client_secret"] = _settings.ClientSecret,
                ["redirect_uri"] = "postmessage",
                ["grant_type"] = "authorization_code",
            });

            using var resp = await http.PostAsync("https://oauth2.googleapis.com/token", form, ct);
            if (!resp.IsSuccessStatusCode) return null;

            await using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            return doc.RootElement.TryGetProperty("id_token", out var v) ? v.GetString() : null;
        }
        catch
        {
            return null; // ağ/parse hatası → graceful (servis 401 döner)
        }
    }
}
