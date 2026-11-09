using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using ParaRota.Application.Services;

namespace ParaRota.Infrastructure.Notifications;

/// <summary>
/// Expo Push API (exp.host) ile gerçek push gönderimi. Mobil istemci
/// getExpoPushTokenAsync token'ını kaydeder (POST /devices/register);
/// FCM/APNS yönlendirmesini Expo servisi yapar — sunucuda Firebase
/// credential'ı gerekmez. DeviceNotRegistered ticket'ları (uygulama
/// silinmiş cihazlar) token'ı pasife alır ki her push'ta hata üretmesin.
/// </summary>
public class ExpoPushNotifier(
    HttpClient http,
    IDeviceTokenService deviceTokenService,
    ILogger<ExpoPushNotifier> logger) : IPushNotifier
{
    private const int BatchSize = 100; // Expo tek istek limiti

    public async Task PushAsync(
        IReadOnlyList<string> deviceTokens,
        string title,
        string body,
        IDictionary<string, string>? data,
        CancellationToken cancellationToken = default)
    {
        // Yalnız Expo formatlı token'lar — farklı kaynaktan kaydedilmiş bir token
        // tüm batch'i hataya düşürmesin.
        var tokens = deviceTokens
            .Where(t => t.StartsWith("ExponentPushToken", StringComparison.Ordinal))
            .ToList();
        if (tokens.Count == 0) return;

        var deadTokens = new List<string>();
        for (var i = 0; i < tokens.Count; i += BatchSize)
        {
            var batch = tokens.Skip(i).Take(BatchSize).ToList();
            var messages = batch.Select(t => new
            {
                to = t,
                title,
                body,
                data = data ?? new Dictionary<string, string>(),
                sound = "default",
            });

            using var resp = await http.PostAsJsonAsync("push/send", messages, cancellationToken);
            if (!resp.IsSuccessStatusCode)
            {
                logger.LogWarning("Expo push isteği başarısız. Status={Status} Batch={Count}", (int)resp.StatusCode, batch.Count);
                continue;
            }

            // Ticket'lar istek sırasıyla döner: {"data":[{"status":"ok"|"error",...}]}
            await using var stream = await resp.Content.ReadAsStreamAsync(cancellationToken);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            if (!doc.RootElement.TryGetProperty("data", out var tickets) || tickets.ValueKind != JsonValueKind.Array)
                continue;

            var idx = 0;
            foreach (var ticket in tickets.EnumerateArray())
            {
                if (idx >= batch.Count) break;
                var token = batch[idx++];

                var status = ticket.TryGetProperty("status", out var st) ? st.GetString() : null;
                if (status == "ok") continue;

                var error = ticket.TryGetProperty("details", out var det)
                            && det.TryGetProperty("error", out var er)
                    ? er.GetString()
                    : null;
                if (error == "DeviceNotRegistered")
                {
                    deadTokens.Add(token);
                }
                else
                {
                    var message = ticket.TryGetProperty("message", out var msg) ? msg.GetString() : null;
                    logger.LogWarning("Expo push ticket hatası. Error={Error} Message={Message}", error, message);
                }
            }
        }

        if (deadTokens.Count > 0)
        {
            await deviceTokenService.DeactivateTokensAsync(deadTokens, cancellationToken);
            logger.LogInformation("Expo push: {Count} ölü token pasife alındı.", deadTokens.Count);
        }
    }
}
