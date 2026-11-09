namespace ParaRota.Infrastructure.Ocr;

public class AzureDocumentIntelligenceSettings
{
    public const string SectionName = "AzureDocumentIntelligence";

    public string Endpoint { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
}
