using ParaRota.Application.DTOs.Payroll;

namespace ParaRota.Application.Services;

// Türkiye brüt→net maaş hesabı (4a çalışan, resmi kümülatif gelir vergisi).
public interface IPayrollService
{
    // Sabit aylık brüt için yılın 12 ayının net kırılımı (kümülatif vergi nedeniyle
    // net yıl içinde değişir). startMonth: işe başlama ayı (1-12).
    PayrollResultDto ComputeYear(decimal grossMonthly, int year, int startMonth = 1);

    // Ay-bazlı değişken brüt (zam senaryosu) için 12 aylık net kırılımı; kümülatif vergi
    // değişken brütlerden birikir. 0 brütlü ay = çalışılmamış.
    PayrollResultDto ComputeYearVariable(IReadOnlyList<decimal> monthlyGross, int year);

    // Hangi yıllar destekleniyor (parametresi tanımlı).
    IReadOnlyList<int> SupportedYears { get; }

    // Kıdem & ihbar tazminatı tahmini: işe giriş tarihi + brüt + kullanılmamış izin günü.
    // calculationDate null ise bugün. `ceilings` admin panelinden (DB) gelen dönemsel tavan
    // listesidir; verilmezse koddaki varsayılan tavana düşülür (test / DB boş emniyet ağı).
    SeveranceResultDto ComputeSeverance(DateTime hireDate, decimal grossMonthly, int unusedVacationDays = 0, DateTime? calculationDate = null, IReadOnlyList<SeveranceCeilingPeriod>? ceilings = null);
}
