namespace ParaRota.Application.DTOs.Auth;

// Apple ile giriş — istemciden gelen identity token (JWT). Ad yalnız İLK girişte gelir
// (Apple sonraki girişlerde ad göndermez), istemci iletir.
public class AppleSignInDto
{
    public string IdentityToken { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}
