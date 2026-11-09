namespace ParaRota.Domain.Enums;

/// <summary>
/// Yeni household oluşturulurken kullanıcının mevcut kişisel verileriyle ne yapılacağını belirler.
/// </summary>
public enum HouseholdTransferMode
{
    /// <summary>
    /// Mevcut veriler kişisel kalır (varsayılan). Sadece household oluştuktan sonra eklenen kayıtlar aile scope'unda olur.
    /// </summary>
    None = 0,

    /// <summary>
    /// Mevcut kişisel kayıtların HouseholdId'si yeni household'a TAŞINIR. Kişisel hesap boşalır.
    /// </summary>
    Move = 1,
}
