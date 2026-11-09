using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Households;

public class HouseholdDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int OwnerUserId { get; set; }
    public string OwnerName { get; set; } = string.Empty;
    public string Currency { get; set; } = "TRY";
    public int MemberCount { get; set; }

    // Çağıran kullanıcının bu household'daki rolü.
    public HouseholdMemberRole? MyRole { get; set; }

    public DateTime CreatedDate { get; set; }
}
