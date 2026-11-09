namespace ParaRota.Domain.Constants;

public static class AppRoles
{
    public const string Admin = "Admin";
    public const string User = "User";

    public static readonly IReadOnlyList<string> All = new[] { Admin, User };
}
