using FluentValidation;

namespace ParaRota.Application.Features.TransactionFeatures.Commands.DeleteTransaction;

public sealed class DeleteTransactionCommandValidator : AbstractValidator<DeleteTransactionCommand>
{
    public DeleteTransactionCommandValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);
    }
}
