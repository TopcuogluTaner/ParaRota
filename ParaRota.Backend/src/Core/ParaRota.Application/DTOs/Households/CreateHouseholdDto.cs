using ParaRota.Domain.Enums;

namespace ParaRota.Application.DTOs.Households;

public class CreateHouseholdDto
{
    public string Name { get; set; } = string.Empty;
    public string? Currency { get; set; }

    // None: mevcut veriler kişisel kalır (varsayılan) · Move: kişisel kayıtlar aileye taşınır (kişisel boşalır).
    public HouseholdTransferMode TransferMode { get; set; } = HouseholdTransferMode.None;
}
