namespace ParaRota.Domain.Enums;

/// <summary>Kredi türü — KKDF/BSMV uygulanışını belirler.</summary>
public enum LoanType
{
    /// <summary>İhtiyaç kredisi — KKDF + BSMV uygulanır.</summary>
    Ihtiyac = 0,

    /// <summary>Konut kredisi — KKDF + BSMV istisna (0).</summary>
    Konut = 1,

    /// <summary>Taşıt kredisi — KKDF + BSMV uygulanır.</summary>
    Tasit = 2,
}
