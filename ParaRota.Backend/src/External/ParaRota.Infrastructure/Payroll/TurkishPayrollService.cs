using Microsoft.Extensions.Configuration;
using ParaRota.Application.DTOs.Payroll;
using ParaRota.Application.Services;

namespace ParaRota.Infrastructure.Payroll;

// Türkiye brüt→net maaş hesabı — resmi yöntem (4a çalışan):
//  - SGK %14 + işsizlik %1 (brüt üzerinden, tavanla sınırlı)
//  - Gelir vergisi: matrah (brüt − SGK − işsizlik) Ocak'tan KÜMÜLATİF biriker, dilimlere göre
//  - Asgari ücret gelir/damga vergisi istisnası (min ücret matrahı aynı kümülatif mantıkla)
//  - Damga vergisi %0,759
// Parametreler yıl bazlı; yeni yıl = tek kayıt eklemek.
public class TurkishPayrollService(IConfiguration configuration) : IPayrollService
{
    private sealed record Bracket(decimal UpTo, decimal Rate);
    private sealed record YearParams(
        decimal MinGross, decimal SgkCeiling, decimal SgkRate, decimal UnempRate, decimal StampRate, Bracket[] Brackets);

    private static readonly IReadOnlyDictionary<int, YearParams> Params = new Dictionary<int, YearParams>
    {
        [2026] = new YearParams(
            MinGross: 33030m,
            SgkCeiling: 297270m,
            SgkRate: 0.14m,
            UnempRate: 0.01m,
            StampRate: 0.00759m,
            Brackets:
            [
                new Bracket(190000m, 0.15m),
                new Bracket(400000m, 0.20m),
                new Bracket(1500000m, 0.27m),
                new Bracket(5300000m, 0.35m),
                new Bracket(decimal.MaxValue, 0.40m),
            ]),
    };

    // ── Kıdem tazminatı tavanı — DÖNEMSEL (memur maaş katsayısıyla 6 ayda bir değişir) ──
    // Resmi makine-okunur kaynak yok (Hazine genelgesi PDF). BİRİNCİL kaynak artık DB:
    // tavan dönemleri admin panelinden (Ayarlar > Admin > Kıdem Tavanı) yönetilir ve
    // ComputeSeverance'a `ceilings` parametresiyle geçirilir — yeni dönem deploy/kod
    // gerektirmez. Aşağıdaki kod listesi yalnızca DB seed'i + `ceilings` verilmediğinde
    // (birim testi / DB boş) emniyet ağıdır. Eski env-override (Payroll__SeveranceCeilings__*)
    // hâlâ bu fallback listesine merge edilir ama normal akışta DB kullanılır.
    private static readonly (DateTime EffectiveFrom, decimal Ceiling)[] DefaultSeveranceCeilings =
    [
        (new DateTime(2026, 1, 1), 64948.77m), // 01.01.2026–30.06.2026 resmi tavan
    ];

    private readonly Lazy<IReadOnlyList<(DateTime EffectiveFrom, decimal Ceiling)>> _severanceCeilings = new(() =>
    {
        var merged = DefaultSeveranceCeilings.ToDictionary(x => x.EffectiveFrom, x => x.Ceiling);
        foreach (var section in configuration.GetSection("Payroll:SeveranceCeilings").GetChildren())
        {
            if (DateTime.TryParse(section["EffectiveFrom"], System.Globalization.CultureInfo.InvariantCulture, out var from)
                && decimal.TryParse(section["Amount"], System.Globalization.CultureInfo.InvariantCulture, out var amount)
                && amount > 0)
                merged[from.Date] = amount;
        }
        return merged.OrderBy(kv => kv.Key).Select(kv => (kv.Key, kv.Value)).ToList();
    });

    // Hesap tarihinde yürürlükteki tavan: EffectiveFrom <= tarih olan en güncel kayıt;
    // tüm kayıtlardan eskiyse ilk kayıt (en iyi bilinen değer).
    // `provided` (DB'den admin paneli tavanları) verilmişse onu kullanır; yoksa koddaki
    // varsayılan + config birleşimine düşer (test / DB boş emniyet ağı).
    private decimal SeveranceCeilingFor(DateTime date, IReadOnlyList<SeveranceCeilingPeriod>? provided)
    {
        var periods = (provided is { Count: > 0 })
            ? provided.OrderBy(p => p.EffectiveFrom).Select(p => (EffectiveFrom: p.EffectiveFrom.Date, Ceiling: p.Amount)).ToList()
            : _severanceCeilings.Value.ToList();
        var current = periods[0].Ceiling;
        foreach (var (from, ceiling) in periods)
        {
            if (from <= date) current = ceiling;
            else break;
        }
        return current;
    }

    public IReadOnlyList<int> SupportedYears => Params.Keys.OrderByDescending(x => x).ToList();

