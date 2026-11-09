namespace ParaRota.Application.DTOs.Payroll;

/// <summary>
/// Kıdem tavanı hesaba geçirilen sade dönem kaydı — <see cref="IPayrollService.ComputeSeverance"/>'a
/// bu liste verilir; servis hesap tarihinde yürürlükteki tavanı buradan seçer.
/// </summary>
public sealed record SeveranceCeilingPeriod(DateTime EffectiveFrom, decimal Amount);

/// <summary>Admin paneli / liste DTO'su.</summary>
public class SeveranceCeilingDto
{
    public int Id { get; set; }
    public DateTime EffectiveFrom { get; set; }
    public decimal Amount { get; set; }
    public string? Note { get; set; }
}

public class CreateSeveranceCeilingDto
{
    public DateTime EffectiveFrom { get; set; }
    public decimal Amount { get; set; }
    public string? Note { get; set; }
}

public class UpdateSeveranceCeilingDto
{
    public DateTime EffectiveFrom { get; set; }
    public decimal Amount { get; set; }
    public string? Note { get; set; }
}
