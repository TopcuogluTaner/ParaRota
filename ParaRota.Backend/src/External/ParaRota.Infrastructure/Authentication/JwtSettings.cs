namespace ParaRota.Infrastructure.Authentication;

public class JwtSettings
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public string SigningKey { get; set; } = string.Empty;
    public int AccessTokenExpiryMinutes { get; set; } = 480;
    public int RefreshTokenExpiryDays { get; set; } = 30;
}
