namespace ParaRota.Application.Services;

public interface ICurrentUserService
{
    int? UserId { get; }
    string? Email { get; }
    string? UserName { get; }
    bool IsAuthenticated { get; }
    IReadOnlyList<string> Roles { get; }
    bool IsInRole(string role);
    string? IpAddress { get; }
    int? ActiveHouseholdId { get; }
}
