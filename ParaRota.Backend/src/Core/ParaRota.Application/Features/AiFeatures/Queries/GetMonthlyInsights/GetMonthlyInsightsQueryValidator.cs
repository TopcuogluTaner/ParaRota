using FluentValidation;

namespace ParaRota.Application.Features.AiFeatures.Queries.GetMonthlyInsights;

public sealed class GetMonthlyInsightsQueryValidator : AbstractValidator<GetMonthlyInsightsQuery>
{
    public GetMonthlyInsightsQueryValidator()
    {
        RuleFor(x => x.Month).InclusiveBetween(1, 12);
        RuleFor(x => x.Year).InclusiveBetween(2020, 2100);
    }
}
