using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace ParaRota.WebApi.Hubs;

/// <summary>
/// SignalR Clients.User(userId) çağrılarını JWT'deki user id claim'ine bağlar.
/// JwtProvider Sub = user.Id yazıyor; ek olarak NameIdentifier fallback.
/// </summary>
public class JwtUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
    {
        return connection.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? connection.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }
}
