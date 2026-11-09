namespace ParaRota.Domain.Enums;

/// <summary>Ortak kasa masrafının bölüşüm tipi. v1: eşit veya kişi başı elle tutar.</summary>
public enum ExpenseSplitType
{
    Equal = 1, // Katılanlara eşit böl
    Exact = 2, // Her katılan için tutar elle girilir
}