    public PayrollResultDto ComputeYear(decimal grossMonthly, int year, int startMonth = 1)
    {
        // Parametre yoksa en güncel yıla düş.
        var p = Params.TryGetValue(year, out var found) ? found : Params[Params.Keys.Max()];
        if (startMonth is < 1 or > 12) startMonth = 1;
        var gross = Math.Max(0m, grossMonthly);

        var result = new PayrollResultDto { Year = year, GrossMonthly = Round(gross) };

        var sgkBase = Math.Min(gross, p.SgkCeiling);
        var sgk = Round(sgkBase * p.SgkRate);
        var unemployment = Round(sgkBase * p.UnempRate);
        var monthlyBase = gross - sgk - unemployment;           // bu ayın matrahı
        var minBase = p.MinGross - Round(p.MinGross * (p.SgkRate + p.UnempRate)); // min ücret matrahı

        decimal cumBase = 0m, cumMinBase = 0m;
        var stampGross = Round(gross * p.StampRate);
        var stampExemption = Round(p.MinGross * p.StampRate);
        var stampNet = Math.Max(0m, stampGross - stampExemption);

        for (int m = startMonth; m <= 12; m++)
        {
            var prevTax = TaxOf(cumBase, p.Brackets);
            var prevMinTax = TaxOf(cumMinBase, p.Brackets);
            cumBase += monthlyBase;
            cumMinBase += minBase;

            var grossIncomeTax = TaxOf(cumBase, p.Brackets) - prevTax;
            var minWageTax = TaxOf(cumMinBase, p.Brackets) - prevMinTax;
            var exemption = Math.Min(grossIncomeTax, minWageTax);     // istisna kendi vergisini aşamaz
            var incomeTax = Math.Max(0m, grossIncomeTax - exemption);

            var net = gross - sgk - unemployment - incomeTax - stampNet;

            result.Months.Add(new PayrollMonthDto
            {
                Month = m,
                Gross = Round(gross),
                Sgk = sgk,
                Unemployment = unemployment,
                IncomeTax = Round(incomeTax),
                StampTax = Round(stampNet),
                Net = Round(net),
                CumulativeBase = Round(cumBase),
            });
        }

        result.AnnualGross = result.Months.Sum(x => x.Gross);
        result.AnnualNet = result.Months.Sum(x => x.Net);
        result.AnnualSgk = result.Months.Sum(x => x.Sgk);
        result.AnnualUnemployment = result.Months.Sum(x => x.Unemployment);
        result.AnnualIncomeTax = result.Months.Sum(x => x.IncomeTax);
        result.AnnualStamp = result.Months.Sum(x => x.StampTax);
        return result;
    }

    // Ay-bazlı değişken brüt için yılın 12 ayının net kırılımı. Zam senaryosunda her ay
    // o ayın gerçek brütünü kullanır; kümülatif gelir vergisi matrahı bu değişken brütlerden
    // birikir (sabit-brüt ComputeYear'ın genel hali). 0 brütlü ay = o ay çalışılmamış (sıfır kayıt).
    public PayrollResultDto ComputeYearVariable(IReadOnlyList<decimal> monthlyGross, int year)
    {
        var p = Params.TryGetValue(year, out var found) ? found : Params[Params.Keys.Max()];
        var result = new PayrollResultDto { Year = year };

        var minBase = p.MinGross - Round(p.MinGross * (p.SgkRate + p.UnempRate));
        var stampExemption = Round(p.MinGross * p.StampRate);
        decimal cumBase = 0m, cumMinBase = 0m;

        for (int m = 1; m <= 12; m++)
        {
            var gross = m - 1 < monthlyGross.Count ? Math.Max(0m, monthlyGross[m - 1]) : 0m;
            if (gross <= 0m)
            {
                result.Months.Add(new PayrollMonthDto { Month = m });
                continue;
            }

            var sgkBase = Math.Min(gross, p.SgkCeiling);
            var sgk = Round(sgkBase * p.SgkRate);
            var unemployment = Round(sgkBase * p.UnempRate);
            var monthlyBase = gross - sgk - unemployment;

            var stampGross = Round(gross * p.StampRate);
            var stampNet = Math.Max(0m, stampGross - stampExemption);

            var prevTax = TaxOf(cumBase, p.Brackets);
            var prevMinTax = TaxOf(cumMinBase, p.Brackets);
            cumBase += monthlyBase;
            cumMinBase += minBase;

            var grossIncomeTax = TaxOf(cumBase, p.Brackets) - prevTax;
            var minWageTax = TaxOf(cumMinBase, p.Brackets) - prevMinTax;
            var exemption = Math.Min(grossIncomeTax, minWageTax);
            var incomeTax = Math.Max(0m, grossIncomeTax - exemption);

            var net = gross - sgk - unemployment - incomeTax - stampNet;

            result.Months.Add(new PayrollMonthDto
            {
                Month = m,
                Gross = Round(gross),
                Sgk = sgk,
                Unemployment = unemployment,
                IncomeTax = Round(incomeTax),
                StampTax = Round(stampNet),
                Net = Round(net),
                CumulativeBase = Round(cumBase),
            });
        }

        result.GrossMonthly = result.Months.Select(x => x.Gross).DefaultIfEmpty(0m).Max();
        result.AnnualGross = result.Months.Sum(x => x.Gross);
        result.AnnualNet = result.Months.Sum(x => x.Net);
        result.AnnualSgk = result.Months.Sum(x => x.Sgk);
        result.AnnualUnemployment = result.Months.Sum(x => x.Unemployment);
        result.AnnualIncomeTax = result.Months.Sum(x => x.IncomeTax);
        result.AnnualStamp = result.Months.Sum(x => x.StampTax);
        return result;
    }

