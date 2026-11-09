using FluentValidation;

namespace ParaRota.Application.Features.DebtFeatures.Queries.GetMyDebts;

public sealed class GetMyDebtsQueryValidator : AbstractValidator<GetMyDebtsQuery>
{
    public GetMyDebtsQueryValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.Status).IsInEnum().When(x => x.Status.HasValue);
    }
}
