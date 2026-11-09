namespace ParaRota.Infrastructure.Loan;

// Kredi maliyeti vergi oranları. Yasal sabitler (Cumhurbaşkanı kararı) — nadiren değişir;
// değişirse appsettings/env ile güncellenir, uygulama sürümü gerekmez. Konut istisnası
// (KKDF/BSMV 0) tür bazında serviste uygulanır.
public class LoanSettings
{
    public const string SectionName = "Loan";

    /// <summary>KKDF (Kaynak Kullanımını Destekleme Fonu) — ihtiyaç/taşıt için faizin oranı.</summary>
    public decimal KkdfRate { get; set; } = 0.15m;

    /// <summary>BSMV (Banka ve Sigorta Muameleleri Vergisi) — ihtiyaç/taşıt için faizin oranı.</summary>
    public decimal BsmvRate { get; set; } = 0.15m;
}
