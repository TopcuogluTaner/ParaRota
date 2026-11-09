using FluentValidation;

namespace ParaRota.Application.Features.LoanFeatures.Queries.GetLoanCost;

public sealed class GetLoanCostQueryValidator : AbstractValidator<GetLoanCostQuery>
{
    public GetLoanCostQueryValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0).LessThanOrEqualTo(1_000_000_000).WithMessage("Kredi tutarı 0 ile 1.000.000.000 arasında olmalı.");
        // Aylık faiz makul aralıkta (0 faizsiz kampanyalara izin; üst sınır uç değerleri eler).
        RuleFor(x => x.MonthlyRatePercent).InclusiveBetween(0, 10).WithMessage("Aylık faiz 0–10 arasında olmalı.");
        RuleFor(x => x.TermMonths).InclusiveBetween(1, 360).WithMessage("Vade 1–360 ay arasında olmalı.");
        RuleFor(x => x.DosyaMasrafi).GreaterThanOrEqualTo(0);
        // Kredi türü zorunlu — eksikse sessizce İhtiyaç'a (vergili) düşmesin.
        RuleFor(x => x.LoanType).NotNull().IsInEnum().WithMessage("Geçerli bir kredi türü seçilmeli.");
    }
}