    /// <summary>
    /// Kıdem & ihbar tazminatı tahmini (1475 m.14 + 4857 m.17).
    /// Kıdem: tavanla sınırlı aylık brüt × tam yıl + artan günler oransal (gün/365);
    /// 1 tam yılı doldurmayana kıdem doğmaz. Kesinti yalnız damga (%0,759, istisnasız).
    /// İhbar: kıdeme göre 2/4/6/8 hafta × günlük brüt — vergiye tabi olduğundan BRÜT döner.
    /// İzin alacağı: gün × (brüt/30) — vergiye tabi, BRÜT döner.
    /// </summary>
    public SeveranceResultDto ComputeSeverance(DateTime hireDate, decimal grossMonthly, int unusedVacationDays = 0, DateTime? calculationDate = null, IReadOnlyList<SeveranceCeilingPeriod>? ceilings = null)
    {
        var calc = (calculationDate ?? DateTime.Now).Date;
        var hire = hireDate.Date;
        if (hire > calc) hire = calc;
        var gross = Math.Max(0m, grossMonthly);
        var vacationDays = Math.Max(0, unusedVacationDays);

        var p = Params.TryGetValue(calc.Year, out var found) ? found : Params[Params.Keys.Max()];
        var ceiling = SeveranceCeilingFor(calc, ceilings);

        // Kıdem süresi kırılımı: tam yıl → tam ay → gün.
        var years = 0;
        while (hire.AddYears(years + 1) <= calc) years++;
        var afterYears = hire.AddYears(years);
        var months = 0;
        while (afterYears.AddMonths(months + 1) <= calc) months++;
        var days = (calc - afterYears.AddMonths(months)).Days;

        var result = new SeveranceResultDto
        {
            Year = calc.Year,
            ServiceYears = years,
            ServiceMonths = months,
            ServiceDays = days,
            TotalServiceDays = (calc - hire).Days,
            EligibleForSeverance = years >= 1,
            SeveranceCeiling = ceiling,
            CeilingApplied = gross > ceiling,
            CappedMonthlyGross = Round(Math.Min(gross, ceiling)),
        };

        if (result.EligibleForSeverance)
        {
            var remainderDays = (calc - hire.AddYears(years)).Days; // tam yıllardan artan süre
            var severanceGross = result.CappedMonthlyGross * years
                               + result.CappedMonthlyGross * remainderDays / 365m;
            result.SeveranceGross = Round(severanceGross);
            result.SeveranceStamp = Round(severanceGross * p.StampRate);
            result.SeveranceNet = Round(severanceGross - result.SeveranceStamp);
        }

        // İhbar süresi (4857 m.17): <6 ay → 2 hafta; 6 ay–1,5 yıl → 4; 1,5–3 yıl → 6;
        // "üç yıldan FAZLA" → 8 (lafız gereği tam 3 yıl 6 haftada kalır, eşitlik 8'e atlamaz).
        result.NoticeWeeks =
            calc < hire.AddMonths(6) ? 2 :
            calc < hire.AddMonths(18) ? 4 :
            calc <= hire.AddYears(3) ? 6 : 8;
        result.NoticeGross = Round(result.NoticeWeeks * 7m * gross / 30m); // ihbar tavana tabi DEĞİL

        result.VacationGross = Round(vacationDays * gross / 30m);
        result.TotalGross = Round(result.SeveranceGross + result.NoticeGross + result.VacationGross);
        result.TotalEstimated = Round(result.SeveranceNet + result.NoticeGross + result.VacationGross);

        return result;
    }

    // Kümülatif matraha kademeli gelir vergisi (dilimler artımlı uygulanır).
    private static decimal TaxOf(decimal baseAmount, Bracket[] brackets)
    {
        if (baseAmount <= 0) return 0m;
        decimal tax = 0m, lower = 0m;
        foreach (var b in brackets)
        {
            if (baseAmount <= b.UpTo)
            {
                tax += (baseAmount - lower) * b.Rate;
                break;
            }
            tax += (b.UpTo - lower) * b.Rate;
            lower = b.UpTo;
        }
        return tax;
    }

    private static decimal Round(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
}
