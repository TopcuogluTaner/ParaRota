namespace ParaRota.Application.DTOs.RecurringRules;

// Maaş otomatiğine zam: yürürlük tarihinden (ay/yıl) itibaren geçerli yeni brüt aylık maaş.
public class PayrollRaiseDto
{
    public decimal Gross { get; set; }
    public DateTime EffectiveDate { get; set; }
}
