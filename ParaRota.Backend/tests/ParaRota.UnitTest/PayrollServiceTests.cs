using FluentAssertions;
using Microsoft.Extensions.Configuration;
using ParaRota.Application.DTOs.Payroll;
using ParaRota.Infrastructure.Payroll;

namespace ParaRota.UnitTest;

public class PayrollServiceTests
{
    private readonly TurkishPayrollService _sut = new(new ConfigurationBuilder().Build());

    [Fact]
    public void ComputeYearVariable_with_constant_gross_matches_ComputeYear()
    {
        const decimal gross = 90000m;
        var constant = _sut.ComputeYear(gross, 2026);
        var variable = _sut.ComputeYearVariable(Enumerable.Repeat(gross, 12).ToList(), 2026);

        variable.Months.Should().HaveCount(12);
        for (int i = 0; i < 12; i++)
            variable.Months[i].Net.Should().Be(constant.Months[i].Net, $"ay {i + 1} sabit ile aynı olmalı");
        variable.AnnualNet.Should().Be(constant.AnnualNet);
    }

    [Fact]
    public void ComputeYearVariable_raise_uses_each_months_own_gross()
    {
        // Oca-Haz 90k, Tem-Ara 120k (Temmuz zammı).
        var schedule = new List<decimal> { 90000, 90000, 90000, 90000, 90000, 90000, 120000, 120000, 120000, 120000, 120000, 120000 };
        var r = _sut.ComputeYearVariable(schedule, 2026);

        r.Months[0].Gross.Should().Be(90000m);
        r.Months[6].Gross.Should().Be(120000m);
        r.AnnualGross.Should().Be(schedule.Sum());

        // Doğruluk özelliği: önceki ayların DÜŞÜK kazancı kümülatif matrahı düşürür, dolayısıyla
        // zam ayının vergisi "tüm yıl yüksek brüt" varsayımındakinden FAZLA olamaz → net az olamaz.
        var allHigh = _sut.ComputeYear(120000m, 2026);
        r.Months[6].IncomeTax.Should().BeLessThanOrEqualTo(allHigh.Months[6].IncomeTax);
        r.Months[6].Net.Should().BeGreaterThanOrEqualTo(allHigh.Months[6].Net);
    }

    [Fact]
    public void ComputeYearVariable_raise_crossing_bracket_yields_strictly_higher_net()
    {
        // Oca-Haz asgari ücret (düşük dilim), Tem-Ara 150k. "Tüm yıl 150k" ile kıyasla Temmuz neti
        // KESİN daha yüksek olmalı: önceki düşük kazanç kümülatif matrahı belirgin düşürür.
        var schedule = Enumerable.Repeat(33030m, 6).Concat(Enumerable.Repeat(150000m, 6)).ToList();
        var r = _sut.ComputeYearVariable(schedule, 2026);
        var allHigh = _sut.ComputeYear(150000m, 2026);

        r.Months[6].Net.Should().BeGreaterThan(allHigh.Months[6].Net);
    }

    [Fact]
    public void ComputeYearVariable_zero_month_is_no_work()
    {
        var schedule = new List<decimal> { 0, 0, 80000, 80000, 80000, 80000, 80000, 80000, 80000, 80000, 80000, 80000 };
        var r = _sut.ComputeYearVariable(schedule, 2026);

        r.Months[0].Net.Should().Be(0m);
        r.Months[1].Net.Should().Be(0m);
        r.Months[2].Net.Should().BeGreaterThan(0m);
    }

    // ── Kıdem & ihbar tazminatı ──────────────────────────────────────────────

    private static readonly DateTime Calc = new(2026, 6, 13);

    [Fact]
    public void Severance_below_one_year_is_not_eligible()
    {
        var r = _sut.ComputeSeverance(new DateTime(2026, 1, 1), 50000m, calculationDate: Calc);
        r.EligibleForSeverance.Should().BeFalse();
        r.SeveranceGross.Should().Be(0m);
        // İhbar uygunluktan bağımsız: <6 ay → 2 hafta.
        r.NoticeWeeks.Should().Be(2);
    }

