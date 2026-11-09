using FluentValidation;

namespace ParaRota.Application.Features.RentFeatures.Queries.GetRentIncrease;

public sealed class GetRentIncreaseQueryValidator : AbstractValidator<GetRentIncreaseQuery>
{
    public GetRentIncreaseQueryValidator()
    {
        RuleFor(x => x.CurrentRent).GreaterThan(0).WithMessage("Kira tutarı sıfırdan büyük olmalı.");
        RuleFor(x => x.RenewalMonth).InclusiveBetween(1, 12);
        // EVDS TÜFE serisi 2003 bazlı; 24 ay geriye veri gerektiği için 2006 alt sınır yeterli.
        RuleFor(x => x.RenewalYear).InclusiveBetween(2006, 2100);
    }
}
