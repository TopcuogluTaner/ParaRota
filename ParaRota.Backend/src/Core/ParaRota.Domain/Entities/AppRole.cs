using Microsoft.AspNetCore.Identity;

namespace ParaRota.Domain.Entities;

public class AppRole : IdentityRole<int>
{
    public AppRole() { }
    public AppRole(string roleName) : base(roleName) { }
}
