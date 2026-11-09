using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using ParaRota.Application.Services;

namespace ParaRota.Infrastructure.Services;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    private ClaimsPrincipal? Principal => httpContextAccessor.HttpContext?.User;

    public int? UserId
    {
        get
        {
            var raw = Principal?.FindFirstValue(JwtRegisteredClaimNames.Sub)
                      ?? Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(raw, out var id) ? id : null;
        }
    }

    public string? Email =>
        Principal?.FindFirstValue(JwtRegisteredClaimNames.Email)
        ?? Principal?.FindFirstValue(ClaimTypes.Email);

    public string? UserName =>
        Principal?.FindFirstValue(JwtRegisteredClaimNames.UniqueName)
        ?? Principal?.Identity?.Name;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated == true;

    public IReadOnlyList<string> Roles =>
        Principal?.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList()
        ?? new List<string>();

    public bool IsInRole(string role) => Principal?.IsInRole(role) == true;

    public string? IpAddress => httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();

    public int? ActiveHouseholdId
    {
        get
        {
            var header = httpContextAccessor.HttpContext?.Request.Headers["X-Active-Household-Id"].ToString();
            if (string.IsNullOrWhiteSpace(header)) return null;
            if (!int.TryParse(header, out var id)) return null;
            return id > 0 ? id : null;
        }
    }
}
