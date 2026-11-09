using FluentValidation;

namespace ParaRota.Application.Features.DebtFeatures.Commands.DeleteDebt;

public sealed class DeleteDebtCommandValidator : AbstractValidator<DeleteDebtCommand>
{
    public DeleteDebtCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.DebtId).GreaterThan(0);
    }
}
