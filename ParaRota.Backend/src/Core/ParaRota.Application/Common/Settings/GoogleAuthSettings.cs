namespace ParaRota.Application.Common.Settings;

// Google Sign-In — ID token audience doğrulaması için izinli client ID'leri.
// (Web + iOS + Android client ID'leri). appsettings: "GoogleAuth:ClientIds": [ ... ]
public class GoogleAuthSettings
{
    public const string SectionName = "GoogleAuth";

    // ID token audience doğrulaması için izinli tüm client ID'ler (web + iOS + android).
    public List<string> ClientIds { get; set; } = new();

    // Web "authorization code" akışı: kod → token değişimi (popup, redirect_uri=postmessage).
    public string WebClientId { get; set; } = string.Empty;   // public — appsettings
    public string ClientSecret { get; set; } = string.Empty;  // GİZLİ — env / user-secrets
}
