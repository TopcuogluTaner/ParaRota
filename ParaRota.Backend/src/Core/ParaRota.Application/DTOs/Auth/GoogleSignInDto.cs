namespace ParaRota.Application.DTOs.Auth;

// Google ile giriş. Mobil: doğrudan ID token. Web: authorization code (backend id_token'a çevirir).
public class GoogleSignInDto
{
    public string? IdToken { get; set; }
    public string? Code { get; set; }
}
