namespace ParaRota.Application.Common.Settings;

// Apple Sign In — identity token audience (aud) doğrulaması için izinli client ID'ler.
// Native iOS akışında aud = uygulamanın bundle id'si (com.pararotam.mobile).
// (Web/Service ID eklenirse listeye onun da eklenir.) appsettings: "AppleAuth:ClientIds": [ ... ]
public class AppleAuthSettings
{
    public const string SectionName = "AppleAuth";

    public List<string> ClientIds { get; set; } = new();
}