    [Fact]
    public void Severance_applies_ceiling_when_gross_exceeds_cap()
    {
        // 2026 H1 tavanı 64.948,77 ₺; 100k brüt tavana çekilir.
        var r = _sut.ComputeSeverance(new DateTime(2021, 1, 1), 100000m, calculationDate: Calc);
        r.CeilingApplied.Should().BeTrue();
        r.CappedMonthlyGross.Should().Be(64948.77m);
        // 5 tam yıl + artık günler; tavanlı brüt × yıl alt sınır.
        r.SeveranceGross.Should().BeGreaterThanOrEqualTo(64948.77m * 5);
        // Kıdemden YALNIZ damga kesilir (gelir vergisi yok) → net, brütün hemen altında.
        r.SeveranceNet.Should().BeLessThan(r.SeveranceGross);
        r.SeveranceNet.Should().BeGreaterThan(r.SeveranceGross * 0.99m);
    }

    [Fact]
    public void Severance_no_ceiling_when_gross_below_cap()
    {
        var r = _sut.ComputeSeverance(new DateTime(2024, 6, 13), 30000m, calculationDate: Calc);
        r.CeilingApplied.Should().BeFalse();
        r.CappedMonthlyGross.Should().Be(30000m);
        // Tam 2 yıl → 2 × aylık brüt (artık gün yok).
        r.ServiceYears.Should().Be(2);
        r.SeveranceGross.Should().Be(60000m);
    }

    [Theory]
    [InlineData("2026-01-01", 2)]   // <6 ay
    [InlineData("2025-09-13", 4)]   // ~9 ay (6 ay–1,5 yıl)
    [InlineData("2024-06-13", 6)]   // tam 2 yıl (1,5–3 yıl)
    [InlineData("2023-06-13", 6)]   // TAM 3 yıl → lafız gereği 6 (8 değil)
    [InlineData("2023-06-12", 8)]   // 3 yıl + 1 gün → 8
    public void Severance_notice_weeks_match_law_bands(string hire, int expectedWeeks)
    {
        var r = _sut.ComputeSeverance(DateTime.Parse(hire), 40000m, calculationDate: Calc);
        r.NoticeWeeks.Should().Be(expectedWeeks);
    }

    [Fact]
    public void Severance_uses_db_supplied_ceiling_for_calc_date()
    {
        // Admin panelinden (DB) gelen dönemsel tavan listesi hesaba geçirilince,
        // hesap tarihinde yürürlükteki dönemin tavanı kullanılır (koddaki varsayılan değil).
        var periods = new List<SeveranceCeilingPeriod>
        {
            new(new DateTime(2026, 1, 1), 64948.77m),
            new(new DateTime(2026, 7, 1), 80000.00m), // Temmuz dönemi — admin girdi
        };

        var beforeJuly = _sut.ComputeSeverance(new DateTime(2020, 1, 1), 100000m, calculationDate: new DateTime(2026, 6, 13), ceilings: periods);
        beforeJuly.SeveranceCeiling.Should().Be(64948.77m);

        var afterJuly = _sut.ComputeSeverance(new DateTime(2020, 1, 1), 100000m, calculationDate: new DateTime(2026, 7, 15), ceilings: periods);
        afterJuly.SeveranceCeiling.Should().Be(80000.00m);
    }

    [Fact]
    public void Severance_falls_back_to_builtin_ceiling_when_none_supplied()
    {
        // ceilings verilmezse (DB boş / birim testi) koddaki 2026 H1 varsayılanına düşülür.
        var r = _sut.ComputeSeverance(new DateTime(2020, 1, 1), 100000m, calculationDate: Calc);
        r.SeveranceCeiling.Should().Be(64948.77m);
    }

    [Fact]
    public void Severance_vacation_is_paid_regardless_of_eligibility()
    {
        // 1 yılı doldurmamış: kıdem yok ama izin alacağı ödenir (gün × brüt/30).
        var r = _sut.ComputeSeverance(new DateTime(2026, 3, 1), 30000m, unusedVacationDays: 10, calculationDate: Calc);
        r.EligibleForSeverance.Should().BeFalse();
        r.VacationGross.Should().Be(Math.Round(10 * 30000m / 30m, 2));
    }
}
