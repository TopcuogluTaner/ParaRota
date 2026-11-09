namespace ParaRota.Infrastructure.MarketData;

// TCMB EVDS3 ayarları. Anahtar repoya YAZILMAZ — user-secrets (dev) / env var (prod).
public class EvdsSettings
{
    public const string SectionName = "Evds";

    // https://evds3.tcmb.gov.tr/igmevdsms-dis/  (sondaki / dahil)
    public string BaseUrl { get; set; } = "https://evds3.tcmb.gov.tr/igmevdsms-dis/";

    // HTTP header "key" olarak gönderilir (05.04.2024 değişikliği).
    public string ApiKey { get; set; } = string.Empty;
}
