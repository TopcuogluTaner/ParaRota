using FluentValidation;

namespace ParaRota.Application.Features.DebtFeatures.Queries.GetDebtById;

public sealed class GetDebtByIdQueryValidator : AbstractValidator<GetDebtByIdQuery>
{
    public GetDebtByIdQueryValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.DebtId).GreaterThan(0);
    }
}
